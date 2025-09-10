// supabase/functions/wa-reminders/index.ts
// Schedules: run every 5 minutes. Sends WA reminders at T-24h and T-2h.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

type Appt = {
  id: string;
  starts_at: string;
  patient_id: string;
  patients: { first_name: string; last_name: string; phone: string | null } | null;
};

type Rem = { appointment_id: string; kind: "24h" | "2h" };

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
// WhatsApp Cloud API
const WA_TOKEN = Deno.env.get("WHATSAPP_TOKEN") || "";
const WA_PHONE_ID = Deno.env.get("WHATSAPP_PHONE_ID") || "";
const COUNTRY_PREFIX = Deno.env.get("COUNTRY_PREFIX") || "52"; // MX by default
const CLINIC_NAME = Deno.env.get("CLINIC_NAME") || "Clínica Odontológica Integral";

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE, {
  auth: { persistSession: false }
});

function e164(mxPhone: string | null): string | null {
  if (!mxPhone) return null;
  const digits = mxPhone.replace(/\D/g, "");
  if (!digits) return null;
  if (digits.startsWith(COUNTRY_PREFIX)) return digits;
  return COUNTRY_PREFIX + digits;
}

function fmtTime(d: Date) {
  return d.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" });
}

async function sendWhatsapp(toE164: string, text: string): Promise<{ ok: boolean; id?: string; error?: string }> {
  if (!WA_TOKEN || !WA_PHONE_ID) {
    return { ok: false, error: "WA env missing" };
  }
  const url = `https://graph.facebook.com/v20.0/${WA_PHONE_ID}/messages`;
  const body = {
    messaging_product: "whatsapp",
    to: toE164,
    type: "text",
    text: { body: text }
  };
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${WA_TOKEN}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });
  const json = await res.json().catch(() => ({}));
  const msgId = json?.messages?.[0]?.id;
  return { ok: res.ok, id: msgId, error: res.ok ? undefined : JSON.stringify(json) };
}

function windowRange(minutesAhead: number, widthMinutes: number) {
  const now = new Date();
  const start = new Date(now.getTime() + minutesAhead * 60000);
  const end = new Date(start.getTime() + widthMinutes * 60000);
  return { start: start.toISOString(), end: end.toISOString() };
}

async function getApptsWindow(minsAhead: number, width: number): Promise<Appt[]> {
  const { start, end } = windowRange(minsAhead, width);
  const { data, error } = await supabase
    .from("appointments")
    .select("id, starts_at, patient_id, patients(first_name,last_name,phone)")
    .neq("status", "cancelled")
    .gte("starts_at", start)
    .lt("starts_at", end);
  if (error) throw error;
  return data as Appt[];
}

async function alreadySent(apptId: string, kind: "24h" | "2h"): Promise<boolean> {
  const { data, error } = await supabase
    .from("reminders")
    .select("id")
    .eq("appointment_id", apptId)
    .eq("kind", kind)
    .limit(1);
  if (error) throw error;
  return (data?.length ?? 0) > 0;
}

async function logReminder(apptId: string, kind: "24h" | "2h", res: { ok: boolean; id?: string; error?: string }) {
  await supabase.from("reminders").insert({
    appointment_id: apptId,
    kind,
    status: res.ok ? "ok" : "error",
    provider_message_id: res.id ?? null,
    error: res.error ?? null
  });
}

Deno.serve(async (req) => {
  try {
    // 24h window (width 5 minutes) & 2h window
    const appts24 = await getApptsWindow(24*60, 5);
    const appts2 = await getApptsWindow(2*60, 5);
    const all = [
      ...appts24.map(a => ({ a, kind: "24h" as const })),
      ...appts2.map(a => ({ a, kind: "2h" as const })),
    ];

    let sent = 0, skipped = 0, failed = 0;
    for (const { a, kind } of all) {
      const phone = e164(a.patients?.phone ?? null);
      if (!phone) { skipped++; continue; }
      if (await alreadySent(a.id, kind)) { skipped++; continue; }

      const d = new Date(a.starts_at);
      const text = kind === "24h"
        ? `Hola, le recordamos su cita en ${CLINIC_NAME} mañana ${d.toLocaleDateString("es-MX")} a las ${fmtTime(d)}. Si necesita reprogramar, responda este mensaje.`
        : `Hola, le recordamos su cita en ${CLINIC_NAME} hoy a las ${fmtTime(d)}. Si necesita reprogramar, responda este mensaje.`;

      const res = await sendWhatsapp(phone, text);
      await logReminder(a.id, kind, res);
      if (res.ok) sent++; else failed++;
    }

    return new Response(JSON.stringify({ ok: true, sent, skipped, failed }), { headers: { "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: String(e?.message || e) }), { status: 500 });
  }
});

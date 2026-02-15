// supabase/functions/wa-reminders/index.ts
// Schedule: cada 5 minutos via Supabase Cron.
// Envía recordatorios WhatsApp a T-24h y T-2h.
// También puede ser llamado con { mode: "confirmacion", appointment_id } para
// enviar confirmación inmediata al crear una cita.

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const SUPABASE_URL   = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE   = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const WA_TOKEN       = Deno.env.get("WHATSAPP_TOKEN") || "";
const WA_PHONE_ID    = Deno.env.get("WHATSAPP_PHONE_ID") || "";
const CC             = Deno.env.get("COUNTRY_PREFIX") || "52";
const CLINIC_NAME    = Deno.env.get("CLINIC_NAME") || "Clínica Odontológica Integral";
const CLINIC_PHONE   = Deno.env.get("CLINIC_PHONE") || "";

const db = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });

/* ── helpers ─────────────────────────────────────────── */
function e164(raw: string | null): string | null {
  if (!raw) return null;
  const d = raw.replace(/\D/g, "");
  if (!d) return null;
  if (d.startsWith(CC)) return d;
  return CC + d;
}

function fmtFecha(d: Date) {
  return d.toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "long" });
}
function fmtHora(d: Date) {
  return d.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" });
}

function buildMsg(kind: "24h" | "2h" | "confirmacion", appt: { starts_at: string; patients: any }) {
  const d    = new Date(appt.starts_at);
  const name = appt.patients
    ? `${appt.patients.first_name} ${appt.patients.last_name}`.trim()
    : "Paciente";
  const contacto = CLINIC_PHONE ? `\nContacto: ${CLINIC_PHONE}` : "";

  switch (kind) {
    case "confirmacion":
      return (
        `✅ *Cita confirmada*\n\n` +
        `Hola ${name}, su cita en *${CLINIC_NAME}* ha sido agendada para:\n\n` +
        `📅 ${fmtFecha(d)}\n` +
        `🕐 ${fmtHora(d)}\n\n` +
        `Si necesita cancelar o reprogramar, por favor avísenos con anticipación.` +
        contacto
      );
    case "24h":
      return (
        `🔔 *Recordatorio de cita – mañana*\n\n` +
        `Hola ${name}, le recordamos su cita en *${CLINIC_NAME}*:\n\n` +
        `📅 ${fmtFecha(d)}\n` +
        `🕐 ${fmtHora(d)}\n\n` +
        `Por favor confirme con un 👍 o responda si necesita reprogramar.` +
        contacto
      );
    case "2h":
      return (
        `⏰ *Su cita es en 2 horas*\n\n` +
        `Hola ${name}, le recordamos que hoy a las *${fmtHora(d)}* tiene cita en *${CLINIC_NAME}*.\n\n` +
        `¡Le esperamos!` +
        contacto
      );
  }
}

async function sendWA(to: string, text: string) {
  if (!WA_TOKEN || !WA_PHONE_ID) return { ok: false, error: "WA no configurado" };
  const res = await fetch(`https://graph.facebook.com/v20.0/${WA_PHONE_ID}/messages`, {
    method: "POST",
    headers: { "Authorization": `Bearer ${WA_TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify({ messaging_product: "whatsapp", to, type: "text", text: { body: text } }),
  });
  const json = await res.json().catch(() => ({}));
  return { ok: res.ok, id: json?.messages?.[0]?.id, error: res.ok ? undefined : JSON.stringify(json) };
}

async function alreadySent(apptId: string, kind: string) {
  const { data } = await db.from("reminders").select("id")
    .eq("appointment_id", apptId).eq("kind", kind).limit(1);
  return (data?.length ?? 0) > 0;
}

async function log(apptId: string, kind: string, res: { ok: boolean; id?: string; error?: string }) {
  await db.from("reminders").insert({
    appointment_id: apptId,
    kind,
    status: res.ok ? "ok" : "error",
    provider_message_id: res.id ?? null,
    error: res.error ?? null,
  });
}

function window(minsAhead: number, widthMins = 5) {
  const now = new Date();
  const s = new Date(now.getTime() + minsAhead * 60000);
  const e = new Date(s.getTime() + widthMins * 60000);
  return { start: s.toISOString(), end: e.toISOString() };
}

async function getAppts(minsAhead: number) {
  const { start, end } = window(minsAhead);
  const { data, error } = await db.from("appointments")
    .select("id, starts_at, patient_id, patients(first_name,last_name,phone)")
    .neq("status", "cancelled").gte("starts_at", start).lt("starts_at", end);
  if (error) throw error;
  return data as any[];
}

async function getApptById(id: string) {
  const { data, error } = await db.from("appointments")
    .select("id, starts_at, patient_id, patients(first_name,last_name,phone)")
    .eq("id", id).single();
  if (error) throw error;
  return data as any;
}

/* ── handler principal ───────────────────────────────── */
Deno.serve(async (req) => {
  try {
    const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};

    // Modo manual: confirmación inmediata para una cita
    if (body.mode === "confirmacion" && body.appointment_id) {
      const appt  = await getApptById(body.appointment_id);
      const phone = e164(appt?.patients?.phone ?? null);
      if (!phone) return new Response(JSON.stringify({ ok: false, error: "sin_telefono" }), { status: 400 });

      // Evitar duplicar confirmación
      if (await alreadySent(appt.id, "confirmacion")) {
        return new Response(JSON.stringify({ ok: true, skipped: true, reason: "ya_enviado" }));
      }

      const text = buildMsg("confirmacion", appt);
      const res  = await sendWA(phone, text);
      await log(appt.id, "confirmacion", res);
      return new Response(JSON.stringify({ ok: res.ok, via: "api", error: res.error }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    // Modo manual: reminder específico para una cita
    if (body.mode === "manual" && body.appointment_id) {
      const appt  = await getApptById(body.appointment_id);
      const phone = e164(appt?.patients?.phone ?? null);
      if (!phone) return new Response(JSON.stringify({ ok: false, error: "sin_telefono" }), { status: 400 });

      const kind  = body.kind ?? "manual";
      // Construir mensaje: usar 24h como plantilla para manual, o texto libre
      const text  = body.text ?? buildMsg("24h", appt);
      const res   = await sendWA(phone, text);
      await log(appt.id, kind, res);
      return new Response(JSON.stringify({ ok: res.ok, via: "api", error: res.error }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    // Modo automático (cron cada 5 min): T-24h y T-2h
    const [appts24, appts2] = await Promise.all([getAppts(24 * 60), getAppts(2 * 60)]);
    const all = [
      ...appts24.map(a => ({ a, kind: "24h" as const })),
      ...appts2.map(a => ({ a, kind: "2h" as const })),
    ];

    let sent = 0, skipped = 0, failed = 0;
    for (const { a, kind } of all) {
      const patients = Array.isArray(a.patients) ? a.patients[0] : a.patients;
      const phone = e164(patients?.phone ?? null);
      if (!phone) { skipped++; continue; }
      if (await alreadySent(a.id, kind)) { skipped++; continue; }
      const text = buildMsg(kind, { ...a, patients });
      const res  = await sendWA(phone, text);
      await log(a.id, kind, res);
      if (res.ok) sent++; else failed++;
    }

    return new Response(JSON.stringify({ ok: true, sent, skipped, failed }), {
      headers: { "Content-Type": "application/json" },
    });

  } catch (e: any) {
    return new Response(JSON.stringify({ ok: false, error: String(e?.message || e) }), { status: 500 });
  }
});

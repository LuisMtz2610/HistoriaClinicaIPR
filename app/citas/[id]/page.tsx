"use client";
import React from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import { statusEs } from "@/app/(clinic)/_lib/i18n";
import AddToCalendarButtonKit from "@/components/kit/AddToCalendarButtonKit";

const pad = (n: number) => String(n).padStart(2, "0");
const fmtLocalDate = (d: Date) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const fmtLocalTime = (d: Date) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;

// Convierte fecha+hora local a ISO con offset local (ej. 2025-09-09T10:00-06:00)
function withLocalOffset(dateStr: string, timeStr: string) {
  const offMin = -new Date().getTimezoneOffset();
  const sign = offMin >= 0 ? "+" : "-";
  const pad2 = (n: number) => String(Math.trunc(Math.abs(n))).padStart(2, "0");
  const hh = pad2(offMin / 60),
    mm = pad2(offMin % 60);
  return `${dateStr}T${timeStr}${sign}${hh}:${mm}`;
}

// ----- WhatsApp helpers -----
function formatE164(rawPhone: string, defaultCc: string) {
  // Limpieza muy básica: conserva dígitos y antepone CC si hace falta
  const digits = (rawPhone || "").replace(/[^\d]/g, "");
  if (!digits) return "";
  if (rawPhone.startsWith("+")) return digits; // ya trae +
  if (digits.startsWith(defaultCc)) return digits;
  return defaultCc + digits;
}

async function sendManualWhatsAppReminder(opts: {
  appointmentId: string;
  patientName: string;
  patientPhone: string;
  startsAt: string; // ISO
  clinicName?: string;
}) {
  const { appointmentId, patientName, patientPhone, startsAt, clinicName } =
    opts;

  const cc =
    process.env.NEXT_PUBLIC_COUNTRY_PREFIX ||
    process.env.COUNTRY_PREFIX ||
    "52";
  const phoneE164 = formatE164(patientPhone, cc);
  if (!phoneE164) throw new Error("Teléfono inválido");

  const when = new Date(startsAt).toLocaleString();
  const msg =
    `Hola ${patientName},\n\n` +
    `Le recordamos su cita el ${when}.\n` +
    `Si necesita reprogramar, por favor avísenos.\n\n` +
    `${clinicName || "Clínica Odontológica Integral"}`;

  // 1) Intenta Cloud API
  try {
    const res = await fetch("/api/whatsapp/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phoneE164, text: msg }),
    });

    if (res.ok) {
      await supabase.from("reminders").insert({
        appointment_id: appointmentId,
        kind: "manual",
        status: "ok",
      });
      return { ok: true, via: "api" as const };
    }
  } catch {
    // ignoramos, haremos fallback
  }

  // 2) Fallback: wa.me con mensaje prellenado
  const encoded = encodeURIComponent(msg);
  const waUrl = `https://wa.me/${phoneE164}?text=${encoded}`;
  window.open(waUrl, "_blank", "noopener,noreferrer");

  await supabase.from("reminders").insert({
    appointment_id: appointmentId,
    kind: "manual",
    status: "ok",
  });

  return { ok: true, via: "wa.me" as const };
}

export default function AppointmentView() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [row, setRow] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("appointments")
        .select("*, patients(first_name,last_name,phone)")
        .eq("id", id)
        .single();
      if (error) {
        alert(error.message);
        return;
      }
      setRow(data);
      setLoading(false);
    })();
  }, [id]);

  async function updateStatus(es: string) {
    const map: any = {
      programada: "scheduled",
      completada: "completed",
      cancelada: "cancelled",
    };
    const status = map[es] ?? "scheduled";
    const { error } = await supabase
      .from("appointments")
      .update({ status })
      .eq("id", id);
    if (error) return alert(error.message);
    setRow((r: any) => ({ ...r, status }));
  }

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    const startsISO = withLocalOffset(
      (e.target as any).date.value,
      (e.target as any).start.value
    );
    const endsISO = withLocalOffset(
      (e.target as any).date.value,
      (e.target as any).end.value
    );
    const reason = (e.target as any).reason.value;
    const notes = (e.target as any).notes.value;

    const { error } = await supabase
      .from("appointments")
      .update({ starts_at: startsISO, ends_at: endsISO, reason, notes })
      .eq("id", id);
    if (error) return alert(error.message);
    alert("Guardado");
    router.refresh();
  }

  if (loading || !row) return <div>Cargando…</div>;

  const dIni = new Date(row.starts_at);
  const dFin = new Date(row.ends_at);
  const dateStr = fmtLocalDate(dIni);
  const start = fmtLocalTime(dIni);
  const end = fmtLocalTime(dFin);
  const statusLabel = (statusEs as any)?.[row.status] ?? row.status;

  const patientName = row?.patients
    ? `${row.patients.first_name} ${row.patients.last_name}`
    : "";
  const patientPhone = row?.patients?.phone || "";

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Cita</h1>
        <div className="flex items-center gap-2 text-sm">
          <AddToCalendarButtonKit appointmentId={id as unknown as string} />
          <Link href={`/citas/${id}/print`} className="hover:underline">
            Imprimir
          </Link>
          <button
            type="button"
            className="px-3 py-2 rounded-xl text-white"
            style={{ backgroundColor: "#14b8a6" }} // turquesa
            onClick={async () => {
              if (!patientPhone) {
                alert("El paciente no tiene teléfono");
                return;
              }
              try {
                const res = await sendManualWhatsAppReminder({
                  appointmentId: id as string,
                  patientName,
                  patientPhone,
                  startsAt: row.starts_at,
                  clinicName: "Clínica Odontológica Integral",
                });
                if (res.ok) alert(`Recordatorio enviado vía ${res.via}`);
              } catch (e: any) {
                console.error(e);
                alert("No se pudo enviar el recordatorio");
              }
            }}
          >
            Enviar recordatorio (WA)
          </button>
        </div>
      </div>

      <div className="text-sm text-neutral-700">
        <div>
          <b>Paciente:</b>{" "}
          {row.patients
            ? `${row.patients.last_name}, ${row.patients.first_name}`
            : "—"}
        </div>
        <div>
          <b>Estatus:</b> {statusLabel}
        </div>
      </div>

      <form className="space-y-3" onSubmit={onSave}>
        <div className="grid md:grid-cols-2 gap-3">
          <div>
            <label className="block text-sm mb-1">Fecha</label>
            <input
              name="date"
              type="date"
              className="border rounded w-full p-2"
              defaultValue={dateStr}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm mb-1">Hora inicio</label>
              <input
                name="start"
                type="time"
                className="border rounded w-full p-2"
                defaultValue={start}
              />
            </div>
            <div>
              <label className="block text-sm mb-1">Hora fin</label>
              <input
                name="end"
                type="time"
                className="border rounded w-full p-2"
                defaultValue={end}
              />
            </div>
          </div>
        </div>
        <input
          name="reason"
          className="border rounded w-full p-2"
          placeholder="Motivo"
          defaultValue={row.reason || ""}
        />
        <textarea
          name="notes"
          className="border rounded w-full p-2 h-24"
          placeholder="Notas"
          defaultValue={row.notes || ""}
        />
        <div className="flex gap-2">
          <button className="px-4 py-2 rounded bg-neutral-900 text-white">
            Guardar
          </button>
          <button
            type="button"
            onClick={() => updateStatus("programada")}
            className="px-3 py-2 rounded bg-sky-700 text-white"
          >
            Programada
          </button>
          <button
            type="button"
            onClick={() => updateStatus("completada")}
            className="px-3 py-2 rounded bg-emerald-700 text-white"
          >
            Completada
          </button>
          <button
            type="button"
            onClick={() => updateStatus("cancelada")}
            className="px-3 py-2 rounded bg-rose-600 text-white"
          >
            Cancelada
          </button>
        </div>
      </form>
    </div>
  );
}

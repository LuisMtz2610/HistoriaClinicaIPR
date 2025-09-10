"use client";
import React from "react";
import useSWR from "swr";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import CalendarMonth from "@/app/(clinic)/_components/CalendarMonth";
import { statusEs } from "@/app/(clinic)/_lib/i18n";

type PatientLite = { first_name: string; last_name: string; phone: string | null } | null;
type Row = {
  id: string;
  starts_at: string; // timestamptz ISO
  ends_at: string;
  status: "scheduled" | "completed" | "cancelled";
  reason: string | null;
  patient_id: string;
  patients: PatientLite; // normalizado a objeto o null
};

const pad = (n: number) => String(n).padStart(2, "0");
const fmtLocalTime = (iso: string) => {
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
};
const fmtLocalDate = (iso: string) => new Date(iso).toLocaleDateString();

// Normaliza `patients`: si viene arreglo, toma el primero; si viene objeto, lo deja tal cual.
function normalizePatients(p: any): PatientLite {
  if (!p) return null;
  if (Array.isArray(p)) return p[0] ?? null;
  return p;
}

// ===== WhatsApp helpers =====
function formatE164(rawPhone: string, defaultCc: string) {
  const digits = (rawPhone || "").replace(/[^\d]/g, "");
  if (!digits) return "";
  if (rawPhone.startsWith("+")) return digits;
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
  const { appointmentId, patientName, patientPhone, startsAt, clinicName } = opts;

  const cc = process.env.NEXT_PUBLIC_COUNTRY_PREFIX || process.env.COUNTRY_PREFIX || "52";
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
      return { ok: true as const, via: "api" as const };
    }
  } catch {
    // seguimos al fallback
  }

  // 2) Fallback: wa.me
  const encoded = encodeURIComponent(msg);
  const waUrl = `https://wa.me/${phoneE164}?text=${encoded}`;
  window.open(waUrl, "_blank", "noopener,noreferrer");

  await supabase.from("reminders").insert({
    appointment_id: appointmentId,
    kind: "manual",
    status: "ok",
  });

  return { ok: true as const, via: "wa.me" as const };
}

const fetchAppointments = async (): Promise<Row[]> => {
  const { data, error } = await supabase
    .from("appointments")
    .select(
      "id, starts_at, ends_at, status, reason, patient_id, patients(first_name,last_name,phone)"
    )
    .gte(
      "starts_at",
      new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1).toISOString()
    )
    .lte(
      "starts_at",
      new Date(new Date().getFullYear(), new Date().getMonth() + 2, 0).toISOString()
    )
    .order("starts_at", { ascending: true });

  if (error) throw error;

  // Normaliza la forma de patients para evitar el error de tipos
  const rows = (data || []).map((a: any) => ({
    id: String(a.id),
    starts_at: String(a.starts_at),
    ends_at: String(a.ends_at),
    status: a.status as Row["status"],
    reason: a.reason ?? null,
    patient_id: String(a.patient_id),
    patients: normalizePatients(a.patients),
  })) as Row[];

  return rows;
};

export default function CitasPage() {
  const q = useSWR("appointments", fetchAppointments);
  const [month, setMonth] = React.useState(new Date());

  if (q.error) return <div>Error: {String((q.error as any).message || q.error)}</div>;
  if (!q.data) return <div>Cargando…</div>;

  const events = q.data.map((a: Row) => a.starts_at);
  const selDay = new Date(month);
  const dayAppts = q.data.filter((a: Row) => {
    const d = new Date(a.starts_at);
    return (
      d.getFullYear() === selDay.getFullYear() &&
      d.getMonth() === selDay.getMonth() &&
      d.getDate() === selDay.getDate()
    );
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Citas</h1>
        <Link href="/citas/new" className="px-3 py-2 rounded bg-emerald-700 text-white">
          Nueva cita
        </Link>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div>
          <div className="flex items-center justify-between mb-2">
            <button
              className="btn-outline"
              onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}
            >
              ←
            </button>
            <div className="font-medium">
              {month.toLocaleString("es-MX", { month: "long", year: "numeric" })}
            </div>
            <button
              className="btn-outline"
              onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}
            >
              →
            </button>
          </div>
          <CalendarMonth value={month} onChange={setMonth} events={events} />
        </div>

        <div>
          <div className="font-medium mb-2">Citas del {selDay.toLocaleDateString()}</div>
          <div className="space-y-2">
            {dayAppts.length ? (
              dayAppts.map((a: Row) => {
                const name = a.patients
                  ? `${a.patients.last_name}, ${a.patients.first_name}`
                  : "—";
                const phone = a.patients?.phone || "";
                return (
                  <div key={a.id} className="border rounded p-2">
                    <div className="text-sm">
                      <b>
                        {fmtLocalTime(a.starts_at)}–{fmtLocalTime(a.ends_at)}
                      </b>{" "}
                      {name}
                    </div>
                    <div className="text-xs text-neutral-600">{a.reason || ""}</div>
                    <div className="text-xs mt-1 flex items-center gap-2">
                      <Link href={`/citas/${a.id}`} className="text-emerald-700 hover:underline">
                        Ver/Editar
                      </Link>
                      ·{" "}
                      <Link href={`/citas/${a.id}/print`} className="hover:underline">
                        Imprimir
                      </Link>
                      <button
                        className="px-2 py-1 rounded-xl text-white"
                        style={{ backgroundColor: "#14b8a6" }}
                        onClick={async () => {
                          if (!phone) {
                            alert("El paciente no tiene teléfono");
                            return;
                          }
                          try {
                            const res = await sendManualWhatsAppReminder({
                              appointmentId: a.id,
                              patientName: name.replace(/^—$/, "Paciente"),
                              patientPhone: phone,
                              startsAt: a.starts_at,
                              clinicName: "Clínica Odontológica Integral",
                            });
                            if (res.ok) alert(`Recordatorio enviado vía ${res.via}`);
                          } catch (e: any) {
                            console.error(e);
                            alert("No se pudo enviar el recordatorio");
                          }
                        }}
                      >
                        Recordatorio (WA)
                      </button>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-sm text-neutral-600">Sin citas en este día.</div>
            )}
          </div>
        </div>
      </div>

      <div className="card p-4">
        <div className="font-semibold mb-2">Próximas citas</div>
        <table className="w-full border text-sm">
          <thead>
            <tr className="bg-neutral-100">
              <th className="border px-2 py-1">Fecha</th>
              <th className="border px-2 py-1">Hora</th>
              <th className="border px-2 py-1 text-left">Paciente</th>
              <th className="border px-2 py-1 text-left">Motivo</th>
              <th className="border px-2 py-1">Estatus</th>
              <th className="border px-2 py-1">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {q.data.map((a: Row) => {
              const name = a.patients
                ? `${a.patients.last_name}, ${a.patients.first_name}`
                : "—";
              const phone = a.patients?.phone || "";
              return (
                <tr key={a.id}>
                  <td className="border px-2 py-1">{fmtLocalDate(a.starts_at)}</td>
                  <td className="border px-2 py-1">{fmtLocalTime(a.starts_at)}</td>
                  <td className="border px-2 py-1">
                    <Link
                      href={`/pacientes/${a.patient_id}`}
                      className="text-blue-600 hover:underline"
                    >
                      {name}
                    </Link>
                  </td>
                  <td className="border px-2 py-1">{a.reason || ""}</td>
                  <td className="border px-2 py-1">{statusEs[a.status] ?? a.status}</td>
                  <td className="border px-2 py-1 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <Link href={`/citas/${a.id}`} className="text-emerald-700 hover:underline">
                        Ver/Editar
                      </Link>
                      ·{" "}
                      <Link href={`/citas/${a.id}/print`} className="hover:underline">
                        Imprimir
                      </Link>
                      <button
                        className="px-2 py-1 rounded-xl text-white"
                        style={{ backgroundColor: "#14b8a6" }}
                        onClick={async () => {
                          if (!phone) {
                            alert("El paciente no tiene teléfono");
                            return;
                          }
                          try {
                            const res = await sendManualWhatsAppReminder({
                              appointmentId: a.id,
                              patientName: name.replace(/^—$/, "Paciente"),
                              patientPhone: phone,
                              startsAt: a.starts_at,
                              clinicName: "Clínica Odontológica Integral",
                            });
                            if (res.ok) alert(`Recordatorio enviado vía ${res.via}`);
                          } catch (e: any) {
                            console.error(e);
                            alert("No se pudo enviar el recordatorio");
                          }
                        }}
                      >
                        Recordatorio (WA)
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

"use client";
import React, { useCallback, useState } from "react";
import useSWR from "swr";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import CalendarMonth from "@/app/(clinic)/_components/CalendarMonth";

/* ── tipos ──────────────────────────────────────────────── */
type Patient = { first_name: string; last_name: string; phone: string | null } | null;
type Reminder = { kind: string; status: string; sent_at: string };
type Row = {
  id: string; starts_at: string; ends_at: string;
  status: "scheduled" | "completed" | "cancelled";
  reason: string | null; patient_id: string;
  patients: Patient;
  reminders?: Reminder[];
};

/* ── helpers ────────────────────────────────────────────── */
const fmtTime = (iso: string) =>
  new Date(iso).toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" });

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString("es-MX", { day: "2-digit", month: "2-digit", year: "numeric" });

function normalizePatient(p: any): Patient {
  if (!p) return null;
  if (Array.isArray(p)) return p[0] ?? null;
  return p;
}

function toE164(raw: string, cc = "52") {
  const d = (raw || "").replace(/\D/g, "");
  if (!d) return "";
  if (d.startsWith(cc)) return d;
  return cc + d;
}

const STATUS_LABEL: Record<string, string> = {
  scheduled: "Programada", completed: "Completada", cancelled: "Cancelada",
};
const STATUS_COLOR: Record<string, string> = {
  scheduled: "bg-sky-100 text-sky-700",
  completed: "bg-emerald-100 text-emerald-700",
  cancelled: "bg-rose-100 text-rose-600 line-through",
};

/* ── fetcher ─────────────────────────────────────────────── */
const fetchAppts = async (): Promise<Row[]> => {
  const now   = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();
  const end   = new Date(now.getFullYear(), now.getMonth() + 2, 0).toISOString();

  const { data, error } = await supabase
    .from("appointments")
    .select("id, starts_at, ends_at, status, reason, patient_id, patients(first_name,last_name,phone), reminders(kind,status,sent_at)")
    .gte("starts_at", start).lte("starts_at", end)
    .order("starts_at", { ascending: true });
  if (error) throw error;

  return (data || []).map((a: any) => ({
    ...a,
    patients: normalizePatient(a.patients),
    reminders: Array.isArray(a.reminders) ? a.reminders : [],
  }));
};

/* ── envío de WhatsApp ───────────────────────────────────── */
type WaStatus = "idle" | "sending" | "ok_api" | "ok_wame" | "error";

async function sendWhatsApp(a: Row, onStatus: (s: WaStatus) => void) {
  const phone = a.patients?.phone;
  const name  = a.patients ? `${a.patients.first_name} ${a.patients.last_name}` : "Paciente";
  const CC    = process.env.NEXT_PUBLIC_COUNTRY_PREFIX || "52";

  if (!phone) { onStatus("error"); alert("Este paciente no tiene teléfono registrado."); return; }

  onStatus("sending");
  const phoneE164 = toE164(phone, CC);

  try {
    const res = await fetch("/api/whatsapp/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phoneE164, text: buildMsg(name, a.starts_at) }),
    });
    const json = await res.json();

    if (json.ok) {
      await supabase.from("reminders").insert({ appointment_id: a.id, kind: "manual", status: "ok" });
      onStatus("ok_api");
      return;
    }

    // Fallback wa.me
    if (json.fallback_url) {
      window.open(json.fallback_url, "_blank", "noopener,noreferrer");
      await supabase.from("reminders").insert({ appointment_id: a.id, kind: "manual", status: "ok" });
      onStatus("ok_wame");
      return;
    }

    onStatus("error");
  } catch {
    // Fallback directo
    const msg = buildMsg(name, a.starts_at);
    const url = `https://wa.me/${phoneE164}?text=${encodeURIComponent(msg)}`;
    window.open(url, "_blank", "noopener,noreferrer");
    await supabase.from("reminders").insert({ appointment_id: a.id, kind: "manual", status: "ok" });
    onStatus("ok_wame");
  }
}

function buildMsg(name: string, iso: string) {
  const d     = new Date(iso);
  const fecha = d.toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "long" });
  const hora  = d.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" });
  return `🔔 Recordatorio de cita\n\nHola ${name}, le recordamos su cita el ${fecha} a las ${hora}.\n\nSi necesita reprogramar, por favor avísenos.`;
}

/* ── badge de estado WA ─────────────────────────────────── */
function WaBadge({ reminders }: { reminders: Reminder[] }) {
  const sent = reminders.filter(r => r.status === "ok");
  const hasConf = sent.some(r => r.kind === "confirmacion");
  const has24h  = sent.some(r => r.kind === "24h");
  const has2h   = sent.some(r => r.kind === "2h");
  const hasMan  = sent.some(r => r.kind === "manual");

  if (sent.length === 0) return (
    <span className="text-xs text-gray-300" title="Sin recordatorios enviados">—</span>
  );

  return (
    <div className="flex items-center gap-1 flex-wrap">
      {hasConf && <span title="Confirmación enviada"  className="text-xs bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full px-1.5 py-0.5">✅ conf</span>}
      {has24h  && <span title="Recordatorio 24h"      className="text-xs bg-sky-50 text-sky-700 border border-sky-200 rounded-full px-1.5 py-0.5">24h</span>}
      {has2h   && <span title="Recordatorio 2h"       className="text-xs bg-violet-50 text-violet-700 border border-violet-200 rounded-full px-1.5 py-0.5">2h</span>}
      {hasMan  && <span title="Recordatorio manual"   className="text-xs bg-amber-50 text-amber-700 border border-amber-200 rounded-full px-1.5 py-0.5">📤</span>}
    </div>
  );
}

/* ── botón WA inline ────────────────────────────────────── */
function WaButton({ appt, onSent }: { appt: Row; onSent: () => void }) {
  const [st, setSt] = useState<WaStatus>("idle");
  const hasPhone    = !!appt.patients?.phone;

  const handle = async () => {
    await sendWhatsApp(appt, setSt);
    if (st !== "error") setTimeout(onSent, 800);
  };

  if (st === "sending") return <span className="text-xs text-gray-400 animate-pulse">Enviando…</span>;
  if (st === "ok_api")  return <span className="text-xs text-emerald-600 font-medium">✅ Enviado</span>;
  if (st === "ok_wame") return <span className="text-xs text-emerald-600 font-medium">✅ Abierto</span>;
  if (st === "error")   return <span className="text-xs text-rose-500">⚠ Error</span>;

  return (
    <button
      onClick={handle}
      disabled={!hasPhone}
      title={hasPhone ? "Enviar recordatorio WhatsApp" : "Sin teléfono"}
      className={[
        "inline-flex items-center gap-1 text-xs rounded-lg px-2 py-1 transition font-medium",
        hasPhone
          ? "bg-green-50 text-green-700 border border-green-200 hover:bg-green-100"
          : "text-gray-300 cursor-not-allowed",
      ].join(" ")}
    >
      <span>💬</span> WA
    </button>
  );
}

/* ── página principal ───────────────────────────────────── */
export default function CitasPage() {
  const { data, error, isLoading, mutate } = useSWR("appointments_v2", fetchAppts, { refreshInterval: 30000 });
  const [selectedDay, setSelectedDay] = useState(new Date());

  const appts = data ?? [];
  const events = appts.map(a => a.starts_at);

  const dayAppts = appts.filter(a => {
    const d = new Date(a.starts_at);
    return d.getFullYear() === selectedDay.getFullYear()
      && d.getMonth()      === selectedDay.getMonth()
      && d.getDate()       === selectedDay.getDate();
  });

  const upcoming = appts.filter(a => {
    const d = new Date(a.starts_at);
    const now = new Date();
    return d >= now && a.status !== "cancelled";
  });

  if (error) return <div className="card p-4 text-red-600">Error: {String(error.message || error)}</div>;

  return (
    <div className="space-y-5">

      {/* Encabezado */}
      <div className="flex items-center gap-3">
        <h1 className="page-title">Agenda</h1>
        <Link href="/citas/new" className="btn ml-auto">+ Nueva cita</Link>
      </div>

      {/* Calendario + citas del día */}
      <div className="grid md:grid-cols-2 gap-5">

        {/* Calendario */}
        <div className="card p-4">
          <CalendarMonth
            value={selectedDay}
            onChange={setSelectedDay}
            events={events}
          />
        </div>

        {/* Citas del día seleccionado */}
        <div className="card p-4">
          <div className="font-semibold text-brand-dark mb-3">
            {selectedDay.toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "long" })}
            <span className="ml-2 text-sm font-normal text-gray-400">
              {dayAppts.length} cita{dayAppts.length !== 1 ? "s" : ""}
            </span>
          </div>

          {isLoading && (
            <div className="space-y-2 animate-pulse">
              {[1,2,3].map(i => <div key={i} className="h-14 rounded-xl bg-gray-100" />)}
            </div>
          )}

          {!isLoading && dayAppts.length === 0 && (
            <div className="text-center py-8 text-gray-400">
              <div className="text-3xl mb-1">📅</div>
              <div className="text-sm">Sin citas este día</div>
            </div>
          )}

          <div className="space-y-2">
            {dayAppts.map(a => {
              const name = a.patients
                ? `${a.patients.last_name}, ${a.patients.first_name}` : "—";
              return (
                <div key={a.id} className="flex items-start gap-2 rounded-xl border p-2.5 hover:border-brand/30 transition group">
                  <div className="text-xs font-bold text-brand-dark w-10 shrink-0 pt-0.5 tabular-nums">
                    {fmtTime(a.starts_at)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-800 truncate">{name}</div>
                    <div className="text-xs text-gray-400 truncate">{a.reason || "—"}</div>
                    <div className="mt-1"><WaBadge reminders={a.reminders ?? []} /></div>
                  </div>
                  <div className="flex flex-col items-end gap-1.5 shrink-0">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLOR[a.status]}`}>
                      {STATUS_LABEL[a.status]}
                    </span>
                    <div className="flex items-center gap-1">
                      <Link href={`/citas/${a.id}`} className="text-xs text-brand hover:underline">Ver</Link>
                      <WaButton appt={a} onSent={mutate} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Tabla de próximas citas */}
      <div className="card p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="font-semibold text-brand-dark">Próximas citas</div>
          <div className="text-xs text-gray-400 flex items-center gap-3">
            <span>💬 WA = envío manual</span>
            <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full px-2 py-0.5">✅ conf</span>
            <span className="bg-sky-50 text-sky-700 border border-sky-200 rounded-full px-2 py-0.5">24h</span>
            <span className="bg-violet-50 text-violet-700 border border-violet-200 rounded-full px-2 py-0.5">2h</span>
          </div>
        </div>

        {isLoading && <div className="animate-pulse h-32 rounded-xl bg-gray-100" />}

        {!isLoading && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-gray-400 border-b">
                  <th className="text-left pb-2 pr-4 font-medium">Fecha</th>
                  <th className="text-left pb-2 pr-4 font-medium">Hora</th>
                  <th className="text-left pb-2 pr-4 font-medium">Paciente</th>
                  <th className="text-left pb-2 pr-4 font-medium hidden md:table-cell">Motivo</th>
                  <th className="text-left pb-2 pr-4 font-medium">Estatus</th>
                  <th className="text-left pb-2 pr-4 font-medium">WhatsApp</th>
                  <th className="pb-2 font-medium"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {upcoming.map(a => {
                  const name = a.patients
                    ? `${a.patients.last_name}, ${a.patients.first_name}` : "—";
                  return (
                    <tr key={a.id} className="hover:bg-gray-50 transition">
                      <td className="py-2 pr-4 text-gray-600 whitespace-nowrap">{fmtDate(a.starts_at)}</td>
                      <td className="py-2 pr-4 font-medium text-brand-dark tabular-nums whitespace-nowrap">{fmtTime(a.starts_at)}</td>
                      <td className="py-2 pr-4">
                        <Link href={`/pacientes/${a.patient_id}`} className="hover:text-brand hover:underline font-medium">
                          {name}
                        </Link>
                      </td>
                      <td className="py-2 pr-4 text-gray-500 hidden md:table-cell max-w-[160px] truncate">{a.reason || "—"}</td>
                      <td className="py-2 pr-4">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLOR[a.status]}`}>
                          {STATUS_LABEL[a.status]}
                        </span>
                      </td>
                      <td className="py-2 pr-4">
                        <WaBadge reminders={a.reminders ?? []} />
                      </td>
                      <td className="py-2">
                        <div className="flex items-center gap-2">
                          <Link href={`/citas/${a.id}`} className="text-xs text-brand hover:underline">Editar</Link>
                          <WaButton appt={a} onSent={mutate} />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {upcoming.length === 0 && (
              <div className="text-center py-8 text-gray-400 text-sm">Sin citas próximas</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

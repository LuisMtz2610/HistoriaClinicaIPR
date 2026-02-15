"use client";
import React, { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import AddToCalendarButtonKit from "@/components/kit/AddToCalendarButtonKit";

/* ── helpers ─────────────────────────────────────────────── */
const pad = (n: number) => String(n).padStart(2, "0");
const fmtLocalDate = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
const fmtLocalTime = (d: Date) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;

function withLocalOffset(dateStr: string, timeStr: string) {
  const off  = -new Date().getTimezoneOffset();
  const sign = off >= 0 ? "+" : "-";
  const hh   = pad(Math.trunc(Math.abs(off) / 60));
  const mm   = pad(Math.abs(off) % 60);
  return `${dateStr}T${timeStr}${sign}${hh}:${mm}`;
}

function toE164(raw: string, cc = "52") {
  const d = (raw || "").replace(/\D/g, "");
  if (!d) return "";
  if (d.startsWith(cc)) return d;
  return cc + d;
}

function buildMsg(name: string, iso: string, clinic = "Clínica Odontológica Integral") {
  const d     = new Date(iso);
  const fecha = d.toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "long" });
  const hora  = d.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" });
  return `🔔 Recordatorio de cita\n\nHola ${name}, le recordamos su cita en *${clinic}*:\n\n📅 ${fecha}\n🕐 ${hora}\n\nSi necesita reprogramar, por favor avísenos.`;
}

const STATUS = ["scheduled", "completed", "cancelled"] as const;
const STATUS_LABEL: Record<string, string>  = { scheduled: "Programada", completed: "Completada", cancelled: "Cancelada" };
const STATUS_COLOR: Record<string, string>  = {
  scheduled: "bg-sky-100 text-sky-700",
  completed: "bg-emerald-100 text-emerald-700",
  cancelled: "bg-rose-100 text-rose-600",
};

type WaState = "idle" | "sending" | "ok" | "wame" | "error";

/* ── componente ──────────────────────────────────────────── */
export default function AppointmentView() {
  const { id }  = useParams<{ id: string }>();
  const router  = useRouter();
  const [row, setRow]     = React.useState<any>(null);
  const [loading, setLoading]  = React.useState(true);
  const [saving, setSaving]    = React.useState(false);
  const [saved,  setSaved]     = React.useState(false);
  const [errMsg, setErrMsg]    = React.useState<string | null>(null);
  const [waState, setWaState]  = useState<WaState>("idle");
  const [reminders, setReminders] = React.useState<any[]>([]);

  // Cargar cita + historial de recordatorios
  React.useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("appointments")
        .select("*, patients(first_name,last_name,phone), reminders(kind,status,sent_at)")
        .eq("id", id).single();
      if (error) { setErrMsg(error.message); setLoading(false); return; }
      setRow(data);
      setReminders(Array.isArray(data.reminders) ? data.reminders : []);
      setLoading(false);
    })();
  }, [id]);

  async function updateStatus(status: string) {
    const { error } = await supabase.from("appointments").update({ status }).eq("id", id);
    if (error) { setErrMsg(error.message); return; }
    setRow((r: any) => ({ ...r, status }));
  }

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true); setErrMsg(null); setSaved(false);
    const form = e.target as any;
    const startsISO = withLocalOffset(form.date.value, form.start.value);
    const endsISO   = withLocalOffset(form.date.value, form.end.value);
    const { error } = await supabase.from("appointments")
      .update({ starts_at: startsISO, ends_at: endsISO, reason: form.reason.value, notes: form.notes.value })
      .eq("id", id);
    setSaving(false);
    if (error) { setErrMsg(error.message); return; }
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  async function sendWhatsApp() {
    const phone = row?.patients?.phone;
    const name  = row?.patients ? `${row.patients.first_name} ${row.patients.last_name}` : "Paciente";
    const CC    = process.env.NEXT_PUBLIC_COUNTRY_PREFIX || "52";
    if (!phone) { setErrMsg("El paciente no tiene teléfono registrado."); return; }

    setWaState("sending");
    const phoneE164 = toE164(phone, CC);
    const text      = buildMsg(name, row.starts_at);

    try {
      const res  = await fetch("/api/whatsapp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phoneE164, text }),
      });
      const json = await res.json();

      if (json.ok) {
        await supabase.from("reminders").insert({ appointment_id: id, kind: "manual", status: "ok" });
        setReminders(r => [...r, { kind: "manual", status: "ok", sent_at: new Date().toISOString() }]);
        setWaState("ok");
        return;
      }
      if (json.fallback_url) {
        window.open(json.fallback_url, "_blank", "noopener,noreferrer");
        await supabase.from("reminders").insert({ appointment_id: id, kind: "manual", status: "ok" });
        setReminders(r => [...r, { kind: "manual", status: "ok", sent_at: new Date().toISOString() }]);
        setWaState("wame");
        return;
      }
      setWaState("error");
    } catch {
      const url = `https://wa.me/${phoneE164}?text=${encodeURIComponent(text)}`;
      window.open(url, "_blank", "noopener,noreferrer");
      await supabase.from("reminders").insert({ appointment_id: id, kind: "manual", status: "ok" });
      setWaState("wame");
    }
  }

  if (loading) return <div className="card p-6 animate-pulse text-gray-400">Cargando cita…</div>;
  if (!row)    return <div className="card p-6 text-rose-600">{errMsg || "No encontrada"}</div>;

  const dIni = new Date(row.starts_at);
  const dFin = new Date(row.ends_at);
  const sentOk = reminders.filter(r => r.status === "ok");

  return (
    <div className="space-y-4 max-w-2xl">

      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="page-title">Editar cita</h1>
        <div className="flex items-center gap-2">
          <AddToCalendarButtonKit appointmentId={id} />
          <Link href={`/citas/${id}/print`} className="btn-outline rounded-xl border px-3 py-2 text-sm hover:bg-gray-50">
            🖨️ Imprimir
          </Link>
        </div>
      </div>

      {/* Paciente + status */}
      <div className="card p-4 flex items-center justify-between gap-4">
        <div>
          <div className="text-sm text-gray-400 mb-0.5">Paciente</div>
          <div className="font-semibold text-gray-800">
            {row.patients ? `${row.patients.last_name}, ${row.patients.first_name}` : "—"}
          </div>
          {row.patients?.phone && (
            <a href={`tel:${row.patients.phone}`} className="text-sm text-brand hover:underline">
              📞 {row.patients.phone}
            </a>
          )}
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <span className={`text-sm px-3 py-1 rounded-full font-medium ${STATUS_COLOR[row.status] ?? ""}`}>
            {STATUS_LABEL[row.status] ?? row.status}
          </span>
          <Link href={`/pacientes/${row.patient_id}`} className="text-xs text-brand hover:underline">
            Ver ficha del paciente →
          </Link>
        </div>
      </div>

      {/* WhatsApp */}
      <div className="card p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="font-semibold text-gray-700 flex items-center gap-2">
            <span>💬</span> WhatsApp
          </div>
          {sentOk.length > 0 && (
            <span className="text-xs text-gray-400">{sentOk.length} enviado{sentOk.length > 1 ? "s" : ""}</span>
          )}
        </div>

        {/* Historial */}
        {sentOk.length > 0 && (
          <div className="mb-3 flex flex-wrap gap-1.5">
            {sentOk.map((r, i) => (
              <span key={i} className={[
                "text-xs rounded-full px-2.5 py-1 border font-medium",
                r.kind === "confirmacion" ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                r.kind === "24h"          ? "bg-sky-50 text-sky-700 border-sky-200" :
                r.kind === "2h"           ? "bg-violet-50 text-violet-700 border-violet-200" :
                "bg-amber-50 text-amber-700 border-amber-200"
              ].join(" ")}>
                {r.kind === "confirmacion" ? "✅ Confirmación" :
                 r.kind === "24h"          ? "🔔 Recordatorio 24h" :
                 r.kind === "2h"           ? "⏰ Recordatorio 2h" : "📤 Manual"}
                {" · "}{new Date(r.sent_at).toLocaleDateString("es-MX")}
              </span>
            ))}
          </div>
        )}

        {/* Botón enviar */}
        <button
          onClick={sendWhatsApp}
          disabled={waState === "sending" || !row.patients?.phone}
          className={[
            "w-full flex items-center justify-center gap-2 py-3 rounded-xl font-medium transition text-sm",
            !row.patients?.phone
              ? "bg-gray-100 text-gray-400 cursor-not-allowed"
              : waState === "sending"
              ? "bg-gray-100 text-gray-400"
              : waState === "ok" || waState === "wame"
              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
              : "bg-green-600 text-white hover:bg-green-700",
          ].join(" ")}
        >
          {waState === "sending" && <span className="animate-spin">⏳</span>}
          {waState === "ok"      && <span>✅</span>}
          {waState === "wame"    && <span>✅</span>}
          {waState === "error"   && <span>⚠️</span>}
          {waState === "idle"    && <span>💬</span>}
          {waState === "sending" ? "Enviando…"
           : waState === "ok"    ? "¡Enviado por WhatsApp!"
           : waState === "wame"  ? "¡Abierto en WhatsApp!"
           : waState === "error" ? "Error al enviar"
           : !row.patients?.phone ? "Sin teléfono registrado"
           : "Enviar recordatorio por WhatsApp"}
        </button>

        {!row.patients?.phone && (
          <p className="text-xs text-gray-400 text-center mt-2">
            <Link href={`/pacientes/${row.patient_id}`} className="text-brand hover:underline">
              Agregar teléfono al paciente →
            </Link>
          </p>
        )}
      </div>

      {/* Formulario de edición */}
      <form onSubmit={onSave} className="card p-4 space-y-4">
        <div className="font-semibold text-gray-700">Datos de la cita</div>

        <div className="grid grid-cols-3 gap-3">
          <div className="col-span-1">
            <label className="text-xs text-gray-500 mb-1 block">Fecha</label>
            <input name="date" type="date" className="input" defaultValue={fmtLocalDate(dIni)} />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Hora inicio</label>
            <input name="start" type="time" className="input" defaultValue={fmtLocalTime(dIni)} />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Hora fin</label>
            <input name="end" type="time" className="input" defaultValue={fmtLocalTime(dFin)} />
          </div>
        </div>

        <div>
          <label className="text-xs text-gray-500 mb-1 block">Motivo</label>
          <input name="reason" className="input" defaultValue={row.reason || ""} placeholder="Consulta, revisión, etc." />
        </div>

        <div>
          <label className="text-xs text-gray-500 mb-1 block">Notas</label>
          <textarea name="notes" className="input min-h-[80px]" defaultValue={row.notes || ""} />
        </div>

        {/* Acciones */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t">
          <button className="btn" disabled={saving}>
            {saving ? "Guardando…" : "Guardar cambios"}
          </button>
          {saved && <span className="text-sm text-emerald-600 font-medium">✓ Guardado</span>}
          {errMsg && <span className="text-sm text-rose-600">⚠ {errMsg}</span>}

          <div className="ml-auto flex gap-2">
            <button type="button" onClick={() => updateStatus("scheduled")}
              className="text-xs px-3 py-2 rounded-xl bg-sky-50 text-sky-700 border border-sky-200 hover:bg-sky-100 transition">
              Programada
            </button>
            <button type="button" onClick={() => updateStatus("completed")}
              className="text-xs px-3 py-2 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition">
              Completada
            </button>
            <button type="button" onClick={() => updateStatus("cancelled")}
              className="text-xs px-3 py-2 rounded-xl bg-rose-50 text-rose-600 border border-rose-200 hover:bg-rose-100 transition">
              Cancelada
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

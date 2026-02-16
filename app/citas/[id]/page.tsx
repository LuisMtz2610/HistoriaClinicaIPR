"use client"

import React, { useState } from "react"
import { useParams } from "next/navigation"
import { supabase } from "@/lib/supabase"
import Link from "next/link"
import AddToCalendarButtonKit from "@/components/kit/AddToCalendarButtonKit"

/* ══════════════════════════════════════════════════════════════ HELPERS */
const pad = (n: number) => String(n).padStart(2, "0")
const fmtLocalDate = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`
const fmtLocalTime = (d: Date) => `${pad(d.getHours())}:${pad(d.getMinutes())}`

function withLocalOffset(dateStr: string, timeStr: string) {
  const off  = -new Date().getTimezoneOffset()
  const sign = off >= 0 ? "+" : "-"
  const hh   = pad(Math.trunc(Math.abs(off) / 60))
  const mm   = pad(Math.abs(off) % 60)
  return `${dateStr}T${timeStr}${sign}${hh}:${mm}`
}

function toE164(raw: string, cc = "52") {
  const d = (raw || "").replace(/\D/g, "")
  if (!d) return ""
  return d.startsWith(cc) ? d : cc + d
}

function buildMsg(name: string, iso: string, clinic = "Clínica Odontológica Integral") {
  const d     = new Date(iso)
  const fecha = d.toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "long" })
  const hora  = d.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" })
  return `🔔 Recordatorio de cita\n\nHola ${name}, le recordamos su cita en *${clinic}*:\n\n📅 ${fecha}\n🕐 ${hora}\n\nSi necesita reprogramar, por favor avísenos.`
}

const STATUS_META: Record<string, { label: string; dot: string; cls: string; ringCls: string }> = {
  scheduled: { label: "Programada", dot: "bg-sky-400",     cls: "bg-sky-50 text-sky-700 border-sky-200",         ringCls: "ring-sky-200" },
  completed: { label: "Completada", dot: "bg-emerald-400", cls: "bg-emerald-50 text-emerald-700 border-emerald-200", ringCls: "ring-emerald-200" },
  cancelled: { label: "Cancelada",  dot: "bg-rose-300",    cls: "bg-rose-50 text-rose-600 border-rose-200",       ringCls: "ring-rose-200" },
}

const REMINDER_META: Record<string, { label: string; cls: string }> = {
  confirmacion: { label: "✅ Confirmación",      cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  "24h":        { label: "🔔 Recordatorio 24h",  cls: "bg-sky-50 text-sky-700 border-sky-200" },
  "2h":         { label: "⏰ Recordatorio 2h",   cls: "bg-violet-50 text-violet-700 border-violet-200" },
  manual:       { label: "📤 Manual",             cls: "bg-amber-50 text-amber-700 border-amber-200" },
}

type WaState = "idle" | "sending" | "ok" | "wame" | "error"

/* ══════════════════════════════════════════════════════════════ COMPONENTE */
export default function AppointmentView() {
  const { id } = useParams<{ id: string }>()

  const [row,       setRow]       = React.useState<any>(null)
  const [loading,   setLoading]   = React.useState(true)
  const [saving,    setSaving]    = React.useState(false)
  const [saved,     setSaved]     = React.useState(false)
  const [errMsg,    setErrMsg]    = React.useState<string | null>(null)
  const [waState,   setWaState]   = useState<WaState>("idle")
  const [reminders, setReminders] = React.useState<any[]>([])

  /* ── CARGA ─────────────────────────────────────────────── */
  React.useEffect(() => {
    ;(async () => {
      const { data, error } = await supabase
        .from("appointments")
        .select("*, patients(first_name,last_name,phone), reminders(kind,status,sent_at)")
        .eq("id", id).single()
      if (error) { setErrMsg(error.message); setLoading(false); return }
      setRow(data)
      setReminders(Array.isArray(data.reminders) ? data.reminders : [])
      setLoading(false)
    })()
  }, [id])

  /* ── ACCIONES ──────────────────────────────────────────── */
  async function updateStatus(status: string) {
    const { error } = await supabase.from("appointments").update({ status }).eq("id", id)
    if (error) { setErrMsg(error.message); return }
    setRow((r: any) => ({ ...r, status }))
  }

  async function onSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true); setErrMsg(null); setSaved(false)
    const form = e.target as any
    const startsISO = withLocalOffset(form.date.value, form.start.value)
    const endsISO   = withLocalOffset(form.date.value, form.end.value)
    const { error } = await supabase.from("appointments")
      .update({ starts_at: startsISO, ends_at: endsISO, reason: form.reason.value, notes: form.notes.value })
      .eq("id", id)
    setSaving(false)
    if (error) { setErrMsg(error.message); return }
    setRow((r: any) => ({ ...r, starts_at: startsISO, ends_at: endsISO, reason: form.reason.value, notes: form.notes.value }))
    setSaved(true); setTimeout(() => setSaved(false), 2500)
  }

  async function sendWhatsApp() {
    const phone = row?.patients?.phone
    const name  = row?.patients ? `${row.patients.first_name} ${row.patients.last_name}` : "Paciente"
    const CC    = process.env.NEXT_PUBLIC_COUNTRY_PREFIX || "52"
    if (!phone) { setErrMsg("El paciente no tiene teléfono registrado."); return }

    setWaState("sending")
    const phoneE164 = toE164(phone, CC)
    const text      = buildMsg(name, row.starts_at)

    try {
      const res  = await fetch("/api/whatsapp/send", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phoneE164, text }),
      })
      const json = await res.json()
      if (json.ok) {
        await supabase.from("reminders").insert({ appointment_id: id, kind: "manual", status: "ok" })
        setReminders(r => [...r, { kind: "manual", status: "ok", sent_at: new Date().toISOString() }])
        setWaState("ok"); return
      }
      if (json.fallback_url) {
        window.open(json.fallback_url, "_blank", "noopener,noreferrer")
        await supabase.from("reminders").insert({ appointment_id: id, kind: "manual", status: "ok" })
        setReminders(r => [...r, { kind: "manual", status: "ok", sent_at: new Date().toISOString() }])
        setWaState("wame"); return
      }
      setWaState("error")
    } catch {
      const url = `https://wa.me/${phoneE164}?text=${encodeURIComponent(text)}`
      window.open(url, "_blank", "noopener,noreferrer")
      await supabase.from("reminders").insert({ appointment_id: id, kind: "manual", status: "ok" })
      setReminders(r => [...r, { kind: "manual", status: "ok", sent_at: new Date().toISOString() }])
      setWaState("wame")
    }
  }

  /* ── LOADING / ERROR ───────────────────────────────────── */
  if (loading) return (
    <div className="flex items-center justify-center h-60 gap-3 text-gray-400">
      <div style={{ width: 20, height: 20, borderRadius: "50%", border: "2.5px solid #2B9C93", borderTopColor: "transparent", animation: "spin 0.7s linear infinite" }}/>
      Cargando cita…
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
  if (!row) return <div className="card p-6 text-rose-600">{errMsg || "No encontrada"}</div>

  const dIni    = new Date(row.starts_at)
  const dFin    = new Date(row.ends_at)
  const sm      = STATUS_META[row.status] ?? STATUS_META.scheduled
  const sentOk  = reminders.filter(r => r.status === "ok")
  const patient = row.patients
  const patName = patient ? `${patient.last_name}, ${patient.first_name}` : "—"

  // Duración en minutos
  const durMins = Math.round((dFin.getTime() - dIni.getTime()) / 60000)
  const durLabel = durMins < 60
    ? `${durMins} min`
    : `${Math.floor(durMins/60)}h${durMins%60 > 0 ? ` ${durMins%60}min` : ""}`

  return (
    <div className="space-y-5 max-w-2xl">

      {/* ══ HEADER ══════════════════════════════════════════ */}
      <div className="flex items-start gap-3 flex-wrap">
        <div className="flex-1 min-w-0">
          <h1 className="page-title">Detalle de cita</h1>
          <p className="text-xs text-gray-400 mt-0.5">
            {dIni.toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap shrink-0">
          <AddToCalendarButtonKit appointmentId={id} />
          <Link href={`/citas/${id}/print`}
            className="px-3 py-2 rounded-xl text-sm font-medium border border-gray-200 text-gray-500 hover:bg-gray-50 transition">
            🖨️ Imprimir
          </Link>
          <Link href="/citas"
            className="px-3 py-2 rounded-xl text-sm font-medium bg-brand text-white hover:bg-brand-dark transition">
            ← Agenda
          </Link>
        </div>
      </div>

      {/* ══ CARD PRINCIPAL ══════════════════════════════════ */}
      <div className="card overflow-hidden">

        {/* Banda de color según estado */}
        <div className={`h-1.5 w-full ${
          row.status === "completed" ? "bg-emerald-400" :
          row.status === "cancelled" ? "bg-rose-300" : "bg-sky-400"
        }`}/>

        <div className="p-5 space-y-5">

          {/* Fila: paciente + estado */}
          <div className="flex items-start justify-between gap-4 flex-wrap">

            {/* Paciente */}
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-brand/10 flex items-center justify-center font-bold text-brand text-sm shrink-0">
                {patient ? `${patient.first_name[0]}${patient.last_name[0]}` : "?"}
              </div>
              <div>
                <div className="font-bold text-gray-900 text-base">{patName}</div>
                <div className="flex items-center gap-3 mt-0.5">
                  {patient?.phone && (
                    <a href={`tel:${patient.phone}`} className="text-xs text-brand hover:underline flex items-center gap-1">
                      📞 {patient.phone}
                    </a>
                  )}
                  <Link href={`/pacientes/${row.patient_id}`} className="text-xs text-gray-400 hover:text-brand transition">
                    Ver ficha →
                  </Link>
                </div>
              </div>
            </div>

            {/* Estado */}
            <div className="flex flex-col items-end gap-2">
              <span className={`text-xs px-3 py-1.5 rounded-full border font-semibold ${sm.cls}`}>
                <span className={`inline-block w-1.5 h-1.5 rounded-full mr-1.5 ${sm.dot}`}/>
                {sm.label}
              </span>
              {/* Cambiar estado rápido */}
              <div className="flex gap-1">
                {(["scheduled","completed","cancelled"] as const).map(s => (
                  s !== row.status && (
                    <button key={s} type="button" onClick={() => updateStatus(s)}
                      className={`text-[10px] px-2 py-1 rounded-lg border font-medium transition ${STATUS_META[s].cls} hover:opacity-80`}>
                      → {STATUS_META[s].label}
                    </button>
                  )
                ))}
              </div>
            </div>
          </div>

          {/* Horario visual */}
          <div className="flex items-center gap-4 px-4 py-3 rounded-2xl bg-gray-50 border border-gray-100">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900 tabular-nums leading-none">
                {pad(dIni.getHours())}:{pad(dIni.getMinutes())}
              </div>
              <div className="text-xs text-gray-400 mt-0.5">inicio</div>
            </div>
            <div className="flex-1 flex flex-col items-center gap-1">
              <div className="text-xs text-gray-400 font-medium">{durLabel}</div>
              <div className="w-full h-px bg-gray-200 relative">
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-gray-400"/>
                <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-gray-400"/>
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900 tabular-nums leading-none">
                {pad(dFin.getHours())}:{pad(dFin.getMinutes())}
              </div>
              <div className="text-xs text-gray-400 mt-0.5">fin</div>
            </div>
          </div>

          {/* Motivo y notas (solo lectura) */}
          {row.reason && (
            <div>
              <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Motivo</div>
              <div className="text-sm text-gray-800 font-medium">{row.reason}</div>
            </div>
          )}
          {row.notes && (
            <div>
              <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Notas</div>
              <p className="text-sm text-gray-600 whitespace-pre-wrap">{row.notes}</p>
            </div>
          )}
        </div>
      </div>

      {/* ══ WHATSAPP ════════════════════════════════════════ */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="font-semibold text-gray-800 flex items-center gap-2 text-sm">
            <span className="w-7 h-7 rounded-xl bg-green-100 flex items-center justify-center text-base">💬</span>
            Recordatorio WhatsApp
          </div>
          {sentOk.length > 0 && (
            <span className="text-xs text-gray-400 font-medium">{sentOk.length} enviado{sentOk.length > 1 ? "s" : ""}</span>
          )}
        </div>

        {/* Historial de recordatorios */}
        {sentOk.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-4">
            {sentOk.map((r, i) => {
              const m = REMINDER_META[r.kind] ?? REMINDER_META.manual
              return (
                <span key={i} className={`text-xs rounded-full px-2.5 py-1 border font-medium ${m.cls}`}>
                  {m.label}
                  {" · "}{new Date(r.sent_at).toLocaleDateString("es-MX", { day: "numeric", month: "short" })}
                </span>
              )
            })}
          </div>
        )}

        {/* Botón principal */}
        <button
          onClick={sendWhatsApp}
          disabled={waState === "sending" || !patient?.phone}
          className={[
            "w-full flex items-center justify-center gap-2.5 py-3 rounded-2xl font-semibold text-sm transition",
            !patient?.phone
              ? "bg-gray-100 text-gray-400 cursor-not-allowed"
              : waState === "sending"
              ? "bg-gray-100 text-gray-500"
              : waState === "ok" || waState === "wame"
              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
              : waState === "error"
              ? "bg-rose-50 text-rose-600 border border-rose-200"
              : "bg-green-600 text-white hover:bg-green-700 shadow-sm",
          ].join(" ")}
        >
          {waState === "sending" && <span className="animate-spin">⏳</span>}
          {(waState === "ok" || waState === "wame") && <span>✅</span>}
          {waState === "error"   && <span>⚠️</span>}
          {waState === "idle"    && <span>💬</span>}
          {waState === "sending" ? "Enviando…"
          : waState === "ok"     ? "¡Enviado correctamente!"
          : waState === "wame"   ? "¡Abierto en WhatsApp!"
          : waState === "error"  ? "Error — intenta de nuevo"
          : !patient?.phone      ? "Sin teléfono registrado"
          : "Enviar recordatorio"}
        </button>

        {!patient?.phone && (
          <p className="text-xs text-gray-400 text-center mt-2">
            <Link href={`/pacientes/${row.patient_id}`} className="text-brand hover:underline">
              Agregar teléfono al paciente →
            </Link>
          </p>
        )}
      </div>

      {/* ══ FORMULARIO DE EDICIÓN ═══════════════════════════ */}
      <form onSubmit={onSave} className="card p-5 space-y-4">
        <div className="text-sm font-bold text-gray-700 flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-brand text-white text-xs flex items-center justify-center font-bold">✏️</span>
          Editar cita
        </div>

        {/* Fecha y horas */}
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">Fecha</label>
            <input name="date" type="date" className="input text-sm w-full" defaultValue={fmtLocalDate(dIni)} />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">Hora inicio</label>
            <input name="start" type="time" className="input text-sm w-full" defaultValue={fmtLocalTime(dIni)} />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">Hora fin</label>
            <input name="end" type="time" className="input text-sm w-full" defaultValue={fmtLocalTime(dFin)} />
          </div>
        </div>

        {/* Motivo */}
        <div>
          <label className="text-xs font-medium text-gray-500 mb-1 block">Motivo</label>
          <input name="reason" className="input text-sm w-full" defaultValue={row.reason || ""} placeholder="Revisión, limpieza, urgencia…" />
        </div>

        {/* Notas */}
        <div>
          <label className="text-xs font-medium text-gray-500 mb-1 block">Notas</label>
          <textarea name="notes" className="input text-sm w-full min-h-[80px]" defaultValue={row.notes || ""} placeholder="Indicaciones, materiales necesarios…" />
        </div>

        {/* Footer del form */}
        <div className="flex items-center gap-3 pt-1 border-t border-gray-100 flex-wrap">
          <button type="submit" className="btn text-sm" disabled={saving}>
            {saving ? "Guardando…" : "Guardar cambios"}
          </button>
          {saved  && <span className="text-sm text-emerald-600 font-medium">✓ Guardado</span>}
          {errMsg && <span className="text-sm text-rose-600">⚠ {errMsg}</span>}
        </div>
      </form>

      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}

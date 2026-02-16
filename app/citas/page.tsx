"use client"
import React, { useCallback, useState } from "react"
import useSWR from "swr"
import Link from "next/link"
import { supabase } from "@/lib/supabase"
import CalendarMonth from "@/app/(clinic)/_components/CalendarMonth"

/* ── tipos ──────────────────────────────────────────────────── */
type Patient  = { first_name: string; last_name: string; phone: string | null } | null
type Reminder = { kind: string; status: string; sent_at: string }
type Row = {
  id: string; starts_at: string; ends_at: string
  status: "scheduled" | "completed" | "cancelled"
  reason: string | null; patient_id: string
  patients: Patient; reminders?: Reminder[]
}
type WaStatus = "idle" | "sending" | "ok_api" | "ok_wame" | "error"

/* ── helpers ────────────────────────────────────────────────── */
const fmtTime = (iso: string) =>
  new Date(iso).toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" })

function normalizePatient(p: any): Patient {
  if (!p) return null
  if (Array.isArray(p)) return p[0] ?? null
  return p
}

function toE164(raw: string, cc = "52") {
  const d = (raw || "").replace(/\D/g, "")
  if (!d) return ""
  return d.startsWith(cc) ? d : cc + d
}

function buildMsg(name: string, iso: string) {
  const d = new Date(iso)
  const fecha = d.toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "long" })
  const hora  = d.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" })
  return `🔔 Recordatorio de cita\n\nHola ${name}, le recordamos su cita el ${fecha} a las ${hora}.\n\nSi necesita reprogramar, por favor avísenos.`
}

const STATUS_META: Record<string, { label: string; dot: string; cls: string }> = {
  scheduled: { label: "Programada", dot: "bg-sky-400",     cls: "bg-sky-50 text-sky-700 border-sky-200" },
  completed: { label: "Completada", dot: "bg-emerald-400", cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  cancelled: { label: "Cancelada",  dot: "bg-rose-300",    cls: "bg-rose-50 text-rose-500 border-rose-200" },
}

/* ── fetcher ─────────────────────────────────────────────────── */
const fetchAppts = async (): Promise<Row[]> => {
  const now   = new Date()
  const start = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString()
  const end   = new Date(now.getFullYear(), now.getMonth() + 2, 0).toISOString()
  const { data, error } = await supabase
    .from("appointments")
    .select("id, starts_at, ends_at, status, reason, patient_id, patients(first_name,last_name,phone), reminders(kind,status,sent_at)")
    .gte("starts_at", start).lte("starts_at", end)
    .order("starts_at", { ascending: true })
  if (error) throw error
  return (data || []).map((a: any) => ({
    ...a,
    patients: normalizePatient(a.patients),
    reminders: Array.isArray(a.reminders) ? a.reminders : [],
  }))
}

/* ── WA envío ────────────────────────────────────────────────── */
async function sendWhatsApp(a: Row, onStatus: (s: WaStatus) => void) {
  const phone = a.patients?.phone
  const name  = a.patients ? `${a.patients.first_name} ${a.patients.last_name}` : "Paciente"
  if (!phone) { onStatus("error"); alert("Sin teléfono registrado."); return }
  onStatus("sending")
  const phoneE164 = toE164(phone, process.env.NEXT_PUBLIC_COUNTRY_PREFIX || "52")
  try {
    const res  = await fetch("/api/whatsapp/send", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ phoneE164, text: buildMsg(name, a.starts_at) }) })
    const json = await res.json()
    if (json.ok) {
      await supabase.from("reminders").insert({ appointment_id: a.id, kind: "manual", status: "ok" })
      onStatus("ok_api"); return
    }
    if (json.fallback_url) {
      window.open(json.fallback_url, "_blank", "noopener,noreferrer")
      await supabase.from("reminders").insert({ appointment_id: a.id, kind: "manual", status: "ok" })
      onStatus("ok_wame"); return
    }
    onStatus("error")
  } catch {
    const url = `https://wa.me/${phoneE164}?text=${encodeURIComponent(buildMsg(name, a.starts_at))}`
    window.open(url, "_blank", "noopener,noreferrer")
    await supabase.from("reminders").insert({ appointment_id: a.id, kind: "manual", status: "ok" })
    onStatus("ok_wame")
  }
}

/* ── WaButton ────────────────────────────────────────────────── */
function WaButton({ appt, onSent }: { appt: Row; onSent: () => void }) {
  const [st, setSt] = useState<WaStatus>("idle")
  const handle = async () => {
    await sendWhatsApp(appt, setSt)
    setTimeout(onSent, 800)
  }
  if (st === "sending") return <span className="text-xs text-gray-400 animate-pulse">Enviando…</span>
  if (st === "ok_api" || st === "ok_wame") return <span className="text-xs text-emerald-600 font-medium">✅ Enviado</span>
  if (st === "error")   return <span className="text-xs text-rose-500">⚠ Error</span>
  return (
    <button onClick={handle} disabled={!appt.patients?.phone}
      className={`inline-flex items-center gap-1 text-xs rounded-lg px-2 py-1 transition font-medium ${
        appt.patients?.phone ? "bg-green-50 text-green-700 border border-green-200 hover:bg-green-100" : "text-gray-300 cursor-not-allowed"
      }`}>
      💬 WA
    </button>
  )
}

/* ── WaBadge ─────────────────────────────────────────────────── */
function WaBadge({ reminders }: { reminders: Reminder[] }) {
  const sent = reminders.filter(r => r.status === "ok")
  if (!sent.length) return <span className="text-xs text-gray-300">—</span>
  return (
    <div className="flex items-center gap-1 flex-wrap">
      {sent.some(r => r.kind === "confirmacion") && <span className="text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full px-1.5 py-0.5">✅ conf</span>}
      {sent.some(r => r.kind === "24h")          && <span className="text-[10px] bg-sky-50 text-sky-700 border border-sky-200 rounded-full px-1.5 py-0.5">24h</span>}
      {sent.some(r => r.kind === "2h")           && <span className="text-[10px] bg-violet-50 text-violet-700 border border-violet-200 rounded-full px-1.5 py-0.5">2h</span>}
      {sent.some(r => r.kind === "manual")       && <span className="text-[10px] bg-amber-50 text-amber-700 border border-amber-200 rounded-full px-1.5 py-0.5">📤</span>}
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════
   PÁGINA PRINCIPAL
══════════════════════════════════════════════════════════════ */
export default function CitasPage() {
  const { data, error, isLoading, mutate } = useSWR("appointments_v2", fetchAppts, { refreshInterval: 30000 })
  const [selectedDay, setSelectedDay] = useState(new Date())
  const [view, setView] = useState<"dia" | "lista">("dia")

  const appts   = data ?? []
  const events  = appts.map(a => a.starts_at)

  // Citas del día seleccionado
  const dayAppts = appts.filter(a => {
    const d = new Date(a.starts_at)
    return d.getFullYear() === selectedDay.getFullYear()
        && d.getMonth()    === selectedDay.getMonth()
        && d.getDate()     === selectedDay.getDate()
  })

  // Próximas (solo futuras y programadas)
  const upcoming = appts.filter(a => new Date(a.starts_at) >= new Date() && a.status !== "cancelled")

  // Métricas del mes actual
  const thisMonth = appts.filter(a => {
    const d = new Date(a.starts_at)
    const n = new Date()
    return d.getMonth() === n.getMonth() && d.getFullYear() === n.getFullYear()
  })
  const scheduled = thisMonth.filter(a => a.status === "scheduled").length
  const completed = thisMonth.filter(a => a.status === "completed").length
  const cancelled = thisMonth.filter(a => a.status === "cancelled").length

  if (error) return <div className="card p-4 text-red-600">Error: {String(error.message || error)}</div>

  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="flex items-center gap-3 flex-wrap">
        <div>
          <h1 className="page-title">Agenda</h1>
          {!isLoading && <p className="text-xs text-gray-400 mt-0.5">{upcoming.length} próxima{upcoming.length !== 1 ? "s" : ""} · mes actual</p>}
        </div>
        <div className="flex gap-2 ml-auto">
          <div className="flex rounded-xl border border-gray-200 overflow-hidden bg-white p-0.5 gap-0.5">
            {(["dia", "lista"] as const).map(v => (
              <button key={v} onClick={() => setView(v)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${view === v ? "bg-brand text-white shadow-sm" : "text-gray-500 hover:bg-gray-50"}`}>
                {v === "dia" ? "📅 Calendario" : "☰ Lista"}
              </button>
            ))}
          </div>
          <Link href="/citas/new" className="btn text-sm">+ Nueva cita</Link>
        </div>
      </div>

      {/* Métricas del mes */}
      {!isLoading && (
        <div className="grid grid-cols-3 gap-3">
          <div className="card p-4 text-center">
            <div className="text-2xl font-bold text-sky-600 tabular-nums">{scheduled}</div>
            <div className="text-xs text-gray-400 mt-0.5">Programadas</div>
          </div>
          <div className="card p-4 text-center">
            <div className="text-2xl font-bold text-emerald-600 tabular-nums">{completed}</div>
            <div className="text-xs text-gray-400 mt-0.5">Completadas</div>
          </div>
          <div className="card p-4 text-center">
            <div className="text-2xl font-bold text-rose-400 tabular-nums">{cancelled}</div>
            <div className="text-xs text-gray-400 mt-0.5">Canceladas</div>
          </div>
        </div>
      )}

      {/* Vista CALENDARIO */}
      {view === "dia" && (
        <div className="grid md:grid-cols-[320px_1fr] gap-5">

          {/* Calendario */}
          <div className="card p-4">
            <CalendarMonth value={selectedDay} onChange={setSelectedDay} events={events} />
          </div>

          {/* Citas del día */}
          <div className="card p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="font-bold text-gray-800 capitalize">
                  {selectedDay.toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "long" })}
                </div>
                <div className="text-xs text-gray-400 mt-0.5">
                  {dayAppts.length} cita{dayAppts.length !== 1 ? "s" : ""}
                  {dayAppts.filter(a => a.status === "scheduled").length > 0 && (
                    <span className="ml-2 text-sky-600 font-medium">
                      · {dayAppts.filter(a => a.status === "scheduled").length} pendiente{dayAppts.filter(a => a.status === "scheduled").length !== 1 ? "s" : ""}
                    </span>
                  )}
                </div>
              </div>
              <Link href={`/citas/new?date=${selectedDay.toISOString().slice(0,10)}`}
                className="px-3 py-1.5 rounded-xl text-xs font-medium border border-brand/30 text-brand hover:bg-brand/5 transition">
                + Cita este día
              </Link>
            </div>

            {isLoading && (
              <div className="space-y-2 animate-pulse">
                {[1,2,3].map(i => <div key={i} className="h-16 rounded-xl bg-gray-100"/>)}
              </div>
            )}

            {!isLoading && dayAppts.length === 0 && (
              <div className="text-center py-12 text-gray-400">
                <div className="text-4xl mb-2">📅</div>
                <div className="text-sm">Sin citas este día</div>
              </div>
            )}

            <div className="space-y-2">
              {dayAppts.map(a => <AppointmentCard key={a.id} a={a} onRefresh={mutate} />)}
            </div>
          </div>
        </div>
      )}

      {/* Vista LISTA */}
      {view === "lista" && (
        <div className="space-y-3">
          {isLoading && (
            <div className="space-y-2 animate-pulse">
              {[1,2,3,4,5].map(i => <div key={i} className="h-16 rounded-2xl bg-gray-100"/>)}
            </div>
          )}
          {!isLoading && appts.length === 0 && (
            <div className="card p-12 text-center">
              <div className="text-5xl mb-3">📅</div>
              <div className="font-semibold text-gray-500 mb-1">Sin citas en el período</div>
              <Link href="/citas/new" className="btn mt-3 inline-block text-sm">Agendar cita</Link>
            </div>
          )}
          {/* Agrupar por día */}
          {(() => {
            const byDay = new Map<string, Row[]>()
            appts.forEach(a => {
              const key = a.starts_at.slice(0,10)
              if (!byDay.has(key)) byDay.set(key, [])
              byDay.get(key)!.push(a)
            })
            return Array.from(byDay.entries()).map(([day, rows]) => (
              <div key={day}>
                <div className="flex items-center gap-3 mb-2 px-1">
                  <div className={`text-xs font-bold uppercase tracking-wider ${
                    day === new Date().toISOString().slice(0,10) ? "text-brand" : "text-gray-400"
                  }`}>
                    {new Date(day + "T12:00").toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "long" })}
                    {day === new Date().toISOString().slice(0,10) && (
                      <span className="ml-2 text-[10px] bg-brand text-white px-1.5 py-0.5 rounded-full">Hoy</span>
                    )}
                  </div>
                  <div className="flex-1 h-px bg-gray-100"/>
                </div>
                <div className="space-y-2">
                  {rows.map(a => <AppointmentCard key={a.id} a={a} onRefresh={mutate} showDate={false} />)}
                </div>
              </div>
            ))
          })()}
        </div>
      )}
    </div>
  )
}

/* ── Tarjeta de cita ─────────────────────────────────────────── */
function AppointmentCard({ a, onRefresh, showDate = true }: { a: Row; onRefresh: () => void; showDate?: boolean }) {
  const name = a.patients ? `${a.patients.last_name}, ${a.patients.first_name}` : "—"
  const sm   = STATUS_META[a.status] ?? STATUS_META.scheduled
  return (
    <div className={`flex items-start gap-3 rounded-2xl border px-4 py-3 hover:shadow-sm transition group ${
      a.status === "cancelled" ? "opacity-55" : ""
    }`}>
      {/* Hora */}
      <div className="text-xs font-bold text-brand w-10 shrink-0 pt-0.5 tabular-nums">
        {fmtTime(a.starts_at)}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <Link href={`/pacientes/${a.patient_id}`}
            className="text-sm font-semibold text-gray-800 hover:text-brand transition truncate">
            {name}
          </Link>
          <span className={`text-[10px] px-2 py-0.5 rounded-full border font-semibold shrink-0 ${sm.cls}`}>
            {sm.label}
          </span>
        </div>
        {a.reason && <div className="text-xs text-gray-500 mt-0.5 truncate">{a.reason}</div>}
        <div className="mt-1.5">
          <WaBadge reminders={a.reminders ?? []} />
        </div>
      </div>

      {/* Acciones */}
      <div className="flex items-center gap-1.5 shrink-0 opacity-0 group-hover:opacity-100 transition">
        <WaButton appt={a} onSent={onRefresh} />
        <Link href={`/citas/${a.id}`}
          className="px-2.5 py-1.5 rounded-lg text-xs font-medium bg-brand/10 text-brand hover:bg-brand/20 transition">
          Ver
        </Link>
      </div>
    </div>
  )
}

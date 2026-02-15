'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

/* ─── tipos ──────────────────────────────────────────────── */
type Appt = {
  id: string
  starts_at: string
  ends_at: string
  status: 'scheduled' | 'completed' | 'cancelled'
  reason: string | null
  patient_id: string
  patients: { first_name: string; last_name: string; phone: string | null } | null
}

type Stats = {
  totalPatients: number
  todayCount: number
  weekCount: number
  pendingCount: number
}

/* ─── helpers ────────────────────────────────────────────── */
function todayRange() {
  const now   = new Date()
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0)
  const end   = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59)
  return { start: start.toISOString(), end: end.toISOString() }
}

function weekEnd() {
  const now = new Date()
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 7, 23, 59, 59)
  return end.toISOString()
}

const fmtTime = (iso: string) =>
  new Date(iso).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })

function greet() {
  const h = new Date().getHours()
  if (h < 12) return 'Buenos días'
  if (h < 19) return 'Buenas tardes'
  return 'Buenas noches'
}

const STATUS_LABEL: Record<string, string> = {
  scheduled: 'Programada',
  completed:  'Completada',
  cancelled:  'Cancelada',
}
const STATUS_COLOR: Record<string, string> = {
  scheduled: 'bg-sky-100 text-sky-700',
  completed:  'bg-emerald-100 text-emerald-700',
  cancelled:  'bg-rose-100 text-rose-600',
}

/* ─── componente principal ───────────────────────────────── */
export default function DashboardPage() {
  const [today,    setToday]    = useState<Appt[]>([])
  const [upcoming, setUpcoming] = useState<Appt[]>([])
  const [stats,    setStats]    = useState<Stats | null>(null)
  const [loading,  setLoading]  = useState(true)

  useEffect(() => {
    ;(async () => {
      const { start, end } = todayRange()

      const norm = (p: any) => {
        if (!p) return null
        if (Array.isArray(p)) return p[0] ?? null
        return p
      }
      const toAppt = (r: any): Appt => ({ ...r, patients: norm(r.patients) })

      const [
        { data: todayData },
        { data: upData },
        { count: totalPat },
        { count: weekCnt },
        { count: pendingCnt },
      ] = await Promise.all([
        // Citas de HOY (no canceladas)
        supabase
          .from('appointments')
          .select('id, starts_at, ends_at, status, reason, patient_id, patients(first_name,last_name,phone)')
          .gte('starts_at', start)
          .lte('starts_at', end)
          .neq('status', 'cancelled')
          .order('starts_at', { ascending: true }),

        // Próximos 7 días (excluye hoy, no canceladas)
        supabase
          .from('appointments')
          .select('id, starts_at, ends_at, status, reason, patient_id, patients(first_name,last_name,phone)')
          .gt('starts_at', end)
          .lte('starts_at', weekEnd())
          .neq('status', 'cancelled')
          .order('starts_at', { ascending: true })
          .limit(6),

        // Total pacientes
        supabase.from('patients').select('*', { count: 'exact', head: true }),

        // Citas esta semana (hoy + 7 días, no canceladas)
        supabase
          .from('appointments')
          .select('*', { count: 'exact', head: true })
          .gte('starts_at', start)
          .lte('starts_at', weekEnd())
          .neq('status', 'cancelled'),

        // Citas pendientes hoy (scheduled)
        supabase
          .from('appointments')
          .select('*', { count: 'exact', head: true })
          .gte('starts_at', start)
          .lte('starts_at', end)
          .eq('status', 'scheduled'),
      ])

      setToday((todayData ?? []).map(toAppt))
      setUpcoming((upData ?? []).map(toAppt))
      setStats({
        totalPatients: totalPat  ?? 0,
        todayCount:    (todayData ?? []).length,
        weekCount:     weekCnt   ?? 0,
        pendingCount:  pendingCnt ?? 0,
      })
      setLoading(false)
    })()
  }, [])

  const nowISO = new Date().toISOString()
  const pastToday    = today.filter(a => a.ends_at   < nowISO)
  const currentToday = today.filter(a => a.starts_at <= nowISO && a.ends_at >= nowISO)
  const futureToday  = today.filter(a => a.starts_at > nowISO)

  return (
    <div className="space-y-6">

      {/* ── Saludo + botones rápidos ── */}
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <p className="text-sm text-gray-500 mb-0.5 capitalize">
            {new Date().toLocaleDateString('es-MX', { weekday:'long', day:'numeric', month:'long', year:'numeric' })}
          </p>
          <h1 className="text-2xl font-semibold text-brand-dark">
            {greet()} 👋
          </h1>
        </div>
        <div className="flex gap-2">
          <Link href="/pacientes/new" className="btn text-sm">+ Paciente</Link>
          <Link href="/citas/new"     className="btn text-sm">+ Cita</Link>
        </div>
      </div>

      {/* ── Tarjetas de estadísticas ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Pacientes"       value={loading ? '…' : String(stats?.totalPatients ?? 0)} icon="🦷" href="/pacientes"  color="teal"   />
        <StatCard label="Citas hoy"       value={loading ? '…' : String(stats?.todayCount    ?? 0)} icon="📅" href="/citas"      color="blue"   />
        <StatCard label="Esta semana"     value={loading ? '…' : String(stats?.weekCount     ?? 0)} icon="📆" href="/citas"      color="violet" />
        <StatCard label="Pendientes hoy"  value={loading ? '…' : String(stats?.pendingCount  ?? 0)} icon="⏳" href="/citas"      color={stats?.pendingCount ? 'amber' : 'gray'} />
      </div>

      {/* ── Citas de hoy ── */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-brand-dark flex items-center gap-2">
            <span>📋</span> Citas de hoy
          </h2>
          <Link href="/citas" className="text-sm text-brand hover:underline">Ver agenda →</Link>
        </div>

        {loading && <SkeletonList n={3} />}

        {!loading && today.length === 0 && (
          <div className="text-center py-10 text-gray-400">
            <div className="text-4xl mb-2">🎉</div>
            <div className="text-sm">Sin citas programadas para hoy</div>
          </div>
        )}

        {/* En curso ahora */}
        {currentToday.length > 0 && (
          <div className="mb-3">
            <div className="text-xs font-semibold text-emerald-600 uppercase tracking-wide mb-2 flex items-center gap-1">
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              En curso ahora
            </div>
            <div className="space-y-2">
              {currentToday.map(a => <ApptRow key={a.id} a={a} highlight />)}
            </div>
          </div>
        )}

        {/* Próximas de hoy */}
        {futureToday.length > 0 && (
          <div className="mb-3">
            {currentToday.length > 0 && (
              <div className="text-xs font-semibold text-sky-600 uppercase tracking-wide mb-2">
                Más tarde hoy
              </div>
            )}
            <div className="space-y-2">
              {futureToday.map(a => <ApptRow key={a.id} a={a} />)}
            </div>
          </div>
        )}

        {/* Ya pasadas (colapsado) */}
        {pastToday.length > 0 && (
          <details className="mt-2">
            <summary className="text-xs text-gray-400 cursor-pointer select-none hover:text-gray-600 list-none flex items-center gap-1">
              <span>▸</span>
              {pastToday.length} cita{pastToday.length > 1 ? 's' : ''} ya atendida{pastToday.length > 1 ? 's' : ''}
            </summary>
            <div className="mt-2 space-y-2 opacity-60">
              {pastToday.map(a => <ApptRow key={a.id} a={a} />)}
            </div>
          </details>
        )}
      </div>

      {/* ── Grid inferior: próximos 7 días + accesos rápidos ── */}
      <div className="grid md:grid-cols-2 gap-4">

        {/* Próximas citas */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-brand-dark flex items-center gap-2">
              <span>🗓️</span> Próximos 7 días
            </h2>
            <Link href="/citas" className="text-sm text-brand hover:underline">Ver todas →</Link>
          </div>

          {loading && <SkeletonList n={4} />}

          {!loading && upcoming.length === 0 && (
            <div className="text-sm text-gray-400 text-center py-6">
              Sin citas en los próximos 7 días
            </div>
          )}

          <div className="space-y-1">
            {upcoming.map(a => (
              <Link
                key={a.id}
                href={`/citas/${a.id}`}
                className="flex items-center gap-3 rounded-xl px-3 py-2 hover:bg-gray-50 transition group"
              >
                {/* mini fecha */}
                <div className="w-10 text-center shrink-0">
                  <div className="text-[10px] text-gray-400 uppercase leading-none">
                    {new Date(a.starts_at).toLocaleDateString('es-MX', { weekday: 'short' })}
                  </div>
                  <div className="text-xl font-bold text-brand-dark leading-tight">
                    {new Date(a.starts_at).getDate()}
                  </div>
                  <div className="text-[10px] text-gray-400 leading-none">
                    {new Date(a.starts_at).toLocaleDateString('es-MX', { month: 'short' })}
                  </div>
                </div>
                <div className="h-8 w-px bg-gray-200 shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium text-gray-800 truncate">
                    {a.patients ? `${a.patients.last_name}, ${a.patients.first_name}` : '—'}
                  </div>
                  <div className="text-xs text-gray-500 truncate">
                    {fmtTime(a.starts_at)} · {a.reason || 'Sin motivo'}
                  </div>
                </div>
                <span className="text-gray-300 group-hover:text-brand transition shrink-0">›</span>
              </Link>
            ))}
          </div>
        </div>

        {/* Accesos rápidos */}
        <div className="card p-5">
          <h2 className="text-base font-semibold text-brand-dark mb-4 flex items-center gap-2">
            <span>⚡</span> Accesos rápidos
          </h2>
          <div className="grid grid-cols-2 gap-2">
            <QuickLink href="/pacientes"        icon="👤" label="Pacientes"       desc="Lista completa"  />
            <QuickLink href="/pacientes/new"    icon="➕" label="Nuevo paciente"  desc="Registrar ficha" />
            <QuickLink href="/citas"            icon="📅" label="Agenda"          desc="Todas las citas" />
            <QuickLink href="/citas/new"        icon="🗓️" label="Nueva cita"      desc="Programar"       />
            <QuickLink href="/quotes"           icon="💰" label="Presupuestos"    desc="Ver y crear"     />
            <QuickLink href="/prescriptions"    icon="💊" label="Recetas"         desc="Historial"       />
            <QuickLink href="/consents"         icon="📄" label="Consentimientos" desc="Documentos"      />
            <QuickLink href="/radiology-orders" icon="🩻" label="Radiología"      desc="Órdenes RX"      />
          </div>
        </div>

      </div>
    </div>
  )
}

/* ─── subcomponentes ─────────────────────────────────────── */

function ApptRow({ a, highlight }: { a: Appt; highlight?: boolean }) {
  const name = a.patients
    ? `${a.patients.last_name}, ${a.patients.first_name}`
    : '—'
  return (
    <Link
      href={`/citas/${a.id}`}
      className={[
        'flex items-center gap-3 rounded-xl px-3 py-2.5 transition group',
        highlight
          ? 'bg-emerald-50 border border-emerald-200 hover:bg-emerald-100'
          : 'hover:bg-gray-50',
      ].join(' ')}
    >
      <div className="text-sm font-semibold text-brand-dark w-12 shrink-0 tabular-nums">
        {fmtTime(a.starts_at)}
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium text-gray-800 truncate">{name}</div>
        {a.reason && <div className="text-xs text-gray-500 truncate">{a.reason}</div>}
      </div>
      <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${STATUS_COLOR[a.status] ?? ''}`}>
        {STATUS_LABEL[a.status] ?? a.status}
      </span>
      <span className="text-gray-300 group-hover:text-brand transition text-sm shrink-0">›</span>
    </Link>
  )
}

function StatCard({ label, value, icon, href, color }: {
  label: string; value: string; icon: string; href: string
  color: 'teal' | 'blue' | 'violet' | 'amber' | 'gray'
}) {
  const bg: Record<string, string> = {
    teal:   'bg-teal-50   border-teal-200',
    blue:   'bg-sky-50    border-sky-200',
    violet: 'bg-violet-50 border-violet-200',
    amber:  'bg-amber-50  border-amber-200',
    gray:   'bg-gray-50   border-gray-200',
  }
  const num: Record<string, string> = {
    teal:   'text-teal-700',
    blue:   'text-sky-700',
    violet: 'text-violet-700',
    amber:  'text-amber-700',
    gray:   'text-gray-400',
  }
  return (
    <Link href={href} className={`rounded-2xl border p-4 flex flex-col gap-1 hover:shadow-md transition ${bg[color]}`}>
      <div className="text-2xl">{icon}</div>
      <div className={`text-2xl font-bold tabular-nums ${num[color]}`}>{value}</div>
      <div className="text-xs text-gray-500 leading-tight">{label}</div>
    </Link>
  )
}

function QuickLink({ href, icon, label, desc }: {
  href: string; icon: string; label: string; desc: string
}) {
  return (
    <Link
      href={href}
      className="flex items-start gap-2.5 rounded-xl border border-gray-200 bg-gray-50 px-3 py-3 hover:border-brand hover:bg-teal-50 transition group"
    >
      <span className="text-xl mt-0.5">{icon}</span>
      <div className="min-w-0">
        <div className="text-sm font-medium text-gray-800 group-hover:text-brand-dark transition truncate">{label}</div>
        <div className="text-xs text-gray-400 truncate">{desc}</div>
      </div>
    </Link>
  )
}

function SkeletonList({ n }: { n: number }) {
  return (
    <div className="space-y-2 animate-pulse">
      {Array.from({ length: n }).map((_, i) => (
        <div key={i} className="h-12 rounded-xl bg-gray-100" />
      ))}
    </div>
  )
}

'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

/* ══════════════════════════════════════════════════════════════ TIPOS */
type Appt = {
  id: string; starts_at: string; ends_at: string
  status: 'scheduled' | 'completed' | 'cancelled'
  reason: string | null; patient_id: string
  patients: { first_name: string; last_name: string; phone: string | null } | null
}
type Stats = {
  totalPatients: number; todayCount: number; weekCount: number; pendingCount: number
  pendingBalance: number; newPatientsMonth: number
}

/* ══════════════════════════════════════════════════════════════ HELPERS */
const todayRange = () => {
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0)
  const end   = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59)
  return { start: start.toISOString(), end: end.toISOString() }
}
const weekEnd = () => new Date(new Date().setDate(new Date().getDate() + 7)).toISOString()
const monthStart = () => new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()
const fmtTime = (iso: string) => new Date(iso).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })
const greet = () => {
  const h = new Date().getHours()
  return h < 12 ? 'Buenos días' : h < 19 ? 'Buenas tardes' : 'Buenas noches'
}

const STATUS_META: Record<string, { label: string; cls: string }> = {
  scheduled: { label: 'Programada', cls: 'bg-sky-50 text-sky-700 border-sky-200' },
  completed: { label: 'Completada', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  cancelled: { label: 'Cancelada', cls: 'bg-rose-50 text-rose-500 border-rose-200' },
}

/* ══════════════════════════════════════════════════════════════ COMPONENTE */
export default function DashboardPage() {
  const [today,    setToday]    = useState<Appt[]>([])
  const [upcoming, setUpcoming] = useState<Appt[]>([])
  const [stats,    setStats]    = useState<Stats | null>(null)
  const [loading,  setLoading]  = useState(true)

  useEffect(() => {
    ;(async () => {
      const { start, end } = todayRange()
      const norm = (p: any) => Array.isArray(p) ? p[0] ?? null : p ?? null
      const toAppt = (r: any): Appt => ({ ...r, patients: norm(r.patients) })

      const [
        { data: todayData },
        { data: upData },
        { count: totalPat },
        { count: weekCnt },
        { count: pendingCnt },
        { data: quotesData },
        { count: newPat },
      ] = await Promise.all([
        supabase.from('appointments').select('id, starts_at, ends_at, status, reason, patient_id, patients(first_name,last_name,phone)')
          .gte('starts_at', start).lte('starts_at', end).neq('status', 'cancelled').order('starts_at'),
        supabase.from('appointments').select('id, starts_at, ends_at, status, reason, patient_id, patients(first_name,last_name,phone)')
          .gt('starts_at', end).lte('starts_at', weekEnd()).neq('status', 'cancelled').order('starts_at').limit(6),
        supabase.from('patients').select('*', { count: 'exact', head: true }),
        supabase.from('appointments').select('*', { count: 'exact', head: true }).gte('starts_at', start).lte('starts_at', weekEnd()).neq('status', 'cancelled'),
        supabase.from('appointments').select('*', { count: 'exact', head: true }).gte('starts_at', start).lte('starts_at', end).eq('status', 'scheduled'),
        // Saldo pendiente — total - pagado de presupuestos no cancelados
        supabase.from('quotes').select('discount, tax, quote_items(quantity,unit_price,discount), quote_payments(amount)').neq('status', 'cancelado'),
        // Pacientes nuevos este mes
        supabase.from('patients').select('*', { count: 'exact', head: true }).gte('created_at', monthStart()),
      ])

      const pendingBalance = (quotesData ?? []).reduce((sum, q: any) => {
        const itemsTotal = (q.quote_items ?? []).reduce((s: number, it: any) => s + Math.max(0, (it.quantity || 0) * (it.unit_price || 0) - (it.discount ?? 0)), 0)
        const total = itemsTotal - (q.discount ?? 0) + (q.tax ?? 0)
        const paid  = (q.quote_payments ?? []).reduce((s: number, p: any) => s + (p.amount || 0), 0)
        return sum + Math.max(0, total - paid)
      }, 0)

      setToday((todayData ?? []).map(toAppt))
      setUpcoming((upData ?? []).map(toAppt))
      setStats({
        totalPatients: totalPat ?? 0,
        todayCount:    (todayData ?? []).length,
        weekCount:     weekCnt ?? 0,
        pendingCount:  pendingCnt ?? 0,
        pendingBalance,
        newPatientsMonth: newPat ?? 0,
      })
      setLoading(false)
    })()
  }, [])

  const nowISO = new Date().toISOString()
  const pastToday    = today.filter(a => a.ends_at   < nowISO)
  const currentToday = today.filter(a => a.starts_at <= nowISO && a.ends_at >= nowISO)
  const futureToday  = today.filter(a => a.starts_at > nowISO)

  const money = (n: number) => n.toLocaleString('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 })

  return (
    <div className="space-y-6">

      {/* ══ HEADER ══════════════════════════════════════════ */}
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <p className="text-sm text-gray-400 mb-0.5 capitalize">
            {new Date().toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
          <h1 className="text-2xl font-bold text-gray-900">{greet()} 👋</h1>
        </div>
        <div className="flex gap-2">
          <Link href="/pacientes/new" className="btn text-sm">+ Paciente</Link>
          <Link href="/citas/new"     className="btn text-sm">+ Cita</Link>
        </div>
      </div>

      {/* ══ MÉTRICAS ════════════════════════════════════════ */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <MetricCard label="Pacientes totales" value={loading ? '…' : String(stats?.totalPatients ?? 0)} icon="🦷" color="teal" href="/pacientes" />
        <MetricCard label="Nuevos este mes"   value={loading ? '…' : `+${stats?.newPatientsMonth ?? 0}`} icon="✨" color="violet" href="/pacientes" />
        <MetricCard label="Citas hoy"         value={loading ? '…' : String(stats?.todayCount ?? 0)} icon="📅" color="blue" href="/citas" />
        <MetricCard label="Esta semana"       value={loading ? '…' : String(stats?.weekCount ?? 0)} icon="📆" color="sky" href="/citas" />
        <MetricCard label="Pendientes hoy"    value={loading ? '…' : String(stats?.pendingCount ?? 0)} icon="⏳" color={(stats?.pendingCount ?? 0) > 0 ? 'amber' : 'gray'} href="/citas" />
        <MetricCard label="Por cobrar"        value={loading ? '…' : money(stats?.pendingBalance ?? 0)} icon="💰" color={(stats?.pendingBalance ?? 0) > 0 ? 'rose' : 'emerald'} href="/quotes" />
      </div>

      {/* ══ CITAS DE HOY ════════════════════════════════════ */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <span>📋</span> Citas de hoy
          </h2>
          <Link href="/citas" className="text-sm text-brand hover:underline font-medium">Ver agenda →</Link>
        </div>

        {loading && <SkeletonList n={3} />}

        {!loading && today.length === 0 && (
          <div className="text-center py-12 text-gray-400">
            <div className="text-5xl mb-2">🎉</div>
            <div className="text-sm font-medium">Sin citas programadas para hoy</div>
          </div>
        )}

        {/* En curso */}
        {currentToday.length > 0 && (
          <div className="mb-4">
            <div className="text-xs font-bold text-emerald-600 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              En curso ahora
            </div>
            <div className="space-y-2">
              {currentToday.map(a => <ApptRow key={a.id} a={a} highlight />)}
            </div>
          </div>
        )}

        {/* Próximas */}
        {futureToday.length > 0 && (
          <div className="mb-3">
            {currentToday.length > 0 && (
              <div className="text-xs font-bold text-sky-600 uppercase tracking-wider mb-2">Más tarde hoy</div>
            )}
            <div className="space-y-2">
              {futureToday.map(a => <ApptRow key={a.id} a={a} />)}
            </div>
          </div>
        )}

        {/* Pasadas */}
        {pastToday.length > 0 && (
          <details className="mt-3">
            <summary className="text-xs text-gray-400 cursor-pointer hover:text-gray-600 font-medium flex items-center gap-1">
              ▸ {pastToday.length} cita{pastToday.length > 1 ? 's' : ''} ya atendida{pastToday.length > 1 ? 's' : ''}
            </summary>
            <div className="mt-2 space-y-2 opacity-50">
              {pastToday.map(a => <ApptRow key={a.id} a={a} />)}
            </div>
          </details>
        )}
      </div>

      {/* ══ GRID INFERIOR ═══════════════════════════════════ */}
      <div className="grid md:grid-cols-2 gap-4">

        {/* Próximos 7 días */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
              <span>🗓️</span> Próximos 7 días
            </h2>
            <Link href="/citas" className="text-sm text-brand hover:underline font-medium">Ver todas →</Link>
          </div>

          {loading && <SkeletonList n={4} />}

          {!loading && upcoming.length === 0 && (
            <div className="text-sm text-gray-400 text-center py-8">Sin citas en los próximos 7 días</div>
          )}

          <div className="space-y-1">
            {upcoming.map(a => (
              <Link key={a.id} href={`/citas/${a.id}`}
                className="flex items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-gray-50 transition group">
                <div className="w-11 text-center shrink-0">
                  <div className="text-[10px] text-gray-400 uppercase leading-none">
                    {new Date(a.starts_at).toLocaleDateString('es-MX', { weekday: 'short' })}
                  </div>
                  <div className="text-xl font-bold text-brand leading-tight">
                    {new Date(a.starts_at).getDate()}
                  </div>
                  <div className="text-[10px] text-gray-400 leading-none">
                    {new Date(a.starts_at).toLocaleDateString('es-MX', { month: 'short' })}
                  </div>
                </div>
                <div className="h-9 w-px bg-gray-200 shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold text-gray-800 truncate">
                    {a.patients ? `${a.patients.last_name}, ${a.patients.first_name}` : '—'}
                  </div>
                  <div className="text-xs text-gray-500 truncate">
                    {fmtTime(a.starts_at)} · {a.reason || 'Sin motivo'}
                  </div>
                </div>
                <span className="text-gray-300 group-hover:text-brand transition shrink-0 text-lg">›</span>
              </Link>
            ))}
          </div>
        </div>

        {/* Accesos rápidos */}
        <div className="card p-5">
          <h2 className="text-base font-bold text-gray-900 mb-4 flex items-center gap-2">
            <span>⚡</span> Accesos rápidos
          </h2>
          <div className="grid grid-cols-2 gap-2">
            <QuickLink href="/pacientes"        icon="👤" label="Pacientes"       />
            <QuickLink href="/pacientes/new"    icon="➕" label="Nuevo paciente"  />
            <QuickLink href="/citas"            icon="📅" label="Agenda"          />
            <QuickLink href="/citas/new"        icon="🗓️" label="Nueva cita"      />
            <QuickLink href="/quotes"           icon="💰" label="Presupuestos"    />
            <QuickLink href="/prescriptions"    icon="💊" label="Recetas"         />
            <QuickLink href="/consents"         icon="📄" label="Consentimientos" />
            <QuickLink href="/services"         icon="🏷️" label="Catálogo"        />
          </div>
        </div>
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════ SUBCOMPONENTES */

function ApptRow({ a, highlight }: { a: Appt; highlight?: boolean }) {
  const name = a.patients ? `${a.patients.last_name}, ${a.patients.first_name}` : '—'
  const sm   = STATUS_META[a.status] ?? STATUS_META.scheduled
  return (
    <Link href={`/citas/${a.id}`}
      className={`flex items-center gap-3 rounded-xl px-3 py-2.5 transition group ${
        highlight ? 'bg-emerald-50 border border-emerald-200 hover:bg-emerald-100' : 'hover:bg-gray-50'
      }`}>
      <div className="text-sm font-bold text-brand w-12 shrink-0 tabular-nums">{fmtTime(a.starts_at)}</div>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-semibold text-gray-800 truncate">{name}</div>
        {a.reason && <div className="text-xs text-gray-500 truncate">{a.reason}</div>}
      </div>
      <span className={`text-[10px] px-2 py-0.5 rounded-full border font-semibold shrink-0 ${sm.cls}`}>
        {sm.label}
      </span>
      <span className="text-gray-300 group-hover:text-brand transition shrink-0">›</span>
    </Link>
  )
}

function MetricCard({ label, value, icon, color, href }: {
  label: string; value: string; icon: string
  color: 'teal' | 'violet' | 'blue' | 'sky' | 'amber' | 'gray' | 'rose' | 'emerald'
  href: string
}) {
  const bg: Record<string, string> = {
    teal: 'bg-teal-50 border-teal-200', violet: 'bg-violet-50 border-violet-200', blue: 'bg-sky-50 border-sky-200',
    sky: 'bg-blue-50 border-blue-200', amber: 'bg-amber-50 border-amber-200', gray: 'bg-gray-50 border-gray-200',
    rose: 'bg-rose-50 border-rose-200', emerald: 'bg-emerald-50 border-emerald-200',
  }
  const num: Record<string, string> = {
    teal: 'text-teal-700', violet: 'text-violet-700', blue: 'text-sky-700', sky: 'text-blue-700',
    amber: 'text-amber-700', gray: 'text-gray-400', rose: 'text-rose-700', emerald: 'text-emerald-700',
  }
  return (
    <Link href={href} className={`rounded-2xl border p-4 hover:shadow-md transition ${bg[color]}`}>
      <div className="text-2xl mb-1">{icon}</div>
      <div className={`text-xl font-bold tabular-nums leading-tight ${num[color]}`}>{value}</div>
      <div className="text-xs text-gray-500 leading-tight mt-0.5">{label}</div>
    </Link>
  )
}

function QuickLink({ href, icon, label }: { href: string; icon: string; label: string }) {
  return (
    <Link href={href}
      className="flex items-center gap-2.5 rounded-xl border border-gray-200 bg-white px-3 py-3 hover:border-brand hover:bg-brand/5 transition group">
      <span className="text-xl shrink-0">{icon}</span>
      <div className="text-sm font-semibold text-gray-800 group-hover:text-brand transition truncate">{label}</div>
    </Link>
  )
}

function SkeletonList({ n }: { n: number }) {
  return (
    <div className="space-y-2 animate-pulse">
      {Array.from({ length: n }).map((_, i) => <div key={i} className="h-14 rounded-xl bg-gray-100" />)}
    </div>
  )
}

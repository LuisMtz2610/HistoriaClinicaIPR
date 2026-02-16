'use client'

import React, { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

/* ══════════════════════════════════════════════════════════════ TIPOS */
type Pat = { first_name: string; last_name: string } | null
type Row = { id: string; dt: string; folio?: string|null; status?: string|null; total: number; paid: number; balance: number }
type Group = { patient_id: string|null; patient: Pat; rows: Row[]; totals: { total: number; paid: number; balance: number } }

const APPROVED = new Set(['aprobado','aprobada','approved','aceptado','aceptada','accepted'])
const isApproved = (s: unknown) => APPROVED.has(String(s ?? '').toLowerCase())

const STATUS_META: Record<string, { label: string; cls: string }> = {
  borrador:    { label: 'Borrador',   cls: 'bg-gray-100 text-gray-500' },
  aprobado:    { label: 'Aprobado',   cls: 'bg-emerald-50 text-emerald-700' },
  aceptado:    { label: 'Aceptado',   cls: 'bg-emerald-50 text-emerald-700' },
  pagado:      { label: 'Pagado',     cls: 'bg-teal-50 text-teal-700' },
  cancelado:   { label: 'Cancelado',  cls: 'bg-red-50 text-red-500' },
}

/* ══════════════════════════════════════════════════════════════ PÁGINA */
export default function QuotesPage() {
  const [groups,  setGroups]  = useState<Group[]>([])
  const [loading, setLoading] = useState(true)
  const [search,  setSearch]  = useState('')
  const [filter,  setFilter]  = useState<'todos'|'pendiente'|'aprobado'|'pagado'>('todos')

  const money = useMemo(() => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }), [])

  async function load() {
    setLoading(true)
    const { data } = await supabase
      .from('quotes')
      .select('id, created_at, discount, tax, total, status, patient_id, folio_code, quote_items(quantity,unit_price,discount), quote_payments(amount), patients(first_name,last_name)')
      .order('created_at', { ascending: false })

    const byPat = new Map<string|null, Group>()
    ;(data ?? []).forEach((r: any) => {
      const pid = r.patient_id ?? null
      const sub = Array.isArray(r.quote_items) && r.quote_items.length
        ? r.quote_items.reduce((a: number, it: any) => a + Math.max(0, (it.quantity||0)*(it.unit_price||0) - (it.discount||0)), 0)
        : null
      const total = sub !== null ? Math.max(0, sub - (r.discount||0) + (r.tax||0)) : (Number(r.total)||0)
      const paid  = (r.quote_payments??[]).reduce((a: number, p: any) => a + (Number(p.amount)||0), 0)
      const row: Row = { id: r.id, dt: r.created_at, folio: r.folio_code, status: r.status, total, paid, balance: total - paid }
      if (!byPat.has(pid)) byPat.set(pid, { patient_id: pid, patient: r.patients ?? null, rows: [], totals: { total: 0, paid: 0, balance: 0 } })
      const g = byPat.get(pid)!
      g.rows.push(row)
      g.totals.total += total; g.totals.paid += paid; g.totals.balance += total - paid
    })

    const sorted = Array.from(byPat.values()).sort((a, b) => {
      const na = a.patient ? `${a.patient.last_name} ${a.patient.first_name}` : 'ZZZ'
      const nb = b.patient ? `${b.patient.last_name} ${b.patient.first_name}` : 'ZZZ'
      return na.localeCompare(nb, undefined, { sensitivity: 'base' })
    })
    setGroups(sorted); setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function approveQuote(id: string) {
    for (const status of ['aprobado','aceptado','approved']) {
      const { error } = await supabase.from('quotes').update({ status }).eq('id', id)
      if (!error) { load(); return }
      if (!/invalid input value for enum/i.test(error.message)) { alert('Error: ' + error.message); return }
    }
    alert('No se pudo aprobar — revisa el enum quote_status en Supabase')
  }

  async function deleteQuote(id: string, folio: string | null) {
    if (!confirm(`¿Eliminar el presupuesto ${folio ?? id.slice(0, 8)}?\n\nEsta acción no se puede deshacer.`)) return
    const { error } = await supabase.from('quotes').delete().eq('id', id)
    if (error) { alert('Error al eliminar: ' + error.message); return }
    load()
  }

  // Métricas globales
  const allRows   = groups.flatMap(g => g.rows)
  const totalAll  = allRows.reduce((a, r) => a + r.total, 0)
  const paidAll   = allRows.reduce((a, r) => a + r.paid, 0)
  const balAll    = allRows.reduce((a, r) => a + r.balance, 0)
  const pendCount = allRows.filter(r => !isApproved(r.status) && r.status !== 'cancelado' && r.status !== 'pagado').length

  const norm = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase()
  const filtered = groups
    .map(g => ({
      ...g,
      rows: g.rows.filter(r => {
        if (filter === 'aprobado'  && !isApproved(r.status)) return false
        if (filter === 'pagado'    && r.status !== 'pagado')  return false
        if (filter === 'pendiente' && (isApproved(r.status) || r.status === 'pagado' || r.status === 'cancelado')) return false
        return true
      }),
    }))
    .filter(g => {
      if (!search.trim()) return g.rows.length > 0
      const q = norm(search)
      const nameMatch = g.patient ? norm(`${g.patient.first_name} ${g.patient.last_name}`).includes(q) : false
      const folioMatch = g.rows.some(r => (r.folio ?? '').toLowerCase().includes(q))
      return (nameMatch || folioMatch) && g.rows.length > 0
    })

  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="flex items-center gap-3 flex-wrap">
        <div>
          <h1 className="page-title">Presupuestos</h1>
          {!loading && <p className="text-xs text-gray-400 mt-0.5">{allRows.length} presupuesto{allRows.length !== 1 ? 's' : ''} · {groups.length} paciente{groups.length !== 1 ? 's' : ''}</p>}
        </div>
        <Link href="/quotes/new" className="btn ml-auto">+ Nuevo presupuesto</Link>
      </div>

      {/* Métricas */}
      {!loading && allRows.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Total facturado', val: money.format(totalAll), color: 'text-gray-800', bg: 'bg-gray-50 border-gray-200' },
            { label: 'Cobrado',         val: money.format(paidAll),  color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200' },
            { label: 'Por cobrar',      val: money.format(balAll),   color: balAll > 0 ? 'text-rose-700' : 'text-gray-400', bg: balAll > 0 ? 'bg-rose-50 border-rose-200' : 'bg-gray-50 border-gray-200' },
            { label: 'Sin aprobar',     val: String(pendCount),      color: pendCount > 0 ? 'text-amber-700' : 'text-gray-400', bg: pendCount > 0 ? 'bg-amber-50 border-amber-200' : 'bg-gray-50 border-gray-200' },
          ].map(m => (
            <div key={m.label} className={`rounded-2xl border p-4 ${m.bg}`}>
              <div className={`text-xl font-bold tabular-nums ${m.color}`}>{m.val}</div>
              <div className="text-xs text-gray-400 mt-0.5">{m.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Búsqueda y filtros */}
      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-48">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
          <input className="input pl-9 text-sm" placeholder="Buscar paciente o folio…" value={search} onChange={e => setSearch(e.target.value)} />
          {search && <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-lg">×</button>}
        </div>
        {(['todos','pendiente','aprobado','pagado'] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-3 py-2 rounded-xl text-xs font-semibold border transition capitalize ${filter === f ? 'bg-brand text-white border-transparent' : 'bg-white text-gray-500 border-gray-200 hover:border-brand'}`}>
            {f === 'todos' ? 'Todos' : f === 'pendiente' ? 'Sin aprobar' : f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {/* Loading */}
      {loading && (
        <div className="space-y-3 animate-pulse">
          {[1,2,3].map(i => <div key={i} className="h-24 rounded-2xl bg-gray-100"/>)}
        </div>
      )}

      {/* Sin resultados */}
      {!loading && filtered.length === 0 && (
        <div className="card p-12 text-center">
          <div className="text-5xl mb-3">💰</div>
          <div className="font-semibold text-gray-500 mb-1">{search ? 'Sin resultados' : 'Sin presupuestos'}</div>
          <div className="text-sm text-gray-400">{search ? `No hay coincidencias para "${search}"` : 'Crea el primer presupuesto para un paciente.'}</div>
          {!search && <Link href="/quotes/new" className="btn mt-4 inline-block text-sm">+ Crear presupuesto</Link>}
        </div>
      )}

      {/* Lista agrupada */}
      <div className="space-y-3">
        {filtered.map(g => (
          <div key={g.patient_id ?? 'sin-paciente'} className="card overflow-hidden">
            {/* Cabecera del grupo */}
            <div className="flex items-center gap-4 px-5 py-4 border-b border-gray-100 bg-gray-50/60">
              <div className="w-9 h-9 rounded-xl bg-brand/10 flex items-center justify-center font-bold text-brand text-sm shrink-0">
                {g.patient ? `${g.patient.first_name[0]}${g.patient.last_name[0]}` : '?'}
              </div>
              <div className="flex-1 min-w-0">
                {g.patient && g.patient_id
                  ? <Link href={`/pacientes/${g.patient_id}`} className="font-semibold text-gray-800 hover:text-brand transition">{g.patient.last_name}, {g.patient.first_name}</Link>
                  : <span className="font-semibold text-gray-400">Sin paciente</span>}
                <div className="text-xs text-gray-400 mt-0.5">{g.rows.length} presupuesto{g.rows.length !== 1 ? 's' : ''}</div>
              </div>
              <div className="hidden md:flex items-center gap-6 text-xs">
                <div className="text-right"><div className="font-semibold text-gray-700">{money.format(g.totals.total)}</div><div className="text-gray-400">Total</div></div>
                <div className="text-right"><div className="font-semibold text-emerald-600">{money.format(g.totals.paid)}</div><div className="text-gray-400">Pagado</div></div>
                <div className="text-right"><div className={`font-semibold ${g.totals.balance > 0 ? 'text-rose-600' : 'text-gray-400'}`}>{money.format(g.totals.balance)}</div><div className="text-gray-400">Saldo</div></div>
              </div>
            </div>

            {/* Filas de presupuestos */}
            <div className="divide-y divide-gray-50">
              {g.rows.map(r => {
                const sm = STATUS_META[r.status ?? 'borrador'] ?? STATUS_META.borrador
                const balColor = r.balance > 1 ? 'text-rose-600' : r.balance < -1 ? 'text-amber-600' : 'text-emerald-600'
                return (
                  <div key={r.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-gray-50/80 transition group">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold text-gray-800">{r.folio ?? `QUO-${r.id.slice(0,8)}`}</span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${sm.cls}`}>{sm.label}</span>
                      </div>
                      <div className="text-xs text-gray-400 mt-0.5">
                        {new Date(r.dt).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </div>
                    </div>

                    {/* Montos */}
                    <div className="hidden sm:flex items-center gap-5 text-xs shrink-0">
                      <div className="text-right w-20"><div className="font-semibold text-gray-700">{money.format(r.total)}</div><div className="text-gray-400">Total</div></div>
                      <div className="text-right w-20"><div className="font-semibold text-emerald-600">{money.format(r.paid)}</div><div className="text-gray-400">Pagado</div></div>
                      <div className="text-right w-20"><div className={`font-semibold ${balColor}`}>{money.format(r.balance)}</div><div className="text-gray-400">Saldo</div></div>
                    </div>

                    {/* Acciones */}
                    <div className="flex items-center gap-1.5 shrink-0 opacity-60 group-hover:opacity-100 transition">
                      <Link href={`/quotes/${r.id}`}
                        className="px-2.5 py-1.5 rounded-lg text-xs font-medium bg-brand/10 text-brand hover:bg-brand/20 transition">
                        Abrir
                      </Link>
                      <Link href={`/quotes/${r.id}/print`}
                        className="px-2.5 py-1.5 rounded-lg text-xs font-medium border border-gray-200 text-gray-500 hover:bg-gray-50 transition">
                        🖨️
                      </Link>
                      {!isApproved(r.status) && r.status !== 'pagado' && r.status !== 'cancelado' && (
                        <button onClick={() => approveQuote(r.id)}
                          className="px-2.5 py-1.5 rounded-lg text-xs font-medium border border-emerald-200 text-emerald-700 hover:bg-emerald-50 transition">
                          ✓ Aprobar
                        </button>
                      )}
                      <button onClick={() => deleteQuote(r.id, r.folio ?? null)}
                        className="px-2.5 py-1.5 rounded-lg text-xs font-medium text-rose-500 hover:bg-rose-50 border border-rose-200 transition"
                        title="Eliminar presupuesto">
                        🗑️
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

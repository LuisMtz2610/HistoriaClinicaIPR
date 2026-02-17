'use client'

import React, { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

type Pat = { first_name: string; last_name: string } | null
type Row = { id: string; dt: string; folio?: string | null }
type Group = { patient_id: string | null; patient: Pat; rows: Row[] }

export default function ConsentsPage() {
  const [groups,  setGroups]  = useState<Group[]>([])
  const [loading, setLoading] = useState(true)
  const [search,  setSearch]  = useState('')

  const fmt = useMemo(() => new Intl.DateTimeFormat('es-MX', { dateStyle: 'short', timeStyle: 'short', timeZone: 'America/Mexico_City' }), [])

  async function load() {
    setLoading(true)
    const { data } = await supabase
      .from('consents')
      .select('id, signed_at, patient_id, folio_code, patients(first_name,last_name)')
      .order('signed_at', { ascending: false })

    const by = new Map<string | null, Group>()
    ;(data ?? []).forEach((r: any) => {
      const pid = r.patient_id ?? null
      if (!by.has(pid)) by.set(pid, { patient_id: pid, patient: r.patients ?? null, rows: [] })
      by.get(pid)!.rows.push({ id: r.id, dt: r.signed_at, folio: r.folio_code ?? null })
    })

    const gs = Array.from(by.values()).sort((a, b) => {
      const an = a.patient ? `${a.patient.last_name} ${a.patient.first_name}` : 'ZZZ'
      const bn = b.patient ? `${b.patient.last_name} ${b.patient.first_name}` : 'ZZZ'
      return an.localeCompare(bn, undefined, { sensitivity: 'base' })
    })
    setGroups(gs); setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function deleteConsent(id: string) {
    if (!confirm('¿Eliminar este consentimiento informado?')) return
    await supabase.from('consents').delete().eq('id', id)
    load()
  }

  const norm = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
  const filtered = groups.filter(g => {
    if (!search.trim()) return true
    return g.patient ? norm(`${g.patient.first_name} ${g.patient.last_name}`).includes(norm(search)) : false
  })
  const total = groups.reduce((a, g) => a + g.rows.length, 0)

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3 flex-wrap">
        <div>
          <h1 className="page-title">Consentimientos informados</h1>
          {!loading && <p className="text-xs text-gray-400 mt-0.5">{total} documento{total !== 1 ? 's' : ''} · {groups.length} paciente{groups.length !== 1 ? 's' : ''}</p>}
        </div>
        <Link href="/consents/new" className="btn ml-auto text-sm">+ Nuevo consentimiento</Link>
      </div>

      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
        <input className="input pl-9 text-sm" placeholder="Buscar paciente…" value={search} onChange={e => setSearch(e.target.value)} />
        {search && <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-lg">×</button>}
      </div>

      {loading && <div className="space-y-3 animate-pulse">{[1,2,3].map(i => <div key={i} className="h-20 rounded-2xl bg-gray-100"/>)}</div>}

      {!loading && filtered.length === 0 && (
        <div className="card p-12 text-center">
          <div className="text-5xl mb-3">📄</div>
          <div className="font-semibold text-gray-500">{search ? 'Sin resultados' : 'Sin consentimientos informados'}</div>
        </div>
      )}

      <div className="space-y-3">
        {filtered.map(g => (
          <div key={g.patient_id ?? 'sin'} className="card overflow-hidden">
            <div className="flex items-center gap-3 px-5 py-3.5 bg-gray-50/60 border-b border-gray-100">
              <div className="w-8 h-8 rounded-xl bg-brand/10 flex items-center justify-center font-bold text-brand text-xs shrink-0">
                {g.patient ? `${g.patient.first_name[0]}${g.patient.last_name[0]}` : '?'}
              </div>
              <div className="flex-1 min-w-0">
                {g.patient && g.patient_id
                  ? <Link href={`/pacientes/${g.patient_id}`} className="font-semibold text-gray-800 hover:text-brand transition">{g.patient.last_name}, {g.patient.first_name}</Link>
                  : <span className="font-semibold text-gray-400">Sin paciente</span>}
                <div className="text-xs text-gray-400">{g.rows.length} documento{g.rows.length !== 1 ? 's' : ''}</div>
              </div>
            </div>
            <div className="divide-y divide-gray-50">
              {g.rows.map(r => (
                <div key={r.id} className="flex items-center gap-4 px-5 py-3 group hover:bg-gray-50/60 transition">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-gray-800">{r.folio ?? `CON-${r.id.slice(0, 8)}`}</div>
                    <div className="text-xs text-gray-400">{fmt.format(new Date(r.dt))}</div>
                  </div>
                  <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition shrink-0">
                    <Link href={`/consents/${r.id}/print`}
                      className="px-2.5 py-1.5 rounded-lg text-xs font-medium bg-brand/10 text-brand hover:bg-brand/20 transition">
                      🖨️ Imprimir
                    </Link>
                    <button onClick={() => deleteConsent(r.id)}
                      className="px-2.5 py-1.5 rounded-lg text-xs font-medium text-rose-500 hover:bg-rose-50 border border-rose-200 transition">
                      ✕
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

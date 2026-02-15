'use client'

import useSWR from 'swr'
import Link from 'next/link'
import { useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { fmtDateDDMMYYYY } from '@/lib/date'

const norm = (s: string | null | undefined) =>
  (s ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()

function age(birth?: string | null) {
  if (!birth) return null
  const [y, m, d] = birth.split('-').map(Number)
  const t = new Date()
  let a = t.getFullYear() - y
  if (t.getMonth() + 1 < m || (t.getMonth() + 1 === m && t.getDate() < d)) a--
  return a
}

const fetcher = async () => {
  const { data, error } = await supabase
    .from('patients').select('*').order('last_name', { ascending: true })
  if (error) throw error
  return data as any[]
}

export default function PatientsPage() {
  const { data, error, isLoading } = useSWR('patients', fetcher)
  const [q, setQ] = useState('')

  const filtered = useMemo(() => {
    const nq = norm(q)
    const rows = data ?? []
    if (!nq) return rows
    return rows.filter((p: any) =>
      norm(`${p.first_name} ${p.last_name}`).includes(nq) ||
      norm(p.phone ?? '').includes(nq) ||
      norm(p.email ?? '').includes(nq)
    )
  }, [data, q])

  return (
    <div className="space-y-4">

      {/* Encabezado */}
      <div className="flex items-center gap-3">
        <div>
          <h1 className="page-title">Pacientes</h1>
          {!isLoading && (
            <p className="text-sm text-gray-400 mt-0.5">
              {filtered.length} {filtered.length === 1 ? 'paciente' : 'pacientes'}
              {q && ` encontrados para "${q}"`}
            </p>
          )}
        </div>
        <Link href="/pacientes/new" className="btn ml-auto">+ Nuevo</Link>
      </div>

      {/* Búsqueda */}
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">🔍</span>
        <input
          className="input pl-9"
          placeholder="Buscar por nombre, teléfono o email…"
          value={q}
          onChange={e => setQ(e.target.value)}
          autoComplete="off"
        />
        {q && (
          <button
            onClick={() => setQ('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-lg leading-none"
          >
            ×
          </button>
        )}
      </div>

      {/* Estados */}
      {isLoading && (
        <div className="space-y-2 animate-pulse">
          {[...Array(5)].map((_, i) => <div key={i} className="h-16 rounded-2xl bg-gray-100" />)}
        </div>
      )}
      {error && <div className="card p-4 text-red-600">Error: {String(error.message || error)}</div>}

      {/* Lista */}
      {!isLoading && (
        <div className="space-y-2">
          {filtered.map((p: any) => {
            const a = age(p.birth_date)
            const hasAlert = p.allergies_summary || p.allergies
            return (
              <Link
                key={p.id}
                href={`/pacientes/${p.id}`}
                className="card p-4 flex items-center gap-4 hover:shadow-md hover:border-brand transition group block"
              >
                {/* Avatar */}
                <div className="shrink-0 w-11 h-11 rounded-xl bg-brand/10 flex items-center justify-center text-brand font-bold text-sm select-none">
                  {p.first_name?.[0]}{p.last_name?.[0]}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-gray-800 group-hover:text-brand-dark transition">
                      {p.last_name}, {p.first_name}
                    </span>
                    {a !== null && (
                      <span className="text-xs text-gray-400 bg-gray-100 rounded-full px-2 py-0.5">
                        {a} años
                      </span>
                    )}
                    {hasAlert && (
                      <span className="text-xs bg-amber-50 text-amber-700 border border-amber-200 rounded-full px-2 py-0.5">
                        ⚠️ Alergias
                      </span>
                    )}
                  </div>
                  <div className="mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-gray-400">
                    {p.phone && <span>📞 {p.phone}</span>}
                    {p.email && <span>✉️ {p.email}</span>}
                    {p.occupation && <span>💼 {p.occupation}</span>}
                  </div>
                </div>

                {/* Flecha */}
                <span className="text-gray-300 group-hover:text-brand transition text-xl shrink-0">›</span>
              </Link>
            )
          })}

          {!isLoading && filtered.length === 0 && (
            <div className="text-center py-12 text-gray-400">
              <div className="text-4xl mb-2">🔍</div>
              <div className="text-sm">
                {q ? `Sin resultados para "${q}"` : 'No hay pacientes registrados'}
              </div>
              {!q && (
                <Link href="/pacientes/new" className="btn mt-4 inline-flex">
                  Registrar primer paciente
                </Link>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

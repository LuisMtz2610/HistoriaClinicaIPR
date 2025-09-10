'use client'

import useSWR from 'swr'
import Link from 'next/link'
import { useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { fmtDateDDMMYYYY } from '@/lib/date'

// Normaliza para búsqueda: sin acentos y en minúsculas
const norm = (s: string | null | undefined) =>
  (s ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()

const fetcher = async () => {
  const { data, error } = await supabase
    .from('patients')
    .select('*')
    .order('last_name', { ascending: true })
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
      norm(`${p.first_name} ${p.last_name}`).includes(nq)
    )
  }, [data, q])

  return (
    <div className="space-y-4">
      {/* Encabezado con botón Nuevo */}
      <div className="flex items-center gap-3">
        <h1 className="page-title">Pacientes</h1>
        <Link href="/pacientes/new" className="btn ml-auto">
          Nuevo
        </Link>
      </div>

      {/* Búsqueda */}
      <input
        className="input"
        placeholder="Buscar por nombre..."
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />

      {isLoading && <div>Cargando…</div>}
      {error && (
        <div className="text-red-600">
          Error: {String((error as any).message || error)}
        </div>
      )}

      {/* Listado */}
      <div className="grid gap-3 md:grid-cols-2">
        {filtered.map((p: any) => (
          <div key={p.id} className="card p-4">
            <div className="font-semibold text-brand-dark text-lg">
              {p.last_name}, {p.first_name}
            </div>

            <div className="mt-1 text-sm text-gray-600 space-y-1">
              {p.birth_date && (
                <div>
                  <span className="font-medium">Nacimiento:</span>{' '}
                  {/* SIN new Date: evita restar 1 día */}
                  {fmtDateDDMMYYYY(p.birth_date)}
                </div>
              )}

              {(p.phone || p.email) && (
                <div>
                  <span className="font-medium">Contacto:</span>{' '}
                  {p.phone || '—'}
                  {p.email ? ` · ${p.email}` : ''}
                </div>
              )}

              {p.allergies && (
                <div>
                  <span className="font-medium">Alergias:</span> {p.allergies}
                </div>
              )}

              {p.medical_history && (
                <div className="line-clamp-2">
                  <span className="font-medium">Antecedentes:</span>{' '}
                  {p.medical_history}
                </div>
              )}
            </div>

            {/* Acciones por paciente */}
            <div className="mt-3 flex gap-2">
              <Link href={`/pacientes/${p.id}`} className="btn">
                Abrir ficha
              </Link>
              <Link href={`/pacientes/${p.id}/historia`} className="btn bg-brand-light">
                Historia clínica
              </Link>
            </div>
          </div>
        ))}

        {!isLoading && filtered.length === 0 && <div>No hay resultados.</div>}
      </div>
    </div>
  )
}

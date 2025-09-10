'use client'

import * as React from 'react'
import useSWR from 'swr'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

type Row = {
  id: string
  patient_id: string
  created_at: string
  presumptive_dx: string | null
  folio: string | null
  doctor_name: string | null
  doctor_license: string | null
  patients?: { first_name: string; last_name: string } | { first_name: string; last_name: string }[] | null
}

const fetcher = async (): Promise<Row[]> => {
  const { data, error } = await supabase
    .from('lab_orders')
    .select('id, patient_id, created_at, presumptive_dx, folio, doctor_name, doctor_license, patients(first_name,last_name)')
    .order('created_at', { ascending: true })
  if (error) throw error
  return (data || []) as Row[]
}

// Folio visible con prefijo y padding
const fmt = (n: number, prefix = '') => `${prefix}${String(n).padStart(4, '0')}`

// Normaliza patients a objeto (si viene arreglo, toma el primero)
function normalizePatient(p: Row['patients']) {
  if (!p) return null
  if (Array.isArray(p)) return p[0] ?? null
  return p
}

export default function LabOrdersPage() {
  const q = useSWR('lab_orders', fetcher)

  if (q.error) return <div className="text-red-600">Error: {String((q.error as any).message || q.error)}</div>
  if (!q.data) return <div>Cargando…</div>

  const rows = q.data ?? []
  const total = rows.length

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <h1 className="page-title">Solicitudes de Laboratorio</h1>
        <Link href="/lab-orders/new" className="btn ml-auto">Nueva</Link>
      </div>

      <div className="card p-4 overflow-x-auto">
        <table className="w-full border text-sm">
          <thead>
            <tr className="bg-neutral-100">
              <th className="border px-2 py-1">Folio</th>
              <th className="border px-2 py-1">Fecha</th>
              <th className="border px-2 py-1 text-left">Paciente</th>
              <th className="border px-2 py-1 text-left">Diagnóstico presuntivo</th>
              <th className="border px-2 py-1">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => {
              const p = normalizePatient(r.patients)
              const folioVisible = fmt(total - i, 'LAB-')
              return (
                <tr key={r.id}>
                  <td className="border px-2 py-1">{folioVisible}</td>
                  <td className="border px-2 py-1">{new Date(r.created_at).toLocaleDateString()}</td>
                  <td className="border px-2 py-1">
                    <Link href={`/pacientes/${r.patient_id}`} className="text-blue-600 hover:underline">
                      {p ? `${p.last_name}, ${p.first_name}` : '—'}
                    </Link>
                  </td>
                  <td className="border px-2 py-1">{r.presumptive_dx || '—'}</td>
                  <td className="border px-2 py-1 text-center">
                    <Link href={`/lab-orders/${r.id}`} className="text-emerald-700 hover:underline">Abrir</Link>
                  </td>
                </tr>
              )
            })}
            {rows.length === 0 && (
              <tr>
                <td className="border px-2 py-6 text-center text-neutral-600" colSpan={5}>
                  No hay solicitudes.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

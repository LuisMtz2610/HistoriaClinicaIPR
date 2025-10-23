'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import PrintActionsCell from '@/components/PrintActionsCell'

type PatientLite = { first_name: string; last_name: string } | null

type Row = {
  patient_id?: string | null;
  id: string
  created_at: string
  patient: PatientLite
}

export default function PrescriptionsIndex() {
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    (async () => {
      setLoading(true)
      setErr(null)
      const { data, error } = await supabase
        .from('prescriptions')
        .select('id, created_at, patient_id, patients(first_name,last_name)')
        .order('created_at', { ascending: false })
        .limit(200)
      if (error) { setErr(error.message); setLoading(false); return }
      const mapped: Row[] = (data as any)?.map((r: any) => ({
        id: r.id, created_at: r.created_at, patient: r.patients ?? null, patient_id: (r as any).patient_id ?? null
      })) ?? []
      setRows(mapped)
      setLoading(false)
    })()
  }, [])

  return (
    <main className="container mx-auto px-4 py-6">
      <div className="flex items-center gap-3">
        <h1 className="page-title">Recetas</h1>
        <Link href="/prescriptions/new" className="btn ml-auto">Nueva</Link>
      </div>

      {err && <div className="p-3 rounded-md bg-red-50 text-red-700">{err}</div>}
      {loading ? (
        <div>Cargando…</div>
      ) : (
        <div className="overflow-x-auto rounded-xl border bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left border-b bg-gray-50">
                <th className="p-2">Paciente</th>
                <th className="p-2">Fecha</th>
                <th className="p-2">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr><td className="p-3 text-gray-500" colSpan={3}>Sin registros</td></tr>
              )}
              {rows.map(r => (
                <tr key={r.id} className="border-b">
                  <td className="p-2">{r.patient && r.patient_id ? (
                <Link href={`/pacientes/${r.patient_id}`} className="text-blue-600 hover:underline">
                  {`${r.patient.last_name}, ${r.patient.first_name}`}
                </Link>
              ) : (r.patient ? `${r.patient.last_name}, ${r.patient.first_name}` : '—')}</td>
                  <td className="p-2">{new Date(r.created_at).toLocaleString()}</td>
                  <td className="p-2 whitespace-nowrap">
                    <PrintActionsCell module="prescriptions" id={r.id} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  )
}

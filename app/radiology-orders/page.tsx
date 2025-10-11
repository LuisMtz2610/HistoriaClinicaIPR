'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import PrintActionsCell from '@/components/PrintActionsCell'

type PatientLite = { first_name: string; last_name: string } | null

type Row = {
  id: string
  created_at: string
  patient: PatientLite
}

export default function RadiologyOrdersIndex() {
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    (async () => {
      setLoading(true)
      setErr(null)
      const { data, error } = await supabase
        .from('radiology_orders')
        .select('id, created_at, patients(first_name,last_name)')
        .order('created_at', { ascending: false })
        .limit(200)
      if (error) { setErr(error.message); setLoading(false); return }
      const mapped: Row[] = (data as any)?.map((r: any) => ({
        id: r.id, created_at: r.created_at, patient: r.patients ?? null
      })) ?? []
      setRows(mapped)
      setLoading(false)
    })()
  }, [])

  return (
    <main className="container mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-semibold">Solicitudes de RX</h1>
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
                  <td className="p-2">{r.patient ? `${r.patient.last_name}, ${r.patient.first_name}` : '—'}</td>
                  <td className="p-2">{new Date(r.created_at).toLocaleString()}</td>
                  <td className="p-2 whitespace-nowrap">
                    <PrintActionsCell module="radiology-orders" id={r.id} />
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

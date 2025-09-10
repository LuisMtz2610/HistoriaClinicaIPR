// app/quotes/page.tsx
'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

type PatientLite = { first_name: string; last_name: string } | null

type Row = {
  id: string
  created_at: string
  total: number | null
  patient: PatientLite
  total_paid: number
  balance: number
}

export default function QuotesIndex() {
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    (async () => {
      setLoading(true)
      setErr(null)

      // Intento 1: traer pagos anidados usando la relación (quotes -> quote_payments)
      const { data, error } = await supabase
        .from('quotes')
        .select(`
          id,
          created_at,
          total,
          patients(first_name,last_name),
          quote_payments(amount)
        `)
        .order('created_at', { ascending: false })
        .limit(200)

      if (error) {
        setErr(error.message)
        setLoading(false)
        return
      }

      // Si RLS/relaciones no devuelven la colección, nos aseguramos de que al menos sea array
      const mapped: Row[] = (data as any)?.map((q: any) => {
        const payments: Array<{ amount: number }> = Array.isArray(q.quote_payments)
          ? q.quote_payments
          : []

        const paid = payments.reduce((sum, p) => sum + Number(p?.amount || 0), 0)
        const total = Number(q.total || 0)
        return {
          id: q.id,
          created_at: q.created_at,
          total,
          patient: q.patients ?? null,
          total_paid: paid,
          balance: Math.max(0, total - paid),
        }
      }) ?? []

      setRows(mapped)
      setLoading(false)
    })()
  }, [])

  const fmt = (n: number | null | undefined) => `$${Number(n || 0).toFixed(2)}`

  return (
    <main className="container mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-semibold">Presupuestos</h1>
        <Link href="/quotes/new" className="px-4 py-2 rounded-xl bg-emerald-600 text-white">
          Nuevo presupuesto
        </Link>
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
                <th className="p-2">Total</th>
                <th className="p-2">Pagado</th>
                <th className="p-2">Saldo pendiente</th>
                <th className="p-2">Fecha</th>
                <th className="p-2">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr><td className="p-3 text-gray-500" colSpan={6}>Sin presupuestos</td></tr>
              )}
              {rows.map(r => (
                <tr key={r.id} className="border-b">
                  <td className="p-2">{r.patient ? `${r.patient.last_name}, ${r.patient.first_name}` : '—'}</td>
                  <td className="p-2">{fmt(r.total)}</td>
                  <td className="p-2">{fmt(r.total_paid)}</td>
                  <td className={"p-2 " + ((r.balance || 0) > 0 ? "text-red-600" : "text-emerald-700")}>
                    {fmt(r.balance)}
                  </td>
                  <td className="p-2">{new Date(r.created_at).toLocaleString()}</td>
                  <td className="p-2 whitespace-nowrap">
                    <Link href={`/quotes/${r.id}`} className="text-emerald-700 hover:underline mr-2">Abrir</Link>
                    <Link href={`/quotes/${r.id}/print`} className="text-gray-700 hover:underline">Imprimir</Link>
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

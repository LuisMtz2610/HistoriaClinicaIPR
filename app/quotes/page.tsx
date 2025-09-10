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
  total_paid?: number
  balance?: number
}

export default function QuotesIndex() {
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    (async () => {
      setLoading(true)
      setErr(null)
      // 1) Trae presupuestos con el paciente
      const { data: quotes, error } = await supabase
        .from('quotes')
        .select('id, created_at, total, patients(first_name,last_name)')
        .order('created_at', { ascending: false })
        .limit(200)

      if (error) { setErr(error.message); setLoading(false); return }

      const mapped: Row[] = (quotes as any)?.map((q: any) => ({
        id: q.id,
        created_at: q.created_at,
        total: q.total,
        patient: q.patients ?? null,
      })) ?? []

      // 2) Sumar pagos por presupuesto. Intentamos primero con 'quote_payments' (nombre más común),
      //    y si no existe, caemos a 'payments' (como versión anterior).
      let paidByQuote: Record<string, number> = {}
      const ids = mapped.map(m => m.id)

      async function sumFrom(table: string) {
        const { data, error } = await supabase
          .from(table)
          .select('quote_id, amount, monto')
          .in('quote_id', ids)
        if (!error && data) {
          for (const p of data as any[]) {
            const qid = p.quote_id
            const amt = Number(p.amount ?? p.monto ?? 0) || 0
            paidByQuote[qid] = (paidByQuote[qid] || 0) + amt
          }
          return true
        }
        return false
      }

      try {
        if (ids.length > 0) {
          const ok = await sumFrom('quote_payments')
          if (!ok) {
            await sumFrom('payments')
          }
        }
      } catch (_) {
        // Si ambas tablas no existen o no hay relación, ignoramos y mostramos saldo = total
      }

      const withMoney = mapped.map(m => {
        const paid = Number(paidByQuote[m.id] || 0)
        const total = Number(m.total || 0)
        return {
          ...m,
          total_paid: paid,
          balance: Math.max(0, total - paid),
        }
      })

      setRows(withMoney)
      setLoading(false)
    })()
  }, [])

  const fmt = (n: number | null | undefined) =>
    `$${Number(n || 0).toFixed(2)}`

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

// app/quotes/[id]/page.tsx
'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'
import ShareWhatsAppButtonKit from '@/components/kit/ShareWhatsAppButtonKit'
import SignaturePadKit from '@/components/kit/SignaturePadKit'

type Quote = {
  id: string
  patient_id: string
  discount: number | null
  tax: number | null
  subtotal: number | null
  total: number | null
  terms: string | null
  notes: string | null
  signature_path: string | null
}

type Item = {
  id: string
  quote_id: string
  description: string
  quantity: number
  unit_price: number
  line_total: number
  notes: string | null
}

type Payment = {
  id: string
  quote_id: string
  paid_at: string
  method: 'efectivo' | 'transferencia' | 'tarjeta' | 'otros'
  amount: number
  reference: string | null
  notes: string | null
}

export default function QuoteDetail({ params }: { params: { id: string } }) {
  const { id } = params

  // Estado
  const [q, setQ] = useState<Quote | null>(null)
  const [patientName, setPatientName] = useState<string>('')
  const [items, setItems] = useState<Item[]>([])
  const [payments, setPayments] = useState<Payment[]>([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)

  // Carga inicial
  useEffect(() => {
    let active = true
    async function load() {
      setLoading(true)
      setErr(null)

      // Presupuesto
      const qRes = await supabase.from('quotes').select('*').eq('id', id).single()
      if (qRes.error) { setErr(qRes.error.message); setLoading(false); return }
      if (!active) return
      setQ(qRes.data as any)

      // Paciente
      const pn = await supabase.from('patients').select('first_name,last_name').eq('id', qRes.data.patient_id).single()
      if (!pn.error && pn.data) setPatientName(`${pn.data.last_name}, ${pn.data.first_name}`)

      // Partidas
      const iRes = await supabase.from('quote_items').select('*').eq('quote_id', id).order('id')
      if (!iRes.error) setItems((iRes.data as any) || [])

      // Pagos
      await reloadPayments()

      setLoading(false)
    }
    load()
    return () => { active = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  // Helpers de totales
  const itemsSubtotal = useMemo(
    () => items.reduce((s, it) => s + Number(it.line_total || 0), 0),
    [items]
  )
  const discount = Number(q?.discount || 0)
  const tax = Number(q?.tax || 0)
  const computedTotal = itemsSubtotal - discount + tax
  const paidAmount = payments.reduce((s, p) => s + Number(p.amount || 0), 0)
  const balance = computedTotal - paidAmount

  // -------- Partidas --------
  async function addItem(e: React.FormEvent) {
    e.preventDefault()
    const f = e.target as any
    const description = f.description.value.trim()
    const quantity = Number(f.quantity.value || 1)
    const unit_price = Number(f.unit_price.value || 0)
    if (!description) return

    const { error } = await supabase
      .from('quote_items')
      .insert({ quote_id: id, description, quantity, unit_price })

    if (error) { alert(error.message); return }
    f.reset()

    const iRes = await supabase.from('quote_items').select('*').eq('quote_id', id).order('id')
    setItems((iRes.data as any) || [])

    // Sin .catch(): usar try/catch
    try {
      const { error: rpcError } = await supabase.rpc('sync_quote_totals')
      if (rpcError) console.warn('sync_quote_totals:', rpcError.message)
    } catch {
      // silencioso
    }
  }

  async function removeItem(itemId: string) {
    if (!confirm('¿Eliminar este servicio?')) return
    const { error } = await supabase.from('quote_items').delete().eq('id', itemId)
    if (error) { alert(error.message); return }
    const iRes = await supabase.from('quote_items').select('*').eq('quote_id', id).order('id')
    setItems((iRes.data as any) || [])

    try {
      const { error: rpcError } = await supabase.rpc('sync_quote_totals')
      if (rpcError) console.warn('sync_quote_totals:', rpcError.message)
    } catch {
      // silencioso
    }
  }

  // -------- Encabezado (totales, términos/notas) --------
  async function saveHeader(e: React.FormEvent) {
    e.preventDefault()
    if (!q) return
    const f = e.target as any
    const updates = {
      discount: Number(f.discount.value || 0),
      tax: Number(f.tax.value || 0),
      terms: f.terms.value,
      notes: f.notes.value,
      subtotal: itemsSubtotal,
      total: itemsSubtotal - Number(f.discount.value || 0) + Number(f.tax.value || 0),
    }
    const { error } = await supabase.from('quotes').update(updates).eq('id', q.id)
    if (error) alert(error.message); else alert('Presupuesto guardado')
  }

  // -------- Pagos --------
  async function reloadPayments() {
    const { data, error } = await supabase
      .from('quote_payments')
      .select('*')
      .eq('quote_id', id)
      .order('paid_at', { ascending: false })
    if (!error) setPayments((data as any) || [])
  }

  async function addPayment(e: React.FormEvent) {
    e.preventDefault()
    const f = e.target as any
    const paid_at = f.paid_at.value ? new Date(f.paid_at.value).toISOString() : new Date().toISOString()
    const method = f.method.value as Payment['method']
    const amount = Number(f.amount.value || 0)
    const reference = f.reference.value || null
    const notes = f.notes.value || null

    if (!amount || amount <= 0) { alert('Monto inválido'); return }

    const { error } = await supabase
      .from('quote_payments')
      .insert({ quote_id: id, paid_at, method, amount, reference, notes })

    if (error) { alert(error.message); return }
    f.reset()
    await reloadPayments()
  }

  async function removePayment(paymentId: string) {
    if (!confirm('¿Eliminar este pago?')) return
    const { error } = await supabase.from('quote_payments').delete().eq('id', paymentId)
    if (error) { alert(error.message); return }
    await reloadPayments()
  }

  const fDate = (iso: string) => new Date(iso).toLocaleString()

  // -------- Render --------
  if (loading) return <div className="p-4">Cargando…</div>
  if (err) return <div className="p-4 text-red-600">Error: {err}</div>
  if (!q) return <div className="p-4">No encontrado</div>

  return (
    <main className="container mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Presupuesto</h1>
          <p className="text-sm text-gray-600">Paciente: {patientName || q.patient_id}</p>
        </div>
        <div className="flex items-center gap-2">
          <button form="quote-header-form" className="px-3 py-2 rounded-xl bg-emerald-600 text-white">
            Guardar presupuesto
          </button>
          <Link href={`/quotes/${q.id}/print`} className="px-3 py-2 rounded-xl bg-gray-800 text-white">Imprimir</Link>
          <ShareWhatsAppButtonKit quoteId={q.id} />
        </div>
      </div>

      {/* Encabezado / Totales */}
      <form id="quote-header-form" onSubmit={saveHeader} className="bg-white rounded-2xl shadow p-5 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <label className="block">
            <span className="text-sm text-gray-600">Descuento (MXN)</span>
            <input name="discount" defaultValue={q.discount || 0} type="number" step="0.01" className="mt-1 w-full border rounded-xl px-3 py-2" />
          </label>
          <label className="block">
            <span className="text-sm text-gray-600">Impuestos (MXN)</span>
            <input name="tax" defaultValue={q.tax || 0} type="number" step="0.01" className="mt-1 w-full border rounded-xl px-3 py-2" />
          </label>
          <div className="md:col-span-2 grid grid-cols-2 gap-3">
            <div>
              <span className="text-sm text-gray-600">Subtotal</span>
              <div className="mt-1 px-3 py-2 border rounded-xl bg-gray-50">${itemsSubtotal.toFixed(2)}</div>
            </div>
            <div>
              <span className="text-sm text-gray-600">Total</span>
              <div className="mt-1 px-3 py-2 border rounded-xl bg-gray-50">${(itemsSubtotal - discount + tax).toFixed(2)}</div>
            </div>
          </div>
        </div>
        <label className="block">
          <span className="text-sm text-gray-600">Términos / Condiciones</span>
          <textarea name="terms" defaultValue={q.terms || ''} className="mt-1 w-full border rounded-xl px-3 py-2" rows={3}/>
        </label>
        <label className="block">
          <span className="text-sm text-gray-600">Notas</span>
          <textarea name="notes" defaultValue={q.notes || ''} className="mt-1 w-full border rounded-xl px-3 py-2" rows={2}/>
        </label>
        <button className="px-4 py-2 rounded-xl bg-emerald-600 text-white">Guardar encabezado</button>
      </form>

      {/* Servicios */}
      <section className="bg-white rounded-2xl shadow p-5 space-y-4">
        <h3 className="text-base font-semibold">Servicios</h3>
        <form onSubmit={addItem} className="grid grid-cols-1 md:grid-cols-12 gap-3">
          <input name="description" placeholder="Servicio / concepto" className="md:col-span-6 border rounded-xl px-3 py-2" />
          <input name="quantity" type="number" step="0.01" defaultValue={1} className="md:col-span-2 border rounded-xl px-3 py-2" />
          <input name="unit_price" type="number" step="0.01" defaultValue={0} className="md:col-span-2 border rounded-xl px-3 py-2" />
          <button className="md:col-span-2 px-4 py-2 rounded-xl bg-emerald-600 text-white">Agregar</button>
        </form>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left border-b">
                <th className="p-2">Servicio</th>
                <th className="p-2">Cantidad</th>
                <th className="p-2">Unitario</th>
                <th className="p-2">Total</th>
                <th className="p-2">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {items.map(it => (
                <tr key={it.id} className="border-b">
                  <td className="p-2">{it.description}</td>
                  <td className="p-2">{Number(it.quantity).toFixed(2)}</td>
                  <td className="p-2">${Number(it.unit_price).toFixed(2)}</td>
                  <td className="p-2">${Number(it.line_total).toFixed(2)}</td>
                  <td className="p-2">
                    <button onClick={() => removeItem(it.id)} className="text-red-600 hover:underline">Eliminar</button>
                  </td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr><td className="p-4 text-gray-500" colSpan={5}>Sin partidas</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Pagos (con historial) */}
      <section className="bg-white rounded-2xl shadow p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold">Pagos</h3>
          <div className="text-sm text-gray-700">
            <span className="mr-4">Pagado: <b>${paidAmount.toFixed(2)}</b></span>
            <span>Saldo: <b>${balance.toFixed(2)}</b></span>
          </div>
        </div>

        {/* Formulario de pago */}
        <form onSubmit={addPayment} className="grid grid-cols-1 md:grid-cols-12 gap-3">
          <input
            name="paid_at"
            type="datetime-local"
            className="md:col-span-3 border rounded-xl px-3 py-2"
            defaultValue={new Date().toISOString().slice(0, 16)} // yyyy-MM-ddTHH:mm
          />
          <select name="method" className="md:col-span-2 border rounded-xl px-3 py-2" defaultValue="efectivo">
            <option value="efectivo">Efectivo</option>
            <option value="transferencia">Transferencia</option>
            <option value="tarjeta">Tarjeta</option>
            <option value="otros">Otros</option>
          </select>
          <input name="amount" type="number" step="0.01" placeholder="Monto" className="md:col-span-2 border rounded-xl px-3 py-2" />
          <input name="reference" placeholder="Referencia" className="md:col-span-2 border rounded-xl px-3 py-2" />
          <input name="notes" placeholder="Notas" className="md:col-span-2 border rounded-xl px-3 py-2" />
          <button className="md:col-span-1 px-4 py-2 rounded-xl bg-emerald-600 text-white">Agregar</button>
        </form>

        {/* Historial */}
        <div className="overflow-x-auto rounded-xl border">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left border-b bg-gray-50">
                <th className="p-2">Fecha</th>
                <th className="p-2">Método</th>
                <th className="p-2">Monto</th>
                <th className="p-2">Referencia</th>
                <th className="p-2">Notas</th>
                <th className="p-2">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {payments.map(p => (
                <tr key={p.id} className="border-b">
                  <td className="p-2">{fDate(p.paid_at)}</td>
                  <td className="p-2 capitalize">{p.method}</td>
                  <td className="p-2">${Number(p.amount).toFixed(2)}</td>
                  <td className="p-2">{p.reference || '—'}</td>
                  <td className="p-2">{p.notes || '—'}</td>
                  <td className="p-2">
                    <button onClick={() => removePayment(p.id)} className="text-red-600 hover:underline">Eliminar</button>
                  </td>
                </tr>
              ))}
              {payments.length === 0 && (
                <tr><td className="p-3 text-gray-500" colSpan={6}>Sin pagos</td></tr>
              )}
            </tbody>
            {payments.length > 0 && (
              <tfoot>
                <tr className="bg-gray-50">
                  <td className="p-2 font-semibold" colSpan={2}>Total pagado</td>
                  <td className="p-2 font-semibold">${paidAmount.toFixed(2)}</td>
                  <td className="p-2" colSpan={3}></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </section>

      {/* Firma */}
      <section className="bg-white rounded-2xl shadow p-5">
        <h3 className="text-base font-semibold mb-2">Firma de aceptación</h3>
        <SignaturePadKit patientId={q.patient_id} consentId={`quote-${q.id}`} />
      </section>
    </main>
  )
}

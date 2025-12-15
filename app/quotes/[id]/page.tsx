// app/quotes/[id]/page.tsx
'use client'

import Link from 'next/link'
import { useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'
import ShareWhatsAppButtonKit from '@/components/kit/ShareWhatsAppButtonKit'
import SignaturePadKit from '@/components/kit/SignaturePadKit'

type QuoteStatus = 'borrador' | 'aprobado' | string

type Quote = {
  id: string
  patient_id: string
  status: QuoteStatus
  created_at?: string | null
  valid_until?: string | null // YYYY-MM-DD
  discount: number | null
  tax: number | null
  subtotal: number | null
  total: number | null
  terms: string | null
  notes: string | null
  signature_path: string | null
  folio_code?: string | null
}

type Item = {
  id: string
  quote_id: string
  service_code?: string | null
  description: string
  quantity: number
  unit_price: number
  discount?: number | null
  line_total?: number | null
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

type Suggestion = {
  key: string
  source: 'catalog' | 'history'
  id?: string
  name: string
  unit_price: number
}

function formatDateTimeMX(iso: string | null | undefined) {
  if (!iso) return '—'
  try {
    return new Intl.DateTimeFormat('es-MX', {
      dateStyle: 'short',
      timeStyle: 'short',
      timeZone: 'America/Mexico_City',
    }).format(new Date(iso))
  } catch {
    return new Date(iso).toLocaleString()
  }
}

function formatDateOnlyMX(ymd: string | null | undefined) {
  if (!ymd) return '—'
  // IMPORTANT: no usar new Date('YYYY-MM-DD') porque aplica UTC y puede restar un día.
  const [y, m, d] = ymd.split('-').map((x) => Number(x))
  if (!y || !m || !d) return ymd
  const dd = String(d).padStart(2, '0')
  const mm = String(m).padStart(2, '0')
  return `${dd}/${mm}/${y}`
}

function toDateTimeLocalValue(d: Date) {
  const pad = (n: number) => String(n).padStart(2, '0')
  const yyyy = d.getFullYear()
  const MM = pad(d.getMonth() + 1)
  const dd = pad(d.getDate())
  const hh = pad(d.getHours())
  const mm = pad(d.getMinutes())
  return `${yyyy}-${MM}-${dd}T${hh}:${mm}`
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

  // Autocomplete / Alta de servicios
  const [svcQuery, setSvcQuery] = useState('')
  const [addQty, setAddQty] = useState<number>(1)
  const [addUnit, setAddUnit] = useState<number>(0)
  const [addDiscount, setAddDiscount] = useState<number>(0)
  const [showSuggest, setShowSuggest] = useState(false)
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [selectedServiceId, setSelectedServiceId] = useState<string | null>(null)
  const suggestRef = useRef<HTMLDivElement | null>(null)

  // Edición de partida
  const [editingId, setEditingId] = useState<string | null>(null)
  const [edDesc, setEdDesc] = useState('')
  const [edQty, setEdQty] = useState<number>(1)
  const [edUnit, setEdUnit] = useState<number>(0)
  const [edDiscount, setEdDiscount] = useState<number>(0)
  const [edServiceId, setEdServiceId] = useState<string | null>(null)

  const money = useMemo(() => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }), [])

  // Carga inicial
  useEffect(() => {
    let active = true
    async function load() {
      setLoading(true)
      setErr(null)

      // Presupuesto
      const qRes = await supabase
        .from('quotes')
        .select('id, patient_id, status, created_at, valid_until, discount, tax, subtotal, total, terms, notes, signature_path, folio_code')
        .eq('id', id)
        .single()

      if (qRes.error) {
        setErr(qRes.error.message)
        setLoading(false)
        return
      }
      if (!active) return
      setQ(qRes.data as any)

      // Paciente
      const pn = await supabase
        .from('patients')
        .select('first_name,last_name')
        .eq('id', (qRes.data as any).patient_id)
        .single()
      if (!pn.error && pn.data) setPatientName(`${pn.data.last_name}, ${pn.data.first_name}`)

      // Partidas
      await reloadItems()

      // Pagos
      await reloadPayments()

      setLoading(false)
    }

    load()
    return () => {
      active = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  async function reloadItems() {
    const iRes = await supabase.from('quote_items').select('*').eq('quote_id', id).order('id')
    if (!iRes.error) setItems((iRes.data as any) || [])
  }

  async function reloadPayments() {
    const { data, error } = await supabase
      .from('quote_payments')
      .select('*')
      .eq('quote_id', id)
      .order('paid_at', { ascending: false })
    if (!error) setPayments((data as any) || [])
  }

  // Helpers de totales
  const itemsSubtotal = useMemo(() => {
    // NO confiar en quote_items.line_total (puede estar desfasado). Calculamos con qty*unit - discount.
    return items.reduce((s, it) => {
      const qty = Number(it.quantity || 0)
      const unit = Number(it.unit_price || 0)
      const dsc = Number(it.discount ?? 0)
      const line = Math.max(0, qty * unit - dsc)
      return s + (isFinite(line) ? line : 0)
    }, 0)
  }, [items])

  const headerDiscount = Number(q?.discount || 0)
  const tax = Number(q?.tax || 0)
  const computedTotal = itemsSubtotal - headerDiscount + tax
  const paidAmount = payments.reduce((s, p) => s + Number(p.amount || 0), 0)
  const balance = computedTotal - paidAmount

  // Click afuera del autocomplete
  useEffect(() => {
    function onDown(e: MouseEvent) {
      const el = suggestRef.current
      if (!el) return
      if (!el.contains(e.target as Node)) setShowSuggest(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [])

  // Buscar sugerencias (Opción A: catálogo primero + histórico)
  useEffect(() => {
    const qv = svcQuery.trim()
    if (!qv) {
      setSuggestions([])
      setShowSuggest(false)
      setSelectedServiceId(null)
      return
    }

    const t = setTimeout(async () => {
      try {
        const [cat, hist] = await Promise.all([
          supabase
            .from('services_catalog')
            .select('id, name, unit_price')
            .ilike('name', `%${qv}%`)
            .order('name')
            .limit(8),
          supabase
            .from('quote_items')
            .select('description, unit_price')
            .ilike('description', `%${qv}%`)
            .order('description')
            .limit(8),
        ])

        const out: Suggestion[] = []
        const seen = new Set<string>()

        if (!cat.error) {
          for (const r of (cat.data as any[]) || []) {
            const name = String(r.name || '').trim()
            if (!name) continue
            const k = name.toLowerCase()
            if (seen.has(k)) continue
            seen.add(k)
            out.push({
              key: `cat:${r.id}`,
              source: 'catalog',
              id: r.id,
              name,
              unit_price: Number(r.unit_price || 0),
            })
          }
        }

        if (!hist.error) {
          for (const r of (hist.data as any[]) || []) {
            const name = String(r.description || '').trim()
            if (!name) continue
            const k = name.toLowerCase()
            if (seen.has(k)) continue
            seen.add(k)
            out.push({
              key: `hist:${k}`,
              source: 'history',
              name,
              unit_price: Number(r.unit_price || 0),
            })
          }
        }

        setSuggestions(out)
        setShowSuggest(true)
      } catch {
        // silencioso
      }
    }, 180)

    return () => clearTimeout(t)
  }, [svcQuery])

  async function ensureServiceInCatalog(name: string, unit_price: number) {
    const clean = name.trim()
    if (!clean) return null

    // 1) Exact-ish by name (case-insensitive)
    const existing = await supabase
      .from('services_catalog')
      .select('id, name, unit_price')
      .ilike('name', clean)
      .limit(1)

    if (!existing.error && existing.data && existing.data.length) {
      return { id: (existing.data as any)[0].id as string }
    }

    // 2) Insert new
    const ins = await supabase
      .from('services_catalog')
      .insert({ name: clean, unit_price: Number(unit_price || 0) })
      .select('id')
      .single()

    if (ins.error) {
      console.warn('services_catalog insert:', ins.error.message)
      return null
    }

    return { id: (ins.data as any).id as string }
  }

  function pickSuggestion(s: Suggestion) {
    setSvcQuery(s.name)
    setAddUnit(Number(s.unit_price || 0))
    setSelectedServiceId(s.source === 'catalog' ? s.id || null : null)
    setShowSuggest(false)
  }

  // -------- Partidas --------
  async function addItem(e: React.FormEvent) {
    e.preventDefault()
    const description = svcQuery.trim()
    const quantity = Number(addQty || 1)
    const unit_price = Number(addUnit || 0)
    const discount = Number(addDiscount || 0)

    if (!description) return

    let serviceId = selectedServiceId
    if (!serviceId) {
      const ensured = await ensureServiceInCatalog(description, unit_price)
      serviceId = ensured?.id ?? null
    }

    const line_total = Math.max(0, quantity * unit_price - discount)

    const { error } = await supabase
      .from('quote_items')
      .insert({ quote_id: id, description, quantity, unit_price, discount, line_total, service_code: serviceId })

    if (error) {
      alert(error.message)
      return
    }

    // reset form
    setSvcQuery('')
    setAddQty(1)
    setAddUnit(0)
    setAddDiscount(0)
    setSelectedServiceId(null)

    await reloadItems()

    try {
      const { error: rpcError } = await supabase.rpc('sync_quote_totals')
      if (rpcError) console.warn('sync_quote_totals:', rpcError.message)
    } catch {
      // silencioso
    }
  }

  function startEdit(it: Item) {
    setEditingId(it.id)
    setEdDesc(String(it.description || ''))
    setEdQty(Number(it.quantity || 1))
    setEdUnit(Number(it.unit_price || 0))
    setEdDiscount(Number(it.discount ?? 0))
    setEdServiceId((it.service_code as any) || null)
  }

  async function saveEdit() {
    if (!editingId) return

    const description = edDesc.trim()
    const quantity = Number(edQty || 1)
    const unit_price = Number(edUnit || 0)
    const discount = Number(edDiscount || 0)
    if (!description) return

    let serviceId = edServiceId
    if (!serviceId) {
      const ensured = await ensureServiceInCatalog(description, unit_price)
      serviceId = ensured?.id ?? null
    }

    const line_total = Math.max(0, quantity * unit_price - discount)

    const { error } = await supabase
      .from('quote_items')
      .update({ description, quantity, unit_price, discount, line_total, service_code: serviceId })
      .eq('id', editingId)

    if (error) {
      alert(error.message)
      return
    }

    setEditingId(null)
    await reloadItems()

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
    if (error) {
      alert(error.message)
      return
    }
    await reloadItems()

    try {
      const { error: rpcError } = await supabase.rpc('sync_quote_totals')
      if (rpcError) console.warn('sync_quote_totals:', rpcError.message)
    } catch {
      // silencioso
    }
  }

  // -------- Encabezado (totales, términos/notas, vigencia) --------
  async function saveHeader(e: React.FormEvent) {
    e.preventDefault()
    if (!q) return
    const f = e.target as any

    const discount = Number(f.discount.value || 0)
    const tax = Number(f.tax.value || 0)
    const valid_until = f.valid_until.value || null // YYYY-MM-DD

    const updates = {
      discount,
      tax,
      valid_until,
      terms: f.terms.value,
      notes: f.notes.value,
      subtotal: itemsSubtotal,
      total: itemsSubtotal - discount + tax,
    }

    const { error } = await supabase.from('quotes').update(updates).eq('id', q.id)
    if (error) {
      alert(error.message)
      return
    }

    setQ({ ...q, ...updates } as any)
    alert('Presupuesto guardado')
  }

  async function approveQuote() {
    if (!q) return
    const { error } = await supabase
      .from('quotes')
      .update({ status: 'aprobado' })
      .eq('id', q.id)
    if (error) {
      alert(error.message)
      return
    }
    setQ({ ...q, status: 'aprobado' } as any)
  }

  // -------- Pagos --------
  async function addPayment(e: React.FormEvent) {
    e.preventDefault()
    const f = e.target as any
    const paid_at = f.paid_at.value ? new Date(f.paid_at.value).toISOString() : new Date().toISOString()
    const method = f.method.value as Payment['method']
    const amount = Number(f.amount.value || 0)
    const reference = f.reference.value || null
    const notes = f.notes.value || null

    if (!amount || amount <= 0) {
      alert('Monto inválido')
      return
    }

    const { error } = await supabase.from('quote_payments').insert({ quote_id: id, paid_at, method, amount, reference, notes })

    if (error) {
      alert(error.message)
      return
    }
    f.reset()
    await reloadPayments()
  }

  async function removePayment(paymentId: string) {
    if (!confirm('¿Eliminar este pago?')) return
    const { error } = await supabase.from('quote_payments').delete().eq('id', paymentId)
    if (error) {
      alert(error.message)
      return
    }
    await reloadPayments()
  }

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
          <p className="text-sm text-gray-600">Folio: {q.folio_code || q.id}</p>
          <p className="text-sm text-gray-600">Paciente: {patientName || q.patient_id}</p>
          <p className="text-sm text-gray-600">Fecha: {formatDateTimeMX(q.created_at)}</p>
          <p className="text-sm text-gray-600">Vigencia: {formatDateOnlyMX(q.valid_until)}</p>
        </div>
        <div className="flex items-center gap-2">
          <button form="quote-header-form" className="px-3 py-2 rounded-xl bg-emerald-600 text-white">
            Guardar presupuesto
          </button>
          <Link href={`/quotes/${q.id}/print`} className="px-3 py-2 rounded-xl bg-gray-800 text-white">
            Imprimir
          </Link>
          {q.status !== 'aprobado' ? (
            <button onClick={approveQuote} className="px-3 py-2 rounded-xl bg-blue-600 text-white">
              Marcar aprobado
            </button>
          ) : (
            <span className="px-3 py-2 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 text-sm">Aprobado</span>
          )}
          <ShareWhatsAppButtonKit quoteId={q.id} />
        </div>
      </div>

      {/* Encabezado / Totales */}
      <form id="quote-header-form" onSubmit={saveHeader} className="bg-white rounded-2xl shadow p-5 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          <label className="block">
            <span className="text-sm text-gray-600">Vigencia (fecha)</span>
            <input name="valid_until" type="date" defaultValue={q.valid_until ?? ''} className="w-full border rounded-xl px-3 py-2" />
          </label>

          <label className="block">
            <span className="text-sm text-gray-600">Descuento general (MXN)</span>
            <input name="discount" type="number" step="0.01" defaultValue={q.discount ?? 0} className="w-full border rounded-xl px-3 py-2" />
          </label>

          <label className="block">
            <span className="text-sm text-gray-600">Impuestos (MXN)</span>
            <input name="tax" type="number" step="0.01" defaultValue={q.tax ?? 0} className="w-full border rounded-xl px-3 py-2" />
          </label>

          <div className="md:col-span-2 grid grid-cols-3 gap-3 items-end">
            <div>
              <div className="text-xs text-gray-500">Subtotal</div>
              <div className="font-semibold">{money.format(itemsSubtotal)}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500">Total</div>
              <div className="font-semibold">{money.format(computedTotal)}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500">Saldo</div>
              <div className={`font-semibold ${balance > 0 ? 'text-rose-600' : 'text-emerald-700'}`}>{money.format(balance)}</div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <label className="block">
            <span className="text-sm text-gray-600">Términos</span>
            <textarea name="terms" defaultValue={q.terms ?? ''} className="w-full border rounded-xl px-3 py-2 min-h-[90px]" />
          </label>
          <label className="block">
            <span className="text-sm text-gray-600">Notas</span>
            <textarea name="notes" defaultValue={q.notes ?? ''} className="w-full border rounded-xl px-3 py-2 min-h-[90px]" />
          </label>
        </div>
      </form>

      {/* Servicios */}
      <section className="bg-white rounded-2xl shadow p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold">Servicios</h3>
          <div className="text-sm text-gray-600">Subtotal partidas: {money.format(itemsSubtotal)}</div>
        </div>

        {/* Form + Autocomplete */}
        <div ref={suggestRef}>
          <form onSubmit={addItem} className="grid grid-cols-1 md:grid-cols-12 gap-3">
            <div className="md:col-span-6 relative">
              <input
                value={svcQuery}
                onChange={(e) => {
                  setSvcQuery(e.target.value)
                  setSelectedServiceId(null)
                }}
                onFocus={() => svcQuery.trim() && setShowSuggest(true)}
                placeholder="Servicio / concepto"
                className="w-full border rounded-xl px-3 py-2"
              />

              {showSuggest && suggestions.length > 0 && (
                <div className="absolute z-20 mt-1 w-full bg-white border rounded-xl shadow overflow-hidden">
                  {suggestions.map((s) => (
                    <button
                      type="button"
                      key={s.key}
                      onClick={() => pickSuggestion(s)}
                      className="w-full text-left px-3 py-2 hover:bg-gray-50 flex items-center justify-between gap-3"
                    >
                      <span className="truncate">
                        {s.name}{' '}
                        <span className={`ml-2 text-xs px-2 py-0.5 rounded-full ${s.source === 'catalog' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-gray-50 text-gray-600 border border-gray-200'}`}>
                          {s.source === 'catalog' ? 'Catálogo' : 'Histórico'}
                        </span>
                      </span>
                      <span className="text-sm text-gray-700">{money.format(s.unit_price)}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <input
              value={addQty}
              onChange={(e) => setAddQty(Number(e.target.value || 0))}
              type="number"
              step="0.01"
              className="md:col-span-2 border rounded-xl px-3 py-2"
              placeholder="Cantidad"
            />
            <input
              value={addUnit}
              onChange={(e) => setAddUnit(Number(e.target.value || 0))}
              type="number"
              step="0.01"
              className="md:col-span-2 border rounded-xl px-3 py-2"
              placeholder="Unitario"
            />
            <input
              value={addDiscount}
              onChange={(e) => setAddDiscount(Number(e.target.value || 0))}
              type="number"
              step="0.01"
              className="md:col-span-2 border rounded-xl px-3 py-2"
              placeholder="Descuento"
            />

            <button className="md:col-span-12 px-4 py-2 rounded-xl bg-emerald-600 text-white">Agregar</button>
          </form>
        </div>

        {/* Tabla */}
        <div className="overflow-x-auto">
          <table className="w-full border text-sm">
            <thead>
              <tr className="bg-neutral-100">
                <th className="border px-2 py-1">Servicio</th>
                <th className="border px-2 py-1 text-right">Cantidad</th>
                <th className="border px-2 py-1 text-right">Unitario</th>
                <th className="border px-2 py-1 text-right">Descuento</th>
                <th className="border px-2 py-1 text-right">Total</th>
                <th className="border px-2 py-1">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {items.map((it) => {
                const qty = Number(it.quantity || 0)
                const unit = Number(it.unit_price || 0)
                const dsc = Number(it.discount ?? 0)
                const line = Math.max(0, qty * unit - dsc)

                const isEditing = editingId === it.id

                return (
                  <tr key={it.id}>
                    <td className="border px-2 py-1">
                      {isEditing ? (
                        <input value={edDesc} onChange={(e) => setEdDesc(e.target.value)} className="w-full border rounded-lg px-2 py-1" />
                      ) : (
                        it.description
                      )}
                    </td>

                    <td className="border px-2 py-1 text-right">
                      {isEditing ? (
                        <input type="number" step="0.01" value={edQty} onChange={(e) => setEdQty(Number(e.target.value || 0))} className="w-24 border rounded-lg px-2 py-1 text-right" />
                      ) : (
                        qty.toFixed(2)
                      )}
                    </td>

                    <td className="border px-2 py-1 text-right">
                      {isEditing ? (
                        <input type="number" step="0.01" value={edUnit} onChange={(e) => setEdUnit(Number(e.target.value || 0))} className="w-28 border rounded-lg px-2 py-1 text-right" />
                      ) : (
                        money.format(unit)
                      )}
                    </td>

                    <td className="border px-2 py-1 text-right">
                      {isEditing ? (
                        <input
                          type="number"
                          step="0.01"
                          value={edDiscount}
                          onChange={(e) => setEdDiscount(Number(e.target.value || 0))}
                          className="w-28 border rounded-lg px-2 py-1 text-right"
                        />
                      ) : (
                        money.format(dsc)
                      )}
                    </td>

                    <td className="border px-2 py-1 text-right">{isEditing ? money.format(Math.max(0, edQty * edUnit - edDiscount)) : money.format(line)}</td>

                    <td className="border px-2 py-1 whitespace-nowrap">
                      {isEditing ? (
                        <>
                          <button type="button" onClick={saveEdit} className="mr-3 text-emerald-700">
                            Guardar
                          </button>
                          <button type="button" onClick={() => setEditingId(null)} className="text-gray-600">
                            Cancelar
                          </button>
                        </>
                      ) : (
                        <>
                          <button type="button" onClick={() => startEdit(it)} className="mr-3 text-blue-600">
                            Editar
                          </button>
                          <button type="button" onClick={() => removeItem(it.id)} className="text-rose-600">
                            Eliminar
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                )
              })}

              {!loading && items.length === 0 && (
                <tr>
                  <td className="border px-2 py-3 text-gray-500" colSpan={6}>
                    Sin servicios.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Pagos */}
      <section className="bg-white rounded-2xl shadow p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold">Pagos</h3>
          <div className="text-sm text-gray-600">Pagado: {money.format(paidAmount)}</div>
        </div>

        <form onSubmit={addPayment} className="grid grid-cols-1 md:grid-cols-12 gap-3">
          <input
            name="paid_at"
            type="datetime-local"
            className="md:col-span-3 border rounded-xl px-3 py-2"
            defaultValue={toDateTimeLocalValue(new Date())}
          />

          <select name="method" className="md:col-span-2 border rounded-xl px-3 py-2" defaultValue="efectivo">
            <option value="efectivo">Efectivo</option>
            <option value="transferencia">Transferencia</option>
            <option value="tarjeta">Tarjeta</option>
            <option value="otros">Otros</option>
          </select>

          <input name="amount" type="number" step="0.01" className="md:col-span-2 border rounded-xl px-3 py-2" placeholder="Monto" />
          <input name="reference" className="md:col-span-2 border rounded-xl px-3 py-2" placeholder="Referencia" />
          <input name="notes" className="md:col-span-2 border rounded-xl px-3 py-2" placeholder="Notas" />

          <button className="md:col-span-1 px-4 py-2 rounded-xl bg-emerald-600 text-white">Agregar</button>
        </form>

        <div className="overflow-x-auto">
          <table className="w-full border text-sm">
            <thead>
              <tr className="bg-neutral-100">
                <th className="border px-2 py-1">Fecha</th>
                <th className="border px-2 py-1">Método</th>
                <th className="border px-2 py-1 text-right">Monto</th>
                <th className="border px-2 py-1">Ref</th>
                <th className="border px-2 py-1">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((p) => (
                <tr key={p.id}>
                  <td className="border px-2 py-1">{formatDateTimeMX(p.paid_at)}</td>
                  <td className="border px-2 py-1">{p.method}</td>
                  <td className="border px-2 py-1 text-right">{money.format(Number(p.amount || 0))}</td>
                  <td className="border px-2 py-1">{p.reference ?? ''}</td>
                  <td className="border px-2 py-1">
                    <button type="button" onClick={() => removePayment(p.id)} className="text-rose-600">
                      Eliminar
                    </button>
                  </td>
                </tr>
              ))}

              {!loading && payments.length === 0 && (
                <tr>
                  <td className="border px-2 py-3 text-gray-500" colSpan={5}>
                    Sin pagos.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Firma */}
      <section className="bg-white rounded-2xl shadow p-5 space-y-3">
        <h3 className="text-base font-semibold">Firma</h3>
        <SignaturePadKit quoteId={q.id} />
      </section>

      <div className="flex items-center gap-3">
        <Link href="/quotes" className="text-blue-600 hover:underline">
          ← Volver a presupuestos
        </Link>
      </div>
    </main>
  )
}

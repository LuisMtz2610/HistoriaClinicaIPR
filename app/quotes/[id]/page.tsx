/**
 * Change Summary:
 * - Servicios: agrega descuento por partida, edición (no solo eliminar) y autocomplete.
 * - Autocomplete: sugiere desde services_catalog + historial (quote_items).
 * - Vigencia (valid_until): input tipo date guardado como YYYY-MM-DD (sin desfase UTC).
 * - Fechas en MX: formateo con zona America/Mexico_City.
 * - Aprobación: botón para cambiar quotes.status a 'aprobado'.
 */

'use client'

import Link from 'next/link'
import { useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'
import ShareWhatsAppButtonKit from '@/components/kit/ShareWhatsAppButtonKit'
import SignaturePadKit from '@/components/kit/SignaturePadKit'

type Quote = {
  id: string
  patient_id: string
  status: string
  created_at?: string | null
  valid_until: string | null // date (YYYY-MM-DD)
  discount: number | null
  tax: number | null
  subtotal: number | null
  total: number | null
  terms: string | null
  notes: string | null
  signature_path: string | null
  folio_num?: number | null
  folio_code?: string | null
}

type Item = {
  id: string
  quote_id: string
  service_code: string | null
  description: string
  quantity: number
  unit_price: number
  discount: number
  line_total: number | null
  notes: string | null
  created_at?: string
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

type ServiceSuggestion = {
  key: string // normalized
  label: string
  unit_price: number
  source: 'catalog' | 'history'
  service_id?: string
}

function normKey(s: string) {
  return (s || '').trim().toLowerCase()
}

function formatDateOnlyMX(ymd: string | null | undefined) {
  // ymd = YYYY-MM-DD (date type); NO usar new Date(ymd) porque se interpreta UTC y puede restar 1 día.
  if (!ymd) return '—'
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

  // Servicios: autocomplete + alta
  const [services, setServices] = useState<ServiceSuggestion[]>([])
  const catalogByKey = useMemo(() => {
    const m = new Map<string, ServiceSuggestion>()
    services.filter((s) => s.source === 'catalog').forEach((s) => m.set(s.key, s))
    return m
  }, [services])

  const [svcQuery, setSvcQuery] = useState('')
  const [svcQty, setSvcQty] = useState<number>(1)
  const [svcUnit, setSvcUnit] = useState<number>(0)
  const [svcDiscount, setSvcDiscount] = useState<number>(0)
  const [showSuggest, setShowSuggest] = useState(false)
  const suggestRef = useRef<HTMLDivElement | null>(null)

  // Edición de partida
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editDraft, setEditDraft] = useState<Partial<Item> | null>(null)

  // Carga inicial
  useEffect(() => {
    let active = true

    async function loadAll() {
      setLoading(true)
      setErr(null)

      const qRes = await supabase.from('quotes').select('*').eq('id', id).single()
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
        .eq('id', qRes.data.patient_id)
        .single()
      if (!pn.error && pn.data) setPatientName(`${pn.data.last_name}, ${pn.data.first_name}`)

      await reloadItems()
      await reloadPayments()
      await loadServiceSuggestions()

      setLoading(false)
    }

    loadAll()

    // cerrar dropdown si das click fuera
    function onDocClick(e: MouseEvent) {
      if (!suggestRef.current) return
      if (!suggestRef.current.contains(e.target as any)) {
        setShowSuggest(false)
      }
    }
    document.addEventListener('mousedown', onDocClick)

    return () => {
      active = false
      document.removeEventListener('mousedown', onDocClick)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  async function reloadItems() {
    const iRes = await supabase
      .from('quote_items')
      .select('*')
      .eq('quote_id', id)
      .order('created_at', { ascending: true })
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

  async function loadServiceSuggestions() {
    // 1) Catálogo
    const cat = await supabase
      .from('services_catalog')
      .select('id, name, unit_price')
      .order('name', { ascending: true })
      .limit(200)

    const catArr: ServiceSuggestion[] = (cat.data || []).map((s: any) => ({
      key: normKey(s.name),
      label: s.name,
      unit_price: Number(s.unit_price || 0),
      source: 'catalog',
      service_id: s.id,
    }))

    // 2) Historial (quote_items): últimos 250, dedupe por descripción
    const hist = await supabase
      .from('quote_items')
      .select('description, unit_price, created_at')
      .order('created_at', { ascending: false })
      .limit(250)

    const seen = new Set<string>(catArr.map((x) => x.key))
    const histArr: ServiceSuggestion[] = []
    for (const r of (hist.data as any[]) || []) {
      const label = (r.description || '').toString()
      const key = normKey(label)
      if (!key || seen.has(key)) continue
      seen.add(key)
      histArr.push({
        key,
        label,
        unit_price: Number(r.unit_price || 0),
        source: 'history',
      })
      if (histArr.length >= 200) break
    }

    setServices([...catArr, ...histArr])
  }

  const filteredSuggestions = useMemo(() => {
    const term = normKey(svcQuery)
    if (!term) return []
    const hits = services
      .filter((s) => s.key.includes(term))
      .sort((a, b) => {
        // preferir catálogo
        if (a.source !== b.source) return a.source === 'catalog' ? -1 : 1
        // luego alfabético
        return a.label.localeCompare(b.label, 'es', { sensitivity: 'base' })
      })
    return hits.slice(0, 8)
  }, [services, svcQuery])

  // Helpers de totales (incluye descuento por partida y descuento general)
  const itemsSubtotal = useMemo(() => {
    // NO confiar en quote_items.line_total porque puede estar desfasado; calculamos con qty*unit - discount.
    return items.reduce((s, it) => {
      const qty = Number(it.quantity || 0)
      const unit = Number(it.unit_price || 0)
      const dsc = Number((it as any).discount ?? 0)
      const line = Math.max(0, qty * unit - dsc)
      return s + (isFinite(line) ? line : 0)
    }, 0)
  }, [items])

  const discountHeader = Number(q?.discount || 0)
  const tax = Number(q?.tax || 0)
  const computedTotal = itemsSubtotal - discountHeader + tax
  const paidAmount = payments.reduce((s, p) => s + Number(p.amount || 0), 0)
  const balance = computedTotal - paidAmount

  // ------- Partidas -------
  async function ensureServiceInCatalog(name: string, unit_price: number) {
    const key = normKey(name)
    const existing = catalogByKey.get(key)
    if (existing?.service_id) return existing.service_id

    // intenta insertar; si choca por UNIQUE(name), hacemos select
    const ins = await supabase
      .from('services_catalog')
      .insert({ name, unit_price })
      .select('id')
      .single()

    if (!ins.error && ins.data?.id) return ins.data.id as string

    const sel = await supabase
      .from('services_catalog')
      .select('id')
      .eq('name', name)
      .single()
    if (!sel.error && sel.data?.id) return sel.data.id as string

    return null
  }

  async function addItem(e: React.FormEvent) {
    e.preventDefault()
    const description = svcQuery.trim()
    const quantity = Number(svcQty || 1)
    const unit_price = Number(svcUnit || 0)
    const discount = Number(svcDiscount || 0)
    if (!description) return

    let service_code: string | null = null
    // si viene del catálogo o es nuevo, intentamos mantenerlo
    service_code = await ensureServiceInCatalog(description, unit_price)

    const { error } = await supabase
      .from('quote_items')
      .insert({ quote_id: id, description, quantity, unit_price, discount, line_total: Math.max(0, quantity * unit_price - discount), service_code })

    if (error) {
      alert(error.message)
      return
    }

    // reset
    setSvcQuery('')
    setSvcQty(1)
    setSvcUnit(0)
    setSvcDiscount(0)
    setShowSuggest(false)

    await reloadItems()
    await loadServiceSuggestions()
  }

  async function startEdit(it: Item) {
    setEditingId(it.id)
    setEditDraft({
      id: it.id,
      description: it.description,
      quantity: Number(it.quantity || 0),
      unit_price: Number(it.unit_price || 0),
      discount: Number((it as any).discount ?? 0),
      notes: it.notes ?? null,
      service_code: (it as any).service_code ?? null,
    })
  }

  async function cancelEdit() {
    setEditingId(null)
    setEditDraft(null)
  }

  async function saveEdit() {
    if (!editingId || !editDraft) return

    const description = (editDraft.description || '').toString().trim()
    const quantity = Number(editDraft.quantity || 1)
    const unit_price = Number(editDraft.unit_price || 0)
    const discount = Number((editDraft as any).discount ?? 0)

    if (!description) {
      alert('El servicio / concepto es requerido.')
      return
    }

    const service_code = await ensureServiceInCatalog(description, unit_price)

    const { error } = await supabase
      .from('quote_items')
      .update({ description, quantity, unit_price, discount, line_total: Math.max(0, quantity * unit_price - discount), service_code })
      .eq('id', editingId)

    if (error) {
      alert(error.message)
      return
    }

    await reloadItems()
    await loadServiceSuggestions()
    await cancelEdit()
  }

  async function removeItem(itemId: string) {
    if (!confirm('¿Eliminar este servicio?')) return
    const { error } = await supabase.from('quote_items').delete().eq('id', itemId)
    if (error) {
      alert(error.message)
      return
    }
    await reloadItems()
  }

  // ------- Encabezado -------
  async function saveHeader(e: React.FormEvent) {
    e.preventDefault()
    if (!q) return
    const f = e.target as any

    const valid_until = (f.valid_until?.value || '').toString().trim() || null // YYYY-MM-DD
    const updates = {
      discount: Number(f.discount.value || 0),
      tax: Number(f.tax.value || 0),
      terms: f.terms.value,
      notes: f.notes.value,
      valid_until,
      subtotal: itemsSubtotal,
      total: itemsSubtotal - Number(f.discount.value || 0) + Number(f.tax.value || 0),
    }

    const { error } = await supabase.from('quotes').update(updates).eq('id', q.id)
    if (error) alert(error.message)
    else {
      // refrescar quote
      const qRes = await supabase.from('quotes').select('*').eq('id', id).single()
      if (!qRes.error) setQ(qRes.data as any)
      alert('Presupuesto guardado')
    }
  }

  async function approveQuote() {
    if (!q) return
    if (!confirm('¿Marcar este presupuesto como APROBADO?')) return
    const { error } = await supabase
      .from('quotes')
      .update({ status: 'aprobado', accepted_at: new Date().toISOString() })
      .eq('id', q.id)
    if (error) {
      alert(error.message)
      return
    }
    const qRes = await supabase.from('quotes').select('*').eq('id', id).single()
    if (!qRes.error) setQ(qRes.data as any)
  }

  // ------- Pagos -------
  async function addPayment(e: React.FormEvent) {
    e.preventDefault()
    const f = e.target as any
    const paid_at = f.paid_at.value
      ? new Date(f.paid_at.value).toISOString()
      : new Date().toISOString()
    const method = f.method.value as Payment['method']
    const amount = Number(f.amount.value || 0)
    const reference = f.reference.value || null
    const notes = f.notes.value || null

    if (!amount || amount <= 0) {
      alert('Monto inválido')
      return
    }

    const { error } = await supabase
      .from('quote_payments')
      .insert({ quote_id: id, paid_at, method, amount, reference, notes })

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

  const fmtDateTimeMX = useMemo(
    () =>
      new Intl.DateTimeFormat('es-MX', {
        dateStyle: 'short',
        timeStyle: 'short',
        timeZone: 'America/Mexico_City',
      }),
    []
  )

  const money = useMemo(
    () => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }),
    []
  )

  // ------- Render -------
  if (loading) return <div className="p-4">Cargando…</div>
  if (err) return <div className="p-4 text-red-600">Error: {err}</div>
  if (!q) return <div className="p-4">No encontrado</div>

  return (
    <main className="container mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-semibold">Presupuesto</h1>
            {q.status === 'aprobado' ? (
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">Aprobado</span>
            ) : (
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-700">{q.status}</span>
            )}
          </div>
          <p className="text-sm text-gray-600">Paciente: {patientName || q.patient_id}</p>
          <p className="text-xs text-gray-500">
            Folio: {q.folio_code || `QUO-${q.id.slice(0, 8)}`} · Fecha: {q.created_at ? fmtDateTimeMX.format(new Date(q.created_at)) : '—'}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap justify-end">
          <button form="quote-header-form" className="px-3 py-2 rounded-xl bg-emerald-600 text-white">
            Guardar
          </button>
          {q.status !== 'aprobado' && (
            <button onClick={approveQuote} className="px-3 py-2 rounded-xl bg-emerald-800 text-white">
              Marcar aprobado
            </button>
          )}
          <Link href={`/quotes/${q.id}/print`} className="px-3 py-2 rounded-xl bg-gray-800 text-white">
            Imprimir
          </Link>
          <ShareWhatsAppButtonKit quoteId={q.id} />
        </div>
      </div>

      {/* Encabezado / Totales */}
      <form id="quote-header-form" onSubmit={saveHeader} className="bg-white rounded-2xl shadow p-5 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
          <label className="block md:col-span-2">
            <span className="text-sm text-gray-600">Vigencia</span>
            <input
              name="valid_until"
              type="date"
              defaultValue={q.valid_until || ''}
              className="mt-1 w-full border rounded-xl px-3 py-2"
            />
            <div className="text-[11px] text-gray-500 mt-1">Se guarda como fecha (sin UTC). Vista: {formatDateOnlyMX(q.valid_until)}</div>
          </label>

          <label className="block md:col-span-2">
            <span className="text-sm text-gray-600">Descuento general (MXN)</span>
            <input
              name="discount"
              defaultValue={q.discount || 0}
              type="number"
              step="0.01"
              className="mt-1 w-full border rounded-xl px-3 py-2"
            />
          </label>

          <label className="block md:col-span-2">
            <span className="text-sm text-gray-600">Impuestos (MXN)</span>
            <input
              name="tax"
              defaultValue={q.tax || 0}
              type="number"
              step="0.01"
              className="mt-1 w-full border rounded-xl px-3 py-2"
            />
          </label>

          <div className="md:col-span-3 grid grid-cols-2 gap-3">
            <div>
              <span className="text-sm text-gray-600">Subtotal (partidas)</span>
              <div className="mt-1 px-3 py-2 border rounded-xl bg-gray-50">{money.format(itemsSubtotal)}</div>
            </div>
            <div>
              <span className="text-sm text-gray-600">Total a pagar</span>
              <div className="mt-1 px-3 py-2 border rounded-xl bg-gray-50">{money.format(computedTotal)}</div>
            </div>
          </div>

          <div className="md:col-span-3 grid grid-cols-2 gap-3">
            <div>
              <span className="text-sm text-gray-600">Pagado</span>
              <div className="mt-1 px-3 py-2 border rounded-xl bg-gray-50">{money.format(paidAmount)}</div>
            </div>
            <div>
              <span className="text-sm text-gray-600">Saldo</span>
              <div className={`mt-1 px-3 py-2 border rounded-xl bg-gray-50 ${balance > 0 ? 'text-rose-600' : 'text-emerald-700'}`}>
                {money.format(balance)}
              </div>
            </div>
          </div>
        </div>

        <label className="block">
          <span className="text-sm text-gray-600">Términos / Condiciones</span>
          <textarea name="terms" defaultValue={q.terms || ''} className="mt-1 w-full border rounded-xl px-3 py-2" rows={3} />
        </label>

        <label className="block">
          <span className="text-sm text-gray-600">Notas</span>
          <textarea name="notes" defaultValue={q.notes || ''} className="mt-1 w-full border rounded-xl px-3 py-2" rows={2} />
        </label>

        <button className="px-4 py-2 rounded-xl bg-emerald-600 text-white">Guardar encabezado</button>
      </form>

      {/* Servicios */}
      <section className="bg-white rounded-2xl shadow p-5 space-y-4">
        <h3 className="text-base font-semibold">Servicios</h3>

        <form onSubmit={addItem} className="grid grid-cols-1 md:grid-cols-12 gap-3" ref={suggestRef}>
          <div className="md:col-span-6 relative">
            <input
              value={svcQuery}
              onChange={(e) => {
                setSvcQuery(e.target.value)
                setShowSuggest(true)
                const hit = services.find((s) => s.key === normKey(e.target.value))
                if (hit) setSvcUnit(hit.unit_price)
              }}
              onFocus={() => setShowSuggest(true)}
              placeholder="Servicio / concepto"
              className="w-full border rounded-xl px-3 py-2"
            />

            {showSuggest && filteredSuggestions.length > 0 && (
              <div className="absolute z-20 mt-1 w-full bg-white border rounded-xl shadow overflow-hidden">
                {filteredSuggestions.map((s) => (
                  <button
                    type="button"
                    key={`${s.source}:${s.key}`}
                    className="w-full text-left px-3 py-2 hover:bg-gray-50 flex items-center justify-between"
                    onClick={() => {
                      setSvcQuery(s.label)
                      setSvcUnit(s.unit_price)
                      setShowSuggest(false)
                    }}
                  >
                    <span>{s.label}</span>
                    <span className="text-xs text-gray-500">{s.source === 'catalog' ? 'Catálogo' : 'Histórico'} · {money.format(s.unit_price)}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <input
            value={svcQty}
            onChange={(e) => setSvcQty(Number(e.target.value || 1))}
            type="number"
            step="0.01"
            className="md:col-span-2 border rounded-xl px-3 py-2"
            placeholder="Cantidad"
          />

          <input
            value={svcUnit}
            onChange={(e) => setSvcUnit(Number(e.target.value || 0))}
            type="number"
            step="0.01"
            className="md:col-span-2 border rounded-xl px-3 py-2"
            placeholder="Unitario"
          />

          <input
            value={svcDiscount}
            onChange={(e) => setSvcDiscount(Number(e.target.value || 0))}
            type="number"
            step="0.01"
            className="md:col-span-2 border rounded-xl px-3 py-2"
            placeholder="Descuento"
          />

          <button className="md:col-span-12 px-4 py-2 rounded-xl bg-emerald-600 text-white">Agregar</button>
        </form>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left border-b">
                <th className="p-2">Servicio</th>
                <th className="p-2">Cantidad</th>
                <th className="p-2">Unitario</th>
                <th className="p-2">Descuento</th>
                <th className="p-2">Total</th>
                <th className="p-2">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {items.map((it) => {
                const qty = Number(it.quantity || 0)
                const unit = Number(it.unit_price || 0)
                const dsc = Number((it as any).discount ?? 0)
                const line = Math.max(0, qty * unit - dsc)

                const isEditing = editingId === it.id
                if (isEditing && editDraft) {
                  const ed = editDraft
                  const edQty = Number(ed.quantity || 0)
                  const edUnit = Number(ed.unit_price || 0)
                  const edDsc = Number((ed as any).discount ?? 0)
                  const edLine = Math.max(0, edQty * edUnit - edDsc)

                  return (
                    <tr key={it.id} className="border-b bg-amber-50/30">
                      <td className="p-2">
                        <input
                          value={(ed.description || '').toString()}
                          onChange={(e) => setEditDraft({ ...ed, description: e.target.value })}
                          className="w-full border rounded-lg px-2 py-1"
                        />
                      </td>
                      <td className="p-2">
                        <input
                          value={Number(ed.quantity || 0)}
                          onChange={(e) => setEditDraft({ ...ed, quantity: Number(e.target.value || 0) })}
                          type="number"
                          step="0.01"
                          className="w-28 border rounded-lg px-2 py-1"
                        />
                      </td>
                      <td className="p-2">
                        <input
                          value={Number(ed.unit_price || 0)}
                          onChange={(e) => setEditDraft({ ...ed, unit_price: Number(e.target.value || 0) })}
                          type="number"
                          step="0.01"
                          className="w-28 border rounded-lg px-2 py-1"
                        />
                      </td>
                      <td className="p-2">
                        <input
                          value={Number((ed as any).discount ?? 0)}
                          onChange={(e) => setEditDraft({ ...ed, discount: Number(e.target.value || 0) } as any)}
                          type="number"
                          step="0.01"
                          className="w-28 border rounded-lg px-2 py-1"
                        />
                      </td>
                      <td className="p-2">{money.format(edLine)}</td>
                      <td className="p-2 whitespace-nowrap">
                        <button onClick={saveEdit} className="text-emerald-700 hover:underline mr-3" type="button">Guardar</button>
                        <button onClick={cancelEdit} className="text-gray-600 hover:underline" type="button">Cancelar</button>
                      </td>
                    </tr>
                  )
                }

                return (
                  <tr key={it.id} className="border-b">
                    <td className="p-2">{it.description}</td>
                    <td className="p-2">{qty.toFixed(2)}</td>
                    <td className="p-2">{money.format(unit)}</td>
                    <td className="p-2">{money.format(dsc)}</td>
                    <td className="p-2">{money.format(line)}</td>
                    <td className="p-2 whitespace-nowrap">
                      <button onClick={() => startEdit(it)} className="text-blue-600 hover:underline mr-3" type="button">Editar</button>
                      <button onClick={() => removeItem(it.id)} className="text-red-600 hover:underline" type="button">Eliminar</button>
                    </td>
                  </tr>
                )
              })}

              {items.length === 0 && <tr><td className="p-4 text-gray-500" colSpan={6}>Sin partidas</td></tr>}
            </tbody>
          </table>
        </div>
      </section>

      {/* Pagos (con historial) */}
      <section className="bg-white rounded-2xl shadow p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold">Pagos</h3>
          <div className="text-sm text-gray-700">
            <span className="mr-4">Pagado: <b>{money.format(paidAmount)}</b></span>
            <span>Saldo: <b>{money.format(balance)}</b></span>
          </div>
        </div>

        {/* Formulario de pago */}
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
              {payments.map((p) => (
                <tr key={p.id} className="border-b">
                  <td className="p-2">{fmtDateTimeMX.format(new Date(p.paid_at))}</td>
                  <td className="p-2 capitalize">{p.method}</td>
                  <td className="p-2">{money.format(Number(p.amount))}</td>
                  <td className="p-2">{p.reference || '—'}</td>
                  <td className="p-2">{p.notes || '—'}</td>
                  <td className="p-2">
                    <button onClick={() => removePayment(p.id)} className="text-red-600 hover:underline" type="button">Eliminar</button>
                  </td>
                </tr>
              ))}
              {payments.length === 0 && <tr><td className="p-3 text-gray-500" colSpan={6}>Sin pagos</td></tr>}
            </tbody>
          </table>
        </div>
      </section>

      {/* Firma */}
      <section className="bg-white rounded-2xl shadow p-5">
        <h3 className="text-base font-semibold mb-2">Firma de aceptación</h3>
        <SignaturePadKit patientId={q.patient_id} consentId={`quote-${q.id}`} />
      </section>

      {/* Field Map / Data Sources
        - services_catalog: {id, name, unit_price} usado para autocomplete y alta automática.
        - quote_items: {description, quantity, unit_price, discount, line_total, service_code}.
        - quotes: {valid_until(date), discount(header), tax, subtotal, total, status}.
        - quote_payments: {paid_at, method, amount}.
      */}
    </main>
  )
}

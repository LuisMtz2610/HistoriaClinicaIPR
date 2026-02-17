// app/quotes/[id]/page.tsx
'use client'

import Link from 'next/link'
import { useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'
import ShareWhatsAppButtonKit from '@/components/kit/ShareWhatsAppButtonKit'
import SignaturePadKit from '@/components/kit/SignaturePadKit'

/* ══════════════════════════════════════════════════════════════ TIPOS */
type QuoteStatus = 'borrador' | string
type Quote = {
  id: string; patient_id: string; status: QuoteStatus
  created_at?: string | null; valid_until?: string | null
  discount: number | null; tax: number | null
  subtotal: number | null; total: number | null
  terms: string | null; notes: string | null
  signature_path: string | null; folio_code?: string | null
}
type Item = {
  id: string; quote_id: string; service_code?: string | null
  description: string; quantity: number; unit_price: number
  discount?: number | null; line_total?: number | null; notes: string | null
}
type Payment = {
  id: string; quote_id: string; paid_at: string
  method: 'efectivo' | 'transferencia' | 'tarjeta' | 'otros'
  amount: number; reference: string | null; notes: string | null
}
type Suggestion = { key: string; source: 'catalog' | 'history'; id?: string; name: string; unit_price: number }

/* ══════════════════════════════════════════════════════════════ HELPERS */
const APPROVED = new Set(['aprobado','aprobada','approved','aceptado','aceptada','accepted'])
const isApproved = (s: unknown) => APPROVED.has(String(s ?? '').toLowerCase())

const METHOD_LABEL: Record<string, string> = {
  efectivo: '💵 Efectivo', transferencia: '🏦 Transferencia', tarjeta: '💳 Tarjeta', otros: '📋 Otros',
}

function fmtMX(iso: string | null | undefined) {
  if (!iso) return '—'
  try { return new Intl.DateTimeFormat('es-MX', { dateStyle: 'short', timeStyle: 'short', timeZone: 'America/Mexico_City' }).format(new Date(iso)) }
  catch { return new Date(iso).toLocaleString() }
}
function fmtDate(ymd: string | null | undefined) {
  if (!ymd) return '—'
  const [y, m, d] = ymd.split('-').map(Number)
  if (!y || !m || !d) return ymd
  return `${String(d).padStart(2,'0')}/${String(m).padStart(2,'0')}/${y}`
}
function toLocalDT(d: Date) {
  const p = (n: number) => String(n).padStart(2,'0')
  return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`
}

/* ══════════════════════════════════════════════════════════════ COMPONENTE */
export default function QuoteDetail({ params }: { params: { id: string } }) {
  const { id } = params

  const [q,           setQ]           = useState<Quote | null>(null)
  const [patientId,   setPatientId]   = useState<string>('')
  const [patientName, setPatientName] = useState<string>('')
  const [items,       setItems]       = useState<Item[]>([])
  const [payments,    setPayments]    = useState<Payment[]>([])
  const [loading,     setLoading]     = useState(true)
  const [err,         setErr]         = useState<string | null>(null)
  const [activeTab,   setActiveTab]   = useState<'servicios' | 'pagos' | 'ajustes' | 'firma'>('servicios')
  const [savingHdr,   setSavingHdr]   = useState(false)
  const [savedHdr,    setSavedHdr]    = useState(false)

  // Autocomplete servicios
  const [svcQuery,   setSvcQuery]   = useState('')
  const [addQty,     setAddQty]     = useState<number>(1)
  const [addUnit,    setAddUnit]    = useState<number>(0)
  const [addDisc,    setAddDisc]    = useState<number>(0)
  const [showSug,    setShowSug]    = useState(false)
  const [suggestions,setSuggestions]= useState<Suggestion[]>([])
  const [selSvcId,   setSelSvcId]   = useState<string | null>(null)
  const [savingCat,  setSavingCat]  = useState(false)
  const [addingItem, setAddingItem] = useState(false)
  const suggestRef       = useRef<HTMLDivElement | null>(null)
  const suggestDropRef   = useRef<HTMLDivElement | null>(null)
  const svcInputRef      = useRef<HTMLInputElement | null>(null)
  const [suggestAnchor,  setSuggestAnchor] = useState<DOMRect | null>(null)
  const [mounted,        setMounted]       = useState(false)

  // Edición inline de partida
  const [editingId, setEditingId] = useState<string | null>(null)
  const [edDesc,    setEdDesc]    = useState('')
  const [edQty,     setEdQty]     = useState<number>(1)
  const [edUnit,    setEdUnit]    = useState<number>(0)
  const [edDisc,    setEdDisc]    = useState<number>(0)
  const [edSvcId,   setEdSvcId]   = useState<string | null>(null)
  const [savingEdit,setSavingEdit]= useState(false)

  // Pago rápido
  const [payAmt,    setPayAmt]    = useState<number>(0)
  const [payMethod, setPayMethod] = useState<Payment['method']>('efectivo')
  const [payRef,    setPayRef]    = useState('')
  const [payNotes,  setPayNotes]  = useState('')
  const [payDate,   setPayDate]   = useState(toLocalDT(new Date()))
  const [savingPay, setSavingPay] = useState(false)

  const money = useMemo(() => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }), [])

  /* ── CARGA ───────────────────────────────────────────────── */
  useEffect(() => {
    let active = true
    async function load() {
      setLoading(true); setErr(null)
      const qRes = await supabase.from('quotes')
        .select('id, patient_id, status, created_at, valid_until, discount, tax, subtotal, total, terms, notes, signature_path, folio_code')
        .eq('id', id).single()
      if (qRes.error) { setErr(qRes.error.message); setLoading(false); return }
      if (!active) return
      setQ(qRes.data as any)
      setPatientId((qRes.data as any).patient_id)
      const pn = await supabase.from('patients').select('first_name,last_name').eq('id', (qRes.data as any).patient_id).single()
      if (!pn.error && pn.data) setPatientName(`${pn.data.last_name}, ${pn.data.first_name}`)
      await reloadItems(); await reloadPayments()
      setLoading(false)
    }
    load()
    return () => { active = false }
  }, [id])

  useEffect(() => { setMounted(true) }, [])

  async function reloadItems() {
    const { data } = await supabase.from('quote_items').select('*').eq('quote_id', id).order('id')
    setItems((data as any) || [])
  }
  async function reloadPayments() {
    const { data } = await supabase.from('quote_payments').select('*').eq('quote_id', id).order('paid_at', { ascending: false })
    setPayments((data as any) || [])
  }

  /* ── TOTALES ─────────────────────────────────────────────── */
  const itemsSubtotal = useMemo(() =>
    items.reduce((s, it) => s + Math.max(0, (it.quantity||0)*(it.unit_price||0) - (it.discount??0)), 0)
  , [items])
  const headerDiscount = Number(q?.discount || 0)
  const tax            = Number(q?.tax || 0)
  const computedTotal  = itemsSubtotal - headerDiscount + tax
  const paidAmount     = payments.reduce((s, p) => s + Number(p.amount || 0), 0)
  const balance        = computedTotal - paidAmount
  const paidPct        = computedTotal > 0 ? Math.min(100, Math.round(paidAmount / computedTotal * 100)) : 0

  /* ── AUTOCOMPLETE ────────────────────────────────────────── */
  function updateAnchor() {
    const el = svcInputRef.current; if (!el) return
    setSuggestAnchor(el.getBoundingClientRect())
  }
  useEffect(() => {
    if (!showSug) return
    updateAnchor()
    const fn = () => updateAnchor()
    window.addEventListener('scroll', fn, true); window.addEventListener('resize', fn)
    return () => { window.removeEventListener('scroll', fn, true); window.removeEventListener('resize', fn) }
  }, [showSug, svcQuery])
  useEffect(() => {
    function onDown(e: MouseEvent | TouchEvent) {
      const t = e.target as Node
      if (suggestRef.current?.contains(t) || suggestDropRef.current?.contains(t)) return
      setShowSug(false)
    }
    document.addEventListener('mousedown', onDown); document.addEventListener('touchstart', onDown)
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('touchstart', onDown) }
  }, [])
  useEffect(() => {
    if (!showSug) return
    const qv = svcQuery.trim()
    const t = setTimeout(async () => {
      try {
        const catQ = qv
          ? supabase.from('services_catalog').select('id, name, unit_price').ilike('name', `%${qv}%`).order('name').limit(12)
          : supabase.from('services_catalog').select('id, name, unit_price').order('name').limit(20)
        const histQ = qv
          ? supabase.from('quote_items').select('description, unit_price').ilike('description', `%${qv}%`).order('description').limit(12)
          : supabase.from('quote_items').select('description, unit_price').order('id', { ascending: false }).limit(20)
        const [cat, hist] = await Promise.all([catQ, histQ])
        const out: Suggestion[] = []; const seen = new Set<string>()
        if (!cat.error) for (const r of (cat.data as any[]) || []) {
          const name = String(r.name || '').trim(); if (!name) continue
          const k = name.toLowerCase(); if (seen.has(k)) continue
          seen.add(k); out.push({ key: `cat:${r.id}`, source: 'catalog', id: r.id, name, unit_price: Number(r.unit_price || 0) })
        }
        if (!hist.error) for (const r of (hist.data as any[]) || []) {
          const name = String(r.description || '').trim(); if (!name) continue
          const k = name.toLowerCase(); if (seen.has(k)) continue
          seen.add(k); out.push({ key: `hist:${k}`, source: 'history', name, unit_price: Number(r.unit_price || 0) })
        }
        setSuggestions(out)
      } catch {}
    }, 180)
    return () => clearTimeout(t)
  }, [svcQuery, showSug])

  async function ensureServiceInCatalog(name: string, unit_price: number) {
    const clean = name.trim(); if (!clean) return null
    const existing = await supabase.from('services_catalog').select('id').ilike('name', clean).limit(1)
    if (!existing.error && existing.data?.length) return { id: (existing.data as any)[0].id as string }
    const ins = await supabase.from('services_catalog').insert({ name: clean, unit_price: Number(unit_price || 0) }).select('id').single()
    if (ins.error) { console.warn('services_catalog:', ins.error.message); return null }
    return { id: (ins.data as any).id as string }
  }
  function pickSuggestion(s: Suggestion) { setSvcQuery(s.name); setAddUnit(Number(s.unit_price||0)); setSelSvcId(s.source === 'catalog' ? s.id || null : null); setShowSug(false) }
  async function createServiceFromCurrent() {
    const name = svcQuery.trim(); if (!name) return
    try { setSavingCat(true); const e = await ensureServiceInCatalog(name, Number(addUnit||0)); if (e?.id) setSelSvcId(e.id); setShowSug(false) }
    finally { setSavingCat(false) }
  }
  const hasExactMatch = () => suggestions.some(s => s.source === 'catalog' && s.name.trim().toLowerCase() === svcQuery.trim().toLowerCase())

  /* ── CRUD PARTIDAS ───────────────────────────────────────── */
  async function addItem(e: React.FormEvent) {
    e.preventDefault()
    const description = svcQuery.trim(); if (!description) return
    setAddingItem(true)
    let serviceId = selSvcId
    if (!serviceId) { const en = await ensureServiceInCatalog(description, addUnit); serviceId = en?.id ?? null }
    const { error } = await supabase.from('quote_items').insert({ quote_id: id, description, quantity: addQty, unit_price: addUnit, discount: addDisc, service_code: serviceId })
    if (error) { alert(error.message); setAddingItem(false); return }
    setSvcQuery(''); setAddQty(1); setAddUnit(0); setAddDisc(0); setSelSvcId(null)
    await reloadItems()
    try { await supabase.rpc('sync_quote_totals') } catch {}
    setAddingItem(false)
  }
  function startEdit(it: Item) {
    setEditingId(it.id); setEdDesc(String(it.description||'')); setEdQty(Number(it.quantity||1))
    setEdUnit(Number(it.unit_price||0)); setEdDisc(Number(it.discount??0)); setEdSvcId((it.service_code as any)||null)
  }
  async function saveEdit() {
    if (!editingId) return; setSavingEdit(true)
    const description = edDesc.trim(); if (!description) return
    let serviceId = edSvcId
    if (!serviceId) { const en = await ensureServiceInCatalog(description, edUnit); serviceId = en?.id ?? null }
    const { error } = await supabase.from('quote_items').update({ description, quantity: edQty, unit_price: edUnit, discount: edDisc, service_code: serviceId }).eq('id', editingId)
    if (error) { alert(error.message); setSavingEdit(false); return }
    setEditingId(null); await reloadItems()
    try { await supabase.rpc('sync_quote_totals') } catch {}
    setSavingEdit(false)
  }
  async function removeItem(itemId: string) {
    if (!confirm('¿Eliminar este servicio?')) return
    await supabase.from('quote_items').delete().eq('id', itemId)
    await reloadItems()
    try { await supabase.rpc('sync_quote_totals') } catch {}
  }

  /* ── HEADER (ajustes) ────────────────────────────────────── */
  async function saveHeader(e: React.FormEvent) {
    e.preventDefault(); if (!q) return
    setSavingHdr(true)
    const f = e.target as any
    const discount = Number(f.discount.value || 0)
    const taxVal   = Number(f.tax.value || 0)
    const updates  = { discount, tax: taxVal, valid_until: f.valid_until.value || null, terms: f.terms.value, notes: f.notes.value, subtotal: itemsSubtotal, total: itemsSubtotal - discount + taxVal }
    const { error } = await supabase.from('quotes').update(updates).eq('id', q.id)
    if (error) { alert(error.message); setSavingHdr(false); return }
    setQ({ ...q, ...updates } as any)
    setSavedHdr(true); setTimeout(() => setSavedHdr(false), 2000)
    setSavingHdr(false)
  }

  /* ── APROBAR ─────────────────────────────────────────────── */
  async function approveQuote() {
    if (!q) return
    for (const status of ['aprobado','aceptado','approved']) {
      const { error } = await supabase.from('quotes').update({ status }).eq('id', q.id)
      if (!error) { setQ({ ...q, status } as any); return }
      if (!/invalid input value for enum/i.test(error.message)) { alert(error.message); return }
    }
    alert('No se pudo aprobar — revisa el enum quote_status en Supabase:\nselect unnest(enum_range(NULL::quote_status));')
  }

  async function deleteQuote() {
    if (!q) return
    const folio = q.folio_code || q.id.slice(0, 8)
    if (!confirm(`¿Eliminar el presupuesto ${folio}?\n\nSe eliminarán también sus partidas y pagos. Esta acción no se puede deshacer.`)) return
    // Eliminar partidas y pagos primero (FK constraints)
    await supabase.from('quote_items').delete().eq('quote_id', q.id)
    await supabase.from('quote_payments').delete().eq('quote_id', q.id)
    const { error } = await supabase.from('quotes').delete().eq('id', q.id)
    if (error) { alert('Error al eliminar: ' + error.message); return }
    window.location.href = '/quotes'
  }

  /* ── PAGO ────────────────────────────────────────────────── */
  async function addPayment(e: React.FormEvent) {
    e.preventDefault()
    if (!payAmt || payAmt <= 0) { alert('Monto inválido'); return }
    setSavingPay(true)
    const paid_at = payDate ? new Date(payDate).toISOString() : new Date().toISOString()
    const { error } = await supabase.from('quote_payments').insert({ quote_id: id, paid_at, method: payMethod, amount: payAmt, reference: payRef || null, notes: payNotes || null })
    if (error) { alert(error.message); setSavingPay(false); return }
    setPayAmt(0); setPayRef(''); setPayNotes(''); setPayDate(toLocalDT(new Date()))
    await reloadPayments(); setSavingPay(false)
  }
  async function removePayment(paymentId: string) {
    if (!confirm('¿Eliminar este pago?')) return
    await supabase.from('quote_payments').delete().eq('id', paymentId)
    await reloadPayments()
  }

  /* ── RENDER ──────────────────────────────────────────────── */
  if (loading) return (
    <div className="flex items-center justify-center h-60 gap-3 text-gray-400">
      <div style={{ width: 20, height: 20, borderRadius: '50%', border: '2.5px solid #2B9C93', borderTopColor: 'transparent', animation: 'spin 0.7s linear infinite' }}/>
      Cargando presupuesto…
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
  if (err) return <div className="card p-6 text-red-600">Error: {err}</div>
  if (!q)  return <div className="card p-6">No encontrado</div>

  const TABS = [
    { id: 'servicios', icon: '🩺', label: 'Servicios', badge: items.length },
    { id: 'pagos',     icon: '💳', label: 'Pagos',     badge: payments.length },
    { id: 'ajustes',   icon: '⚙️',  label: 'Ajustes',  badge: null },
    { id: 'firma',     icon: '✍️',  label: 'Firma',     badge: null },
  ] as const

  return (
    <div className="space-y-5 max-w-5xl mx-auto">

      {/* ══ HEADER DEL PRESUPUESTO ══════════════════════════════ */}
      <div className="card p-5">
        <div className="flex items-start gap-4 flex-wrap">

          {/* Identidad */}
          <div className="flex-1 min-w-0 space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-bold text-gray-900">
                {q.folio_code ?? `Presupuesto`}
              </h1>
              <StatusBadge status={q.status} />
            </div>
            <div className="flex items-center gap-4 flex-wrap text-sm text-gray-500">
              {patientName && (
                <Link href={`/pacientes/${patientId}`} className="flex items-center gap-1.5 hover:text-brand transition">
                  <span>👤</span> {patientName}
                </Link>
              )}
              <span className="flex items-center gap-1.5">
                <span>📅</span> {fmtMX(q.created_at)}
              </span>
              {q.valid_until && (
                <span className="flex items-center gap-1.5">
                  <span>⏳</span> Vigente hasta {fmtDate(q.valid_until)}
                </span>
              )}
            </div>
          </div>

          {/* Acciones */}
          <div className="flex items-center gap-2 flex-wrap shrink-0">
            <ShareWhatsAppButtonKit quoteId={q.id} />
            <Link href={`/quotes/${q.id}/print`}
              className="px-3 py-2 rounded-xl text-sm font-medium border border-gray-200 text-gray-600 hover:bg-gray-50 transition">
              🖨️ Imprimir
            </Link>
            {!isApproved(q.status) ? (
              <button onClick={approveQuote}
                className="px-4 py-2 rounded-xl text-sm font-semibold bg-emerald-600 text-white hover:bg-emerald-700 transition">
                ✓ Aprobar
              </button>
            ) : (
              <div className="px-3 py-2 rounded-xl text-sm font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                ✓ Aprobado
              </div>
            )}
            <button onClick={deleteQuote}
              className="px-3 py-2 rounded-xl text-sm font-medium border border-rose-200 text-rose-500 hover:bg-rose-50 transition"
              title="Eliminar presupuesto">
              🗑️ Eliminar
            </button>
          </div>
        </div>

        {/* ── PANEL DE TOTALES ───────────────────────────────── */}
        <div className="mt-5 grid grid-cols-2 md:grid-cols-4 gap-3">
          <TotalCard label="Subtotal"  value={money.format(itemsSubtotal)}  color="text-gray-700" bg="bg-gray-50" />
          <TotalCard label="Total"     value={money.format(computedTotal)}  color="text-gray-900 font-bold" bg="bg-gray-50" />
          <TotalCard label="Pagado"    value={money.format(paidAmount)}     color="text-emerald-700" bg="bg-emerald-50" />
          <TotalCard
            label={balance > 0 ? 'Saldo pendiente' : balance < 0 ? 'Excedente' : '¡Saldado!'}
            value={money.format(Math.abs(balance))}
            color={balance > 0 ? 'text-rose-700 font-bold' : balance < 0 ? 'text-amber-700' : 'text-emerald-700 font-bold'}
            bg={balance > 0 ? 'bg-rose-50' : balance < 0 ? 'bg-amber-50' : 'bg-emerald-50'}
          />
        </div>

        {/* Barra de progreso de pago */}
        {computedTotal > 0 && (
          <div className="mt-4">
            <div className="flex items-center justify-between text-xs text-gray-400 mb-1">
              <span>Progreso de pago</span>
              <span className="font-semibold text-gray-600">{paidPct}%</span>
            </div>
            <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${paidPct}%`,
                  background: paidPct >= 100 ? '#22c55e' : paidPct >= 50 ? '#2B9C93' : '#f59e0b',
                }}
              />
            </div>
          </div>
        )}
      </div>

      {/* ══ TABS ════════════════════════════════════════════════ */}
      <div className="flex gap-1 bg-white rounded-2xl border border-gray-200 p-1 overflow-x-auto no-scrollbar">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id as any)}
            className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition flex-1 justify-center ${
              activeTab === t.id ? 'bg-brand text-white shadow-sm' : 'text-gray-600 hover:bg-gray-50'
            }`}>
            <span>{t.icon}</span>
            <span>{t.label}</span>
            {t.badge !== null && t.badge > 0 && (
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${activeTab === t.id ? 'bg-white/20 text-white' : 'bg-brand/10 text-brand'}`}>
                {t.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ══ TAB: SERVICIOS ══════════════════════════════════════ */}
      {activeTab === 'servicios' && (
        <div className="space-y-4">

          {/* Formulario agregar */}
          <div className="card p-5">
            <div className="text-sm font-bold text-gray-700 mb-4 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-brand text-white text-xs flex items-center justify-center">+</span>
              Agregar servicio
            </div>
            <div ref={suggestRef}>
            <form onSubmit={addItem} className="space-y-3">
              {/* Autocomplete */}
              <div className="relative">
                <label className="text-xs font-medium text-gray-500 mb-1 block">Servicio / concepto</label>
                <input
                  ref={svcInputRef}
                  value={svcQuery}
                  onChange={e => { setSvcQuery(e.target.value); setSelSvcId(null); setShowSug(true); updateAnchor() }}
                  onFocus={() => { setShowSug(true); updateAnchor() }}
                  placeholder="Busca en catálogo o escribe un servicio nuevo…"
                  className="input w-full text-sm"
                  autoComplete="off"
                />
                {selSvcId && (
                  <span className="absolute right-3 top-8 text-xs text-emerald-600 font-medium">✓ En catálogo</span>
                )}
                {/* Dropdown autocomplete */}
                {mounted && showSug && suggestAnchor && (
                  <div ref={suggestDropRef}
                    style={{
                      position: 'fixed',
                      left: Math.max(8, Math.min(suggestAnchor.left, window.innerWidth - suggestAnchor.width - 8)),
                      top: (() => { const maxH = 300; const bs = window.innerHeight - suggestAnchor.bottom; return bs < maxH ? Math.max(8, suggestAnchor.top - 6 - maxH) : suggestAnchor.bottom + 6 })(),
                      width: suggestAnchor.width,
                      zIndex: 99999,
                    }}
                    className="bg-white rounded-2xl border border-gray-200 shadow-xl overflow-hidden max-h-[300px] overflow-y-auto"
                  >
                    {/* Dar de alta en catálogo */}
                    {svcQuery.trim() && !hasExactMatch() && (
                      <button type="button" disabled={savingCat}
                        onMouseDown={e => { e.preventDefault(); void createServiceFromCurrent() }}
                        className="w-full text-left px-4 py-3 border-b border-gray-100 hover:bg-brand/5 flex items-center justify-between gap-3 transition">
                        <span className="text-sm">
                          <span className="text-brand font-semibold">➕ Guardar en catálogo:</span>
                          <span className="ml-2 text-gray-700">"{svcQuery.trim()}"</span>
                        </span>
                        <span className="text-xs text-gray-400 shrink-0">{savingCat ? 'Guardando…' : money.format(addUnit)}</span>
                      </button>
                    )}
                    {suggestions.length === 0 ? (
                      <div className="px-4 py-3 text-sm text-gray-400">Escribe para buscar en catálogo o historial</div>
                    ) : suggestions.map(s => (
                      <button type="button" key={s.key}
                        onMouseDown={e => { e.preventDefault(); pickSuggestion(s) }}
                        className="w-full text-left px-4 py-2.5 hover:bg-gray-50 flex items-center justify-between gap-3 transition border-b border-gray-50 last:border-0">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-sm text-gray-800 truncate">{s.name}</span>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold shrink-0 ${s.source === 'catalog' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-gray-100 text-gray-500'}`}>
                            {s.source === 'catalog' ? 'Catálogo' : 'Historial'}
                          </span>
                        </div>
                        <span className="text-sm font-semibold text-gray-700 shrink-0">{money.format(s.unit_price)}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Cantidad</label>
                  <input type="number" step="0.01" min="0" value={addQty} onChange={e => setAddQty(Number(e.target.value||0))} className="input text-sm w-full" placeholder="1" />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Precio unitario</label>
                  <input type="number" step="0.01" min="0" value={addUnit} onChange={e => setAddUnit(Number(e.target.value||0))} className="input text-sm w-full" placeholder="$0.00" />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Descuento</label>
                  <input type="number" step="0.01" min="0" value={addDisc} onChange={e => setAddDisc(Number(e.target.value||0))} className="input text-sm w-full" placeholder="$0.00" />
                </div>
              </div>

              {/* Preview del total de la línea */}
              {(addQty > 0 && addUnit > 0) && (
                <div className="flex items-center justify-between text-sm px-1">
                  <span className="text-gray-400">Total de esta partida:</span>
                  <span className="font-bold text-brand">{money.format(Math.max(0, addQty * addUnit - addDisc))}</span>
                </div>
              )}

              <button type="submit" disabled={!svcQuery.trim() || addingItem}
                className={`btn w-full text-sm ${(!svcQuery.trim() || addingItem) ? 'opacity-60 cursor-not-allowed' : ''}`}>
                {addingItem ? 'Agregando…' : '+ Agregar servicio'}
              </button>
            </form>
          </div>

          {/* Lista de partidas */}
          <div className="card overflow-hidden">
            {items.length === 0 ? (
              <div className="p-10 text-center text-gray-400">
                <div className="text-4xl mb-2">🩺</div>
                <div className="text-sm">Sin servicios. Agrega el primer concepto arriba.</div>
              </div>
            ) : (
              <>
                {/* Cabecera */}
                <div className="grid grid-cols-12 gap-2 px-5 py-2.5 bg-gray-50 border-b border-gray-100 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  <div className="col-span-5">Servicio</div>
                  <div className="col-span-2 text-right">Cant.</div>
                  <div className="col-span-2 text-right">Unitario</div>
                  <div className="col-span-2 text-right">Total</div>
                  <div className="col-span-1"/>
                </div>

                <div className="divide-y divide-gray-50">
                  {items.map(it => {
                    const qty  = Number(it.quantity || 0)
                    const unit = Number(it.unit_price || 0)
                    const dsc  = Number(it.discount ?? 0)
                    const line = Math.max(0, qty * unit - dsc)
                    const isEd = editingId === it.id

                    return (
                      <div key={it.id} className={`grid grid-cols-12 gap-2 px-5 py-3 items-center group hover:bg-gray-50/60 transition ${isEd ? 'bg-brand/5' : ''}`}>
                        {/* Descripción */}
                        <div className="col-span-5">
                          {isEd
                            ? <input value={edDesc} onChange={e => setEdDesc(e.target.value)} className="input text-sm w-full" autoFocus />
                            : <div className="text-sm font-medium text-gray-800">{it.description}</div>
                          }
                          {dsc > 0 && !isEd && <div className="text-xs text-amber-600 mt-0.5">Descuento: {money.format(dsc)}</div>}
                        </div>

                        {/* Cantidad */}
                        <div className="col-span-2 text-right">
                          {isEd
                            ? <input type="number" step="0.01" value={edQty} onChange={e => setEdQty(Number(e.target.value||0))} className="input text-sm w-full text-right" />
                            : <span className="text-sm text-gray-600">{qty % 1 === 0 ? qty : qty.toFixed(2)}</span>
                          }
                        </div>

                        {/* Unitario */}
                        <div className="col-span-2 text-right">
                          {isEd
                            ? <input type="number" step="0.01" value={edUnit} onChange={e => setEdUnit(Number(e.target.value||0))} className="input text-sm w-full text-right" />
                            : <span className="text-sm text-gray-600">{money.format(unit)}</span>
                          }
                        </div>

                        {/* Total */}
                        <div className="col-span-2 text-right">
                          <span className="text-sm font-semibold text-gray-800">
                            {isEd ? money.format(Math.max(0, edQty*edUnit-edDisc)) : money.format(line)}
                          </span>
                        </div>

                        {/* Acciones */}
                        <div className="col-span-1 flex items-center justify-end gap-1">
                          {isEd ? (
                            <>
                              <button type="button" onClick={saveEdit} disabled={savingEdit}
                                className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 hover:bg-emerald-200 flex items-center justify-center text-xs transition" title="Guardar">
                                {savingEdit ? '…' : '✓'}
                              </button>
                              <button type="button" onClick={() => setEditingId(null)}
                                className="w-7 h-7 rounded-lg bg-gray-100 text-gray-500 hover:bg-gray-200 flex items-center justify-center text-xs transition" title="Cancelar">
                                ✕
                              </button>
                            </>
                          ) : (
                            <>
                              <button type="button" onClick={() => startEdit(it)}
                                className="w-7 h-7 rounded-lg text-brand hover:bg-brand/10 flex items-center justify-center text-xs transition opacity-0 group-hover:opacity-100" title="Editar">
                                ✏️
                              </button>
                              <button type="button" onClick={() => removeItem(it.id)}
                                className="w-7 h-7 rounded-lg text-rose-500 hover:bg-rose-50 flex items-center justify-center text-xs transition opacity-0 group-hover:opacity-100" title="Eliminar">
                                ✕
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>

                {/* Footer con subtotal */}
                <div className="px-5 py-3 bg-gray-50 border-t border-gray-100 flex items-center justify-end gap-3">
                  <span className="text-sm text-gray-500">Subtotal de partidas:</span>
                  <span className="text-base font-bold text-gray-800">{money.format(itemsSubtotal)}</span>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ══ TAB: PAGOS ══════════════════════════════════════════ */}
      {activeTab === 'pagos' && (
        <div className="space-y-4">

          {/* Resumen de pago */}
          <div className="card p-5">
            <div className="text-sm font-bold text-gray-700 mb-4">Registrar pago</div>
            <form onSubmit={addPayment} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Fecha y hora</label>
                  <input type="datetime-local" className="input text-sm w-full" value={payDate} onChange={e => setPayDate(e.target.value)} />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Método de pago</label>
                  <div className="flex gap-1.5 flex-wrap">
                    {(['efectivo','transferencia','tarjeta','otros'] as Payment['method'][]).map(m => (
                      <button type="button" key={m} onClick={() => setPayMethod(m)}
                        className={`px-2.5 py-1.5 rounded-lg text-xs font-medium border transition ${payMethod === m ? 'bg-brand text-white border-transparent' : 'bg-white border-gray-200 text-gray-600 hover:border-brand'}`}>
                        {METHOD_LABEL[m]}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Monto</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                    <input type="number" step="0.01" min="0" className="input text-sm w-full pl-7"
                      placeholder={balance > 0 ? String(Math.round(balance)) : '0'}
                      value={payAmt || ''} onChange={e => setPayAmt(Number(e.target.value || 0))} />
                  </div>
                  {balance > 0 && (
                    <button type="button" onClick={() => setPayAmt(Math.round(balance))}
                      className="mt-1 text-xs text-brand hover:underline">
                      Usar saldo completo ({money.format(balance)})
                    </button>
                  )}
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Referencia / folio</label>
                  <input className="input text-sm w-full" placeholder="ej. SPEI-12345" value={payRef} onChange={e => setPayRef(e.target.value)} />
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Notas</label>
                <input className="input text-sm w-full" placeholder="Observaciones del pago…" value={payNotes} onChange={e => setPayNotes(e.target.value)} />
              </div>

              <button type="submit" disabled={savingPay || !payAmt}
                className={`btn w-full text-sm ${(!payAmt || savingPay) ? 'opacity-60 cursor-not-allowed' : ''}`}>
                {savingPay ? 'Registrando…' : '✓ Registrar pago'}
              </button>
            </form>
          </div>

          {/* Historial de pagos */}
          <div className="card overflow-hidden">
            {payments.length === 0 ? (
              <div className="p-10 text-center text-gray-400">
                <div className="text-4xl mb-2">💳</div>
                <div className="text-sm">Sin pagos registrados aún</div>
              </div>
            ) : (
              <>
                <div className="px-5 py-3 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Historial de pagos</span>
                  <span className="text-sm font-bold text-emerald-700">{money.format(paidAmount)} pagado</span>
                </div>
                <div className="divide-y divide-gray-50">
                  {payments.map(p => (
                    <div key={p.id} className="flex items-center gap-4 px-5 py-3.5 group hover:bg-gray-50/60 transition">
                      <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-base shrink-0">
                        {p.method === 'efectivo' ? '💵' : p.method === 'transferencia' ? '🏦' : p.method === 'tarjeta' ? '💳' : '📋'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold text-gray-800">{METHOD_LABEL[p.method] ?? p.method}</div>
                        <div className="text-xs text-gray-400 mt-0.5">
                          {fmtMX(p.paid_at)}
                          {p.reference && <span className="ml-2">· Ref: {p.reference}</span>}
                          {p.notes     && <span className="ml-2">· {p.notes}</span>}
                        </div>
                      </div>
                      <div className="text-base font-bold text-emerald-700 shrink-0">{money.format(Number(p.amount||0))}</div>
                      <button type="button" onClick={() => removePayment(p.id)}
                        className="w-7 h-7 rounded-lg text-rose-400 hover:bg-rose-50 flex items-center justify-center text-xs transition opacity-0 group-hover:opacity-100">
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ══ TAB: AJUSTES ════════════════════════════════════════ */}
      {activeTab === 'ajustes' && (
        <form id="quote-header-form" onSubmit={saveHeader} className="card p-5 space-y-4">
          <div className="text-sm font-bold text-gray-700 mb-2">Configuración del presupuesto</div>

          <div className="grid sm:grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Vigencia hasta</label>
              <input name="valid_until" type="date" defaultValue={q.valid_until ?? ''} className="input text-sm w-full" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Descuento general ($)</label>
              <input name="discount" type="number" step="0.01" defaultValue={q.discount ?? 0} className="input text-sm w-full" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Impuestos ($)</label>
              <input name="tax" type="number" step="0.01" defaultValue={q.tax ?? 0} className="input text-sm w-full" />
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Términos y condiciones</label>
              <textarea name="terms" defaultValue={q.terms ?? ''} rows={5} className="input text-sm w-full" placeholder="Condiciones de pago, garantías, políticas de cancelación…" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Notas internas</label>
              <textarea name="notes" defaultValue={q.notes ?? ''} rows={5} className="input text-sm w-full" placeholder="Notas para el expediente (no se imprimen)…" />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3">
            {savedHdr && <span className="text-sm text-emerald-600 font-medium">✓ Guardado</span>}
            <button type="submit" form="quote-header-form" disabled={savingHdr} className="btn text-sm">
              {savingHdr ? 'Guardando…' : 'Guardar ajustes'}
            </button>
          </div>
        </form>
      )}

      {/* ══ TAB: FIRMA ══════════════════════════════════════════ */}
      {activeTab === 'firma' && (
        <div className="card p-5">
          <div className="text-sm font-bold text-gray-700 mb-4">Firma del paciente</div>
          <SignaturePadKit patientId={q.patient_id} consentId={`quote-${q.id}`} />
        </div>
      )}

      {/* Footer nav */}
      <div className="flex items-center justify-between text-sm pt-2">
        <Link href="/quotes" className="text-gray-400 hover:text-brand transition">← Volver a presupuestos</Link>
        <Link href={`/quotes/${q.id}/print`} className="text-gray-400 hover:text-brand transition">Imprimir →</Link>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg) } }
        .no-scrollbar::-webkit-scrollbar { display: none }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none }
      `}</style>
    </div>
  )
}

/* ── Subcomponentes ──────────────────────────────────────────── */
function TotalCard({ label, value, color, bg }: { label: string; value: string; color: string; bg: string }) {
  return (
    <div className={`rounded-2xl border ${bg} border-gray-200 p-4`}>
      <div className={`text-lg tabular-nums leading-tight ${color}`}>{value}</div>
      <div className="text-xs text-gray-400 mt-0.5">{label}</div>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const s = status?.toLowerCase() ?? 'borrador'
  const meta: Record<string, string> = {
    borrador: 'bg-gray-100 text-gray-500 border-gray-200',
    aprobado: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    aceptado: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    pagado:   'bg-teal-50 text-teal-700 border-teal-200',
    cancelado:'bg-red-50 text-red-500 border-red-200',
  }
  const label: Record<string, string> = { borrador:'Borrador', aprobado:'Aprobado', aceptado:'Aceptado', pagado:'Pagado', cancelado:'Cancelado' }
  return (
    <span className={`text-xs px-2.5 py-1 rounded-full border font-semibold ${meta[s] ?? meta.borrador}`}>
      {label[s] ?? status}
    </span>
  )
}

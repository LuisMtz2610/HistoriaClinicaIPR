// app/quotes/[id]/print/page.tsx
import { createClient } from '@supabase/supabase-js'
import PrintActions from './print-actions'

export const dynamic = 'force-dynamic'

type Item = {
  id: string
  concept?: string | null
  description?: string | null
  quantity: number
  unit_price: number
  discount?: number | null
  line_total: number
  notes?: string | null
}

export default async function PrintQuote({ params }: { params: { id: string } }) {
  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  // Presupuesto
  const { data: quote, error: qErr } = await sb
    .from('quotes')
    .select('id, folio_code, patient_id, created_at, valid_until, discount, tax, terms, signature_path')
    .eq('id', params.id)
    .single()
  if (qErr || !quote) {
    return <div className="p-6 text-red-600">No se pudo cargar el presupuesto: {qErr?.message}</div>
  }

  // Paciente
  const { data: patient } = await sb
    .from('patients')
    .select('first_name,last_name,phone,email')
    .eq('id', quote.patient_id)
    .single()

  // Partidas con fallback concept/description
  let items: Item[] = []
  {
    const a = await sb
      .from('quote_items')
      .select('id, concept, description, quantity, unit_price, discount, line_total, notes')
      .eq('quote_id', params.id)
      .order('id', { ascending: true })
    if (!a.error) {
      items = (a.data as any) || []
    } else {
      const b = await sb
        .from('quote_items')
        .select('id, description, quantity, unit_price, discount, line_total, notes')
        .eq('quote_id', params.id)
        .order('id', { ascending: true })
      if (b.error) {
        return <div className="p-6 text-red-600">No se pudieron cargar las partidas: {b.error.message}</div>
      }
      items = (b.data as any) || []
    }
  }

  // Totales
  const itemsSubtotal = (items || []).reduce((s, it) => {
    const qty = Number(it.quantity || 0)
    const unit = Number(it.unit_price || 0)
    const dsc = Number((it as any).discount || 0)
    const line = Math.max(0, qty * unit - dsc)
    return s + (isFinite(line) ? line : 0)
  }, 0)
  const discount = Number(quote.discount || 0)
  const tax = Number(quote.tax || 0)
  const total = Number(itemsSubtotal - discount + tax)

  // Firma (si existe)
  const signatureUrl = quote.signature_path
    ? await signedUrl(sb, 'clinical-files', quote.signature_path)
    : ''

  // Encabezado clínica
  const clinicHeader = {
    name: 'Clínica Odontológica Integral — Dra. Isabel Paván Romero',
    doctor: 'Cirujano Dentista – Céd. Prof. 5454329',
    specialty: 'Especialidad en Rehabilitación Bucal',
    masters: 'Maestría en Rehabilitación Oral – Céd. Prof. 9319256',
    university: 'Universidad Veracruzana',
    address: 'Deportivo Veracruzano No 29, Fracc. Galaxia, C.P. 94294, Boca del Río, Veracruz',
  }

  const fmtDateTimeMX = (iso?: string | null) =>
    iso
      ? new Intl.DateTimeFormat('es-MX', { dateStyle: 'short', timeStyle: 'short', timeZone: 'America/Mexico_City' }).format(new Date(iso))
      : '—'

  const fmtDateOnlyMX = (ymd?: string | null) => {
    if (!ymd) return '—'
    const [y, m, d] = ymd.split('-').map((x) => Number(x))
    if (!y || !m || !d) return ymd
    const dd = String(d).padStart(2, '0')
    const mm = String(m).padStart(2, '0')
    return `${dd}/${mm}/${y}`
  }

  return (
    <div className="max-w-[880px] mx-auto my-6 px-4 print:my-0">
      {/* APAGAR layout global (navbar/header) en esta vista */}
      <style>{`
        :is(header, nav, .site-header, .navbar, .topbar, .app-header, .app-navbar){ display:none !important }
        @media print {
          :is(header, nav, .site-header, .navbar, .topbar, .app-header, .app-navbar){ display:none !important }
        }
        @page { size: A4; margin: 16mm; }
        body { background:#fff }
        .card { border: 1px solid #e5e7eb; border-radius: 12px; padding: 16px; margin-top: 12px; }
        table { width: 100%; border-collapse: collapse; }
        th, td { padding: 8px; border-bottom: 1px solid #e5e7eb; font-size: 14px; vertical-align: top; }
        th { text-align: left; background: #f9fafb; }
        .right { text-align: right; }
        .totals td { font-weight: 600; }
        .muted { color:#666; font-size:12px; }
        .row { display:flex; gap:12px; }
        .col { flex:1 1 0; }
        .sig { margin-top: 28px; min-height: 100px; border:1px dashed #cbd5e1; display:flex; align-items:center; justify-content:center; }
        @media print { .no-print { display:none } }
      `}</style>

      {/* Encabezado con logo (coloca /public/clinica-logo.png) */}
      <div className="card">
        <div className="flex items-center gap-3">
          <img src="/clinica-logo.png" alt="Logo" width={56} height={56} />
          <div>
            <div className="text-xl font-semibold">{clinicHeader.name}</div>
            <div className="muted">
              {clinicHeader.doctor} · {clinicHeader.specialty} · {clinicHeader.masters}<br />
              {clinicHeader.university} · {clinicHeader.address}
            </div>
          </div>
        </div>
      </div>

      {/* Título + datos + botón imprimir */}
      <div className="card">
        <div className="row">
          <div className="col">
            <div className="text-xl font-semibold">Presupuesto</div>
            <div className="muted">Folio: {(quote as any).folio_code || quote.id}</div>
          </div>
          <div className="col right">
            <div><b>Fecha:</b> {fmtDateTimeMX(quote.created_at)}</div>
            <div><b>Vigencia:</b> {fmtDateOnlyMX(quote.valid_until)}</div>
          </div>
        </div>

        <div className="mt-2">
          <b>Paciente:</b>{' '}
          {patient ? `${patient.last_name}, ${patient.first_name}` : quote.patient_id}
          {patient?.phone ? ` · ${patient.phone}` : ''}
          {patient?.email ? ` · ${patient.email}` : ''}
        </div>

        <div className="no-print mt-3">
          <PrintActions quoteId={quote.id} />
        </div>
      </div>

      {/* Partidas */}
      <div className="card">
        <table>
          <thead>
            <tr>
              <th style={{width:'55%'}}>Servicio</th>
              <th style={{width:'15%'}}>Cantidad</th>
              <th style={{width:'15%'}}>Unitario</th>
              <th style={{width:'15%'}}>Descuento</th>
              <th style={{width:'15%'}} className="right">Total</th>
            </tr>
          </thead>
          <tbody>
            {(items || []).map((it) => {
              const name = (it.concept ?? it.description ?? '').toString() || '—'
              const qty = Number(it.quantity || 0)
              const unit = Number(it.unit_price || 0)
              const dsc = Number((it as any).discount || 0)
              const line = Math.max(0, qty * unit - dsc)
              return (
                <tr key={it.id}>
                  <td>{name}</td>
                  <td>{qty.toFixed(2)}</td>
                  <td>${unit.toFixed(2)}</td>
                  <td>${dsc.toFixed(2)}</td>
                  <td className="right">${line.toFixed(2)}</td>
                </tr>
              )
            })}
            {(!items || items.length === 0) && (
              <tr><td className="muted" colSpan={5}>Sin partidas.</td></tr>
            )}
          </tbody>
          <tfoot>
            <tr className="totals"><td colSpan={4} className="right">Subtotal</td><td className="right">${itemsSubtotal.toFixed(2)}</td></tr>
            <tr className="totals"><td colSpan={4} className="right">Descuento general</td><td className="right">-${discount.toFixed(2)}</td></tr>
            <tr className="totals"><td colSpan={4} className="right">Impuestos</td><td className="right">${tax.toFixed(2)}</td></tr>
            <tr className="totals"><td colSpan={4} className="right">Total</td><td className="right">${total.toFixed(2)}</td></tr>
          </tfoot>
        </table>
      </div>

      {/* Términos + firma */}
      <div className="card">
        <div><b>Condiciones de pago / Términos</b></div>
        <div style={{whiteSpace:'pre-wrap', marginTop:6}}>{quote.terms || '—'}</div>

        <div className="row mt-4">
          <div className="col">
            <div className="muted">Firma de aceptación del paciente</div>
            <div className="sig">
              {signatureUrl
                ? <img src={signatureUrl} style={{maxHeight:110}} />
                : <span className="muted">Sin firma</span>}
            </div>
          </div>
          <div className="col">
            <div className="muted">Fecha de impresión</div>
            <div className="mt-2">{fmtDateTimeMX(new Date().toISOString())}</div>
          </div>
        </div>
      </div>
    </div>
  )
}

async function signedUrl(sb: any, bucket: string, path: string) {
  if (!path) return ''
  const { data, error } = await sb.storage.from(bucket).createSignedUrl(path, 60 * 5)
  return error ? '' : data.signedUrl
}

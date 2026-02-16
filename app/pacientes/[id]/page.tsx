'use client'

import * as React from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import useSWR from 'swr'
import { supabase } from '@/lib/supabase'
import UploadPatientFile from '@/components/UploadPatientFile'
import EditPatientModal from '@/components/EditPatientModal'
import MobileCaptureKit from '@/components/kit/MobileCaptureKit'
import { fmtDateDDMMYYYY } from '@/lib/date'
import PatientFilesGrid from '@/app/(clinic)/_components/PatientFilesGrid'

const FILES_BUCKET = 'clinical-files'

/* ══════════════════════════════════════════════════════════════
   TIPOS
══════════════════════════════════════════════════════════════ */
type Patient = {
  id: string; clinic_id: string | null
  first_name: string; last_name: string
  sex: string | null; gender: string | null
  birth_date: string | null
  birth_state: string | null; birth_city: string | null
  occupation: string | null; schooling: string | null
  marital_status: string | null
  phone: string | null; office_phone: string | null; email: string | null
  last_visit_date: string | null; last_visit_reason: string | null
  allergies: string | null; allergies_summary: string | null
  medical_history: string | null
  blood_type: string | null; rh_factor: string | null
  address_street: string | null; address_ext_no: string | null
  address_int_no: string | null; address_colony: string | null
  address_municipality: string | null; address_state: string | null
}
type ClinicalForm  = { id: string; form_type: string; form_date: string }
type FileRow       = { id: string; patient_id: string | null; path: string; kind: string | null; created_at: string; meta: any }
type GridFileItem  = { id?: string; path?: string; name?: string; url: string; created_at?: string; type?: string }
type ApptRow       = { id: string; starts_at: string; status: string; reason: string | null }
type QuoteRow      = { id: string; created_at: string; status: string; total: number | null; folio_code: string | null }

/* ══════════════════════════════════════════════════════════════
   FETCHERS
══════════════════════════════════════════════════════════════ */
const fetchPatient = async (id: string) => {
  const { data, error } = await supabase.from('patients').select('*').eq('id', id).single()
  if (error) throw error; return data as Patient
}
const fetchLastF1 = async (id: string) => {
  const { data } = await supabase.from('clinical_forms')
    .select('id, form_type, form_date').eq('patient_id', id)
    .order('form_date', { ascending: false }).limit(1).maybeSingle()
  return data as ClinicalForm | null
}
const fetchFiles = async (id: string) => {
  const { data, error } = await supabase.from('files')
    .select('id, patient_id, path, kind, created_at, meta').eq('patient_id', id)
    .order('created_at', { ascending: false })
  if (error) throw error; return (data ?? []) as FileRow[]
}
const fetchAppts = async (id: string) => {
  const { data } = await supabase.from('appointments')
    .select('id, starts_at, status, reason').eq('patient_id', id)
    .order('starts_at', { ascending: false }).limit(5)
  return (data ?? []) as ApptRow[]
}
const fetchQuotes = async (id: string) => {
  const { data } = await supabase.from('quotes')
    .select('id, created_at, status, total, folio_code').eq('patient_id', id)
    .order('created_at', { ascending: false }).limit(5)
  return (data ?? []) as QuoteRow[]
}

/* ══════════════════════════════════════════════════════════════
   HELPERS
══════════════════════════════════════════════════════════════ */
function calcAge(birth?: string | null) {
  if (!birth) return null
  const [y, m, d] = birth.split('-').map(Number)
  const t = new Date(); let a = t.getFullYear() - y
  if (t.getMonth() + 1 < m || (t.getMonth() + 1 === m && t.getDate() < d)) a--
  return a
}

function initials(p: Patient) {
  return `${p.first_name?.[0] ?? ''}${p.last_name?.[0] ?? ''}`.toUpperCase()
}

/* ══════════════════════════════════════════════════════════════
   TABS
══════════════════════════════════════════════════════════════ */
type Tab = 'resumen' | 'datos' | 'citas' | 'presupuestos' | 'archivos' | 'acciones'
const TABS: { id: Tab; icon: string; label: string }[] = [
  { id: 'resumen',      icon: '🏠', label: 'Resumen' },
  { id: 'datos',        icon: '👤', label: 'Datos' },
  { id: 'citas',        icon: '📅', label: 'Citas' },
  { id: 'presupuestos', icon: '💰', label: 'Presupuestos' },
  { id: 'archivos',     icon: '📁', label: 'Archivos' },
  { id: 'acciones',     icon: '⚡', label: 'Acciones' },
]

/* ══════════════════════════════════════════════════════════════
   PÁGINA PRINCIPAL
══════════════════════════════════════════════════════════════ */
export default function PatientView() {
  const id = String(useParams().id)
  const patientQ = useSWR(['patient', id], () => fetchPatient(id))
  const f1Q      = useSWR(['lastF1',  id], () => fetchLastF1(id))
  const apptsQ   = useSWR(['appts',   id], () => fetchAppts(id))
  const quotesQ  = useSWR(['quotes',  id], () => fetchQuotes(id))

  const [tab,      setTab]      = React.useState<Tab>('resumen')
  const [showEdit, setShowEdit] = React.useState(false)

  if (patientQ.isLoading) return (
    <div className="flex items-center justify-center h-60 gap-3 text-gray-400">
      <div style={{ width: 20, height: 20, borderRadius: '50%', border: '2.5px solid #2B9C93', borderTopColor: 'transparent', animation: 'spin 0.7s linear infinite' }}/>
      Cargando…
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
  if (patientQ.error || !patientQ.data) return (
    <div className="card p-6 text-red-600">Error al cargar paciente</div>
  )

  const p    = patientQ.data
  const age  = calcAge(p.birth_date)
  const sex  = p.sex ?? p.gender
  const hasAlert = !!(p.allergies_summary || p.allergies)

  return (
    <div className="flex gap-5 items-start" style={{ minHeight: 'calc(100vh - 120px)' }}>

      {/* ══════════════════════════════════════════════════
          SIDEBAR IZQUIERDO — sticky
      ══════════════════════════════════════════════════ */}
      <aside className="hidden lg:flex flex-col gap-3 w-64 xl:w-72 shrink-0 sticky top-24">

        {/* Card identidad */}
        <div className="rounded-2xl bg-white border border-gray-200 overflow-hidden shadow-sm">
          {/* Banda superior */}
          <div style={{ background: 'linear-gradient(135deg, #2B9C93 0%, #1a7a72 100%)', padding: '20px 20px 40px' }}>
            <div className="flex items-start justify-between">
              <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center text-white text-xl font-bold select-none border border-white/30">
                {initials(p)}
              </div>
              <button
                onClick={() => setShowEdit(true)}
                className="w-8 h-8 rounded-xl bg-white/20 hover:bg-white/30 flex items-center justify-center text-white transition text-sm"
                title="Editar datos"
              >✏️</button>
            </div>
          </div>

          {/* Nombre (overlap sobre la banda) */}
          <div style={{ margin: '-24px 16px 0', position: 'relative', zIndex: 1 }}>
            <div className="bg-white rounded-xl border border-gray-100 px-4 py-3 shadow-sm">
              <div className="font-bold text-gray-900 text-base leading-tight">
                {p.last_name}, {p.first_name}
              </div>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                {age !== null && (
                  <span className="text-xs text-gray-400">{age} años</span>
                )}
                {sex && (
                  <span className="text-xs text-gray-400">
                    {sex === 'M' ? '♂ Masc.' : sex === 'F' ? '♀ Fem.' : sex}
                  </span>
                )}
                {p.birth_date && (
                  <span className="text-xs text-gray-400">{fmtDateDDMMYYYY(p.birth_date)}</span>
                )}
              </div>
            </div>
          </div>

          {/* Datos clínicos críticos */}
          <div className="px-4 py-4 space-y-2 mt-1">
            {/* Sangre */}
            <div className={`flex items-center gap-2.5 rounded-xl px-3 py-2.5 ${
              p.blood_type ? 'bg-rose-50 border border-rose-100' : 'bg-gray-50 border border-gray-100'
            }`}>
              <span className="text-lg">🩸</span>
              <div>
                <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Tipo de sangre</div>
                <div className={`text-sm font-bold ${p.blood_type ? 'text-rose-700' : 'text-gray-300'}`}>
                  {p.blood_type ? `${p.blood_type}${p.rh_factor ?? ''}` : 'No registrado'}
                </div>
              </div>
            </div>

            {/* Alergias */}
            <div className={`flex items-start gap-2.5 rounded-xl px-3 py-2.5 ${
              hasAlert ? 'bg-amber-50 border border-amber-200' : 'bg-gray-50 border border-gray-100'
            }`}>
              <span className="text-lg mt-0.5">⚠️</span>
              <div className="min-w-0">
                <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Alergias</div>
                <div className={`text-xs leading-snug mt-0.5 ${hasAlert ? 'text-amber-800 font-medium' : 'text-gray-300'}`}>
                  {p.allergies_summary || p.allergies || 'Sin alergias registradas'}
                </div>
              </div>
            </div>

            {/* Contacto rápido */}
            {(p.phone || p.email) && (
              <div className="space-y-1 pt-1">
                {p.phone && (
                  <a href={`tel:${p.phone}`}
                    className="flex items-center gap-2 text-xs text-gray-600 hover:text-brand transition px-1 py-0.5 rounded-lg hover:bg-brand/5">
                    <span className="w-5 text-center">📞</span>
                    <span className="truncate">{p.phone}</span>
                  </a>
                )}
                {p.email && (
                  <a href={`mailto:${p.email}`}
                    className="flex items-center gap-2 text-xs text-gray-600 hover:text-brand transition px-1 py-0.5 rounded-lg hover:bg-brand/5">
                    <span className="w-5 text-center">✉️</span>
                    <span className="truncate">{p.email}</span>
                  </a>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Nav lateral */}
        <nav className="rounded-2xl bg-white border border-gray-200 overflow-hidden shadow-sm p-1.5">
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition text-left ${
                tab === t.id
                  ? 'bg-brand text-white font-semibold shadow-sm'
                  : 'text-gray-600 hover:bg-gray-50 font-medium'
              }`}
            >
              <span className="text-base w-5 text-center shrink-0">{t.icon}</span>
              <span>{t.label}</span>
              {tab === t.id && <span className="ml-auto text-white/60 text-xs">›</span>}
            </button>
          ))}
        </nav>

        {/* Links rápidos al registro */}
        <div className="rounded-2xl bg-white border border-gray-200 p-3 shadow-sm space-y-1">
          <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider px-2 pb-1">Acceso directo</div>
          {[
            { href: `/pacientes/${p.id}/historia`,     icon: '📋', label: 'Historia clínica' },
            { href: `/pacientes/${p.id}/odontogramas`, icon: '🦷', label: 'Odontogramas' },
            { href: `/pacientes/${p.id}/printables`,   icon: '🖨️', label: 'Imprimibles' },
          ].map(a => (
            <Link key={a.href} href={a.href}
              className="flex items-center gap-2.5 px-2 py-2 rounded-xl text-xs font-medium text-gray-600 hover:text-brand hover:bg-brand/5 transition">
              <span>{a.icon}</span>
              <span>{a.label}</span>
              <span className="ml-auto text-gray-300 text-xs">→</span>
            </Link>
          ))}
        </div>

        <Link href="/pacientes"
          className="text-xs text-center text-gray-400 hover:text-brand transition py-1">
          ← Volver a pacientes
        </Link>
      </aside>

      {/* ══════════════════════════════════════════════════
          CONTENIDO PRINCIPAL
      ══════════════════════════════════════════════════ */}
      <div className="flex-1 min-w-0 space-y-4">

        {/* Header móvil (solo visible en <lg) */}
        <div className="lg:hidden">
          <div className="card p-4 flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl shrink-0 flex items-center justify-center text-white font-bold"
              style={{ background: 'linear-gradient(135deg, #2B9C93, #1a7a72)' }}>
              {initials(p)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-bold text-gray-900">{p.last_name}, {p.first_name}</div>
              <div className="flex gap-2 flex-wrap mt-0.5">
                {age !== null && <span className="text-xs text-gray-400">{age} años</span>}
                {hasAlert && <span className="text-xs text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">⚠️ Alergias</span>}
                {p.blood_type && <span className="text-xs text-rose-700 bg-rose-50 border border-rose-100 px-2 py-0.5 rounded-full">🩸 {p.blood_type}{p.rh_factor ?? ''}</span>}
              </div>
            </div>
            <button onClick={() => setShowEdit(true)} className="btn text-sm shrink-0">✏️</button>
          </div>

          {/* Tabs scroll horizontal en móvil */}
          <div className="flex gap-1 overflow-x-auto py-1 px-0.5 mt-3 no-scrollbar">
            {TABS.map(t => (
              <button key={t.id} onClick={() => setTab(t.id)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium whitespace-nowrap shrink-0 transition ${
                  tab === t.id ? 'bg-brand text-white shadow-sm' : 'bg-white border border-gray-200 text-gray-600'
                }`}>
                <span>{t.icon}</span>
                <span>{t.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Contenido por tab */}
        {tab === 'resumen'      && <TabResumen      p={p} f1={f1Q.data ?? null} appts={apptsQ.data ?? []} quotes={quotesQ.data ?? []} loadingAppts={apptsQ.isLoading} loadingQuotes={quotesQ.isLoading} />}
        {tab === 'datos'        && <TabDatos        p={p} />}
        {tab === 'citas'        && <TabCitas        p={p} appts={apptsQ.data ?? []} loading={apptsQ.isLoading} />}
        {tab === 'presupuestos' && <TabPresupuestos p={p} quotes={quotesQ.data ?? []} loading={quotesQ.isLoading} />}
        {tab === 'archivos'     && <TabArchivos     p={p} />}
        {tab === 'acciones'     && <TabAcciones     p={p} />}
      </div>

      {/* Modal edición */}
      {showEdit && (
        <EditPatientModal
          patient={p}
          onClose={() => setShowEdit(false)}
          onSaved={() => { setShowEdit(false); patientQ.mutate() }}
        />
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg) } }
        .no-scrollbar::-webkit-scrollbar { display: none }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none }
      `}</style>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════
   TAB: RESUMEN
══════════════════════════════════════════════════════════════ */
function TabResumen({ p, f1, appts, quotes, loadingAppts, loadingQuotes }: {
  p: Patient; f1: ClinicalForm | null
  appts: ApptRow[]; quotes: QuoteRow[]
  loadingAppts: boolean; loadingQuotes: boolean
}) {
  const age = calcAge(p.birth_date)

  const nextAppt = appts.find(a => a.status === 'scheduled' && new Date(a.starts_at) > new Date())
  const lastAppt = appts.find(a => a.status === 'completed')
  const activeQuote = quotes.find(q => q.status !== 'cancelado' && q.status !== 'pagado')

  return (
    <div className="space-y-4">

      {/* Alertas médicas críticas — siempre arriba */}
      {(p.allergies_summary || p.allergies) && (
        <div className="rounded-2xl bg-amber-50 border border-amber-300 px-5 py-4 flex items-start gap-3">
          <span className="text-2xl shrink-0">⚠️</span>
          <div>
            <div className="font-bold text-amber-900 text-sm">Alerta de alergias</div>
            <div className="text-sm text-amber-800 mt-0.5">{p.allergies_summary || p.allergies}</div>
          </div>
        </div>
      )}

      {/* Métricas rápidas */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MetricCard icon="🎂" label="Edad" value={age !== null ? `${age} años` : '—'} sub={fmtDateDDMMYYYY(p.birth_date)} />
        <MetricCard icon="🩸" label="Sangre" value={p.blood_type ? `${p.blood_type}${p.rh_factor ?? ''}` : '—'} colorValue={p.blood_type ? 'text-rose-700' : undefined} />
        <MetricCard icon="📅" label="Próxima cita"
          value={nextAppt ? new Date(nextAppt.starts_at).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' }) : '—'}
          sub={nextAppt?.reason ?? undefined} href={nextAppt ? `/citas/${nextAppt.id}` : undefined}
        />
        <MetricCard icon="💰" label="Presupuesto activo"
          value={activeQuote ? `$${Number(activeQuote.total ?? 0).toLocaleString('es-MX')}` : '—'}
          href={activeQuote ? `/quotes/${activeQuote.id}` : undefined}
          colorValue={activeQuote ? 'text-emerald-700' : undefined}
        />
      </div>

      {/* Acceso a historia clínica */}
      <div className="card p-5 flex items-center gap-4">
        <div className="w-12 h-12 rounded-2xl bg-brand/10 flex items-center justify-center text-2xl shrink-0">📋</div>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-gray-800">Historia clínica</div>
          <div className="text-sm text-gray-400 mt-0.5">
            {f1
              ? `Último registro: ${new Date(f1.form_date).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })}`
              : 'Sin historia registrada aún'}
          </div>
        </div>
        <Link href={`/pacientes/${p.id}/historia`}
          className="btn text-sm shrink-0">
          {f1 ? 'Ver historia →' : 'Capturar →'}
        </Link>
      </div>

      {/* Últimas citas */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="font-semibold text-gray-800 flex items-center gap-2">
            <span>📅</span> Citas recientes
          </div>
          <Link href={`/citas/new?patient_id=${p.id}`} className="text-xs text-brand hover:underline font-medium">
            + Nueva cita
          </Link>
        </div>
        {loadingAppts && <SkeletonList n={2} h={10} />}
        {!loadingAppts && appts.length === 0 && (
          <div className="text-sm text-gray-400 text-center py-4">Sin citas registradas</div>
        )}
        <div className="space-y-2">
          {appts.slice(0, 3).map(a => (
            <Link key={a.id} href={`/citas/${a.id}`}
              className="flex items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-gray-50 transition group">
              <div className={`w-2 h-2 rounded-full shrink-0 ${
                a.status === 'scheduled' ? 'bg-blue-400' :
                a.status === 'completed' ? 'bg-emerald-400' : 'bg-gray-300'
              }`}/>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-gray-800 truncate">{a.reason || 'Sin motivo'}</div>
                <div className="text-xs text-gray-400">
                  {new Date(a.starts_at).toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${
                a.status === 'scheduled' ? 'bg-blue-50 text-blue-700' :
                a.status === 'completed' ? 'bg-emerald-50 text-emerald-700' :
                'bg-gray-100 text-gray-400'
              }`}>
                {a.status === 'scheduled' ? 'Programada' : a.status === 'completed' ? 'Completada' : 'Cancelada'}
              </span>
            </Link>
          ))}
        </div>
        {appts.length > 3 && (
          <button onClick={() => {}} className="w-full mt-2 py-1.5 text-xs text-gray-400 hover:text-brand transition">
            Ver todas las citas →
          </button>
        )}
      </div>

      {/* Últimos presupuestos */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="font-semibold text-gray-800 flex items-center gap-2">
            <span>💰</span> Presupuestos
          </div>
          <Link href={`/quotes/new?patientId=${p.id}`} className="text-xs text-brand hover:underline font-medium">
            + Nuevo
          </Link>
        </div>
        {loadingQuotes && <SkeletonList n={2} h={10} />}
        {!loadingQuotes && quotes.length === 0 && (
          <div className="text-sm text-gray-400 text-center py-4">Sin presupuestos registrados</div>
        )}
        <div className="space-y-2">
          {quotes.slice(0, 3).map(q => (
            <Link key={q.id} href={`/quotes/${q.id}`}
              className="flex items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-gray-50 transition">
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-gray-800">
                  {q.folio_code ?? `Presupuesto`}
                </div>
                <div className="text-xs text-gray-400">
                  {new Date(q.created_at).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })}
                </div>
              </div>
              {q.total !== null && (
                <div className="text-sm font-bold text-gray-700 shrink-0">
                  ${Number(q.total).toLocaleString('es-MX')}
                </div>
              )}
              <QuoteStatusBadge status={q.status} />
            </Link>
          ))}
        </div>
      </div>

      {/* Antecedentes médicos */}
      {p.medical_history && (
        <div className="card p-5">
          <div className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
            <span>🏥</span> Antecedentes médicos
          </div>
          <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{p.medical_history}</p>
        </div>
      )}
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════
   TAB: DATOS PERSONALES
══════════════════════════════════════════════════════════════ */
function TabDatos({ p }: { p: Patient }) {
  return (
    <div className="space-y-4">

      <div className="grid md:grid-cols-2 gap-4">
        <InfoSection title="Identificación" icon="🪪">
          <InfoRow label="Nombre"       value={`${p.first_name} ${p.last_name}`} />
          <InfoRow label="Sexo"         value={p.sex === 'M' ? 'Masculino' : p.sex === 'F' ? 'Femenino' : (p.gender ?? null)} />
          <InfoRow label="Nacimiento"   value={fmtDateDDMMYYYY(p.birth_date)} />
          <InfoRow label="Lugar"        value={[p.birth_city, p.birth_state].filter(Boolean).join(', ') || null} />
          <InfoRow label="Escolaridad"  value={p.schooling} />
          <InfoRow label="Ocupación"    value={p.occupation} />
          <InfoRow label="Estado civil" value={p.marital_status} />
        </InfoSection>

        <InfoSection title="Contacto" icon="📱">
          {p.phone && (
            <div className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
              <span className="text-xs text-gray-400 w-28 shrink-0">Teléfono</span>
              <a href={`tel:${p.phone}`} className="text-sm text-brand hover:underline font-medium">{p.phone}</a>
            </div>
          )}
          {p.office_phone && (
            <div className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
              <span className="text-xs text-gray-400 w-28 shrink-0">Tel. oficina</span>
              <a href={`tel:${p.office_phone}`} className="text-sm text-brand hover:underline">{p.office_phone}</a>
            </div>
          )}
          {p.email && (
            <div className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
              <span className="text-xs text-gray-400 w-28 shrink-0">Email</span>
              <a href={`mailto:${p.email}`} className="text-sm text-brand hover:underline truncate max-w-[180px]">{p.email}</a>
            </div>
          )}
          <InfoRow label="Últ. visita"  value={fmtDateDDMMYYYY(p.last_visit_date)} />
          <InfoRow label="Motivo"       value={p.last_visit_reason} />
        </InfoSection>
      </div>

      <InfoSection title="Domicilio" icon="🏠">
        <div className="text-sm text-gray-700 py-1">
          {[p.address_street, p.address_ext_no, p.address_int_no ? `Int. ${p.address_int_no}` : ''].filter(Boolean).join(' ') || '—'}
          {(p.address_colony || p.address_municipality || p.address_state) && (
            <span className="text-gray-400">
              {' · '}{[p.address_colony, p.address_municipality, p.address_state].filter(Boolean).join(', ')}
            </span>
          )}
        </div>
      </InfoSection>

      <InfoSection title="Datos clínicos" icon="🩺">
        <InfoRow label="Tipo sangre"  value={p.blood_type ? `${p.blood_type} ${p.rh_factor ?? ''}` : null} />
        <InfoRow label="Alergias"     value={p.allergies_summary || p.allergies} />
        <InfoRow label="Antecedentes" value={p.medical_history} />
      </InfoSection>

    </div>
  )
}

/* ══════════════════════════════════════════════════════════════
   TAB: CITAS
══════════════════════════════════════════════════════════════ */
function TabCitas({ p, appts, loading }: { p: Patient; appts: ApptRow[]; loading: boolean }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="font-semibold text-gray-800">Historial de citas</div>
        <Link href={`/citas/new?patient_id=${p.id}`} className="btn text-sm">+ Nueva cita</Link>
      </div>

      {loading && <SkeletonList n={4} h={16} />}
      {!loading && appts.length === 0 && (
        <div className="card p-10 text-center">
          <div className="text-4xl mb-3">📅</div>
          <div className="font-semibold text-gray-500 mb-1">Sin citas registradas</div>
          <Link href={`/citas/new?patient_id=${p.id}`} className="btn mt-3 inline-block text-sm">Agendar primera cita</Link>
        </div>
      )}
      <div className="space-y-2">
        {appts.map(a => (
          <Link key={a.id} href={`/citas/${a.id}`}
            className="card px-5 py-4 flex items-center gap-4 hover:shadow-md transition group">
            <div className={`w-3 h-3 rounded-full shrink-0 ${
              a.status === 'scheduled' ? 'bg-blue-400' :
              a.status === 'completed' ? 'bg-emerald-400' : 'bg-gray-300'
            }`}/>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold text-gray-800 truncate">{a.reason || 'Sin motivo registrado'}</div>
              <div className="text-xs text-gray-400 mt-0.5">
                {new Date(a.starts_at).toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
            <span className={`text-xs px-2.5 py-1 rounded-full font-semibold shrink-0 ${
              a.status === 'scheduled' ? 'bg-blue-50 text-blue-700' :
              a.status === 'completed' ? 'bg-emerald-50 text-emerald-700' :
              'bg-gray-100 text-gray-400 line-through'
            }`}>
              {a.status === 'scheduled' ? 'Programada' : a.status === 'completed' ? 'Completada' : 'Cancelada'}
            </span>
          </Link>
        ))}
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════
   TAB: PRESUPUESTOS
══════════════════════════════════════════════════════════════ */
function TabPresupuestos({ p, quotes, loading }: { p: Patient; quotes: QuoteRow[]; loading: boolean }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="font-semibold text-gray-800">Presupuestos</div>
        <Link href={`/quotes/new?patientId=${p.id}`} className="btn text-sm">+ Nuevo presupuesto</Link>
      </div>

      {loading && <SkeletonList n={3} h={16} />}
      {!loading && quotes.length === 0 && (
        <div className="card p-10 text-center">
          <div className="text-4xl mb-3">💰</div>
          <div className="font-semibold text-gray-500 mb-1">Sin presupuestos</div>
          <Link href={`/quotes/new?patientId=${p.id}`} className="btn mt-3 inline-block text-sm">Crear presupuesto</Link>
        </div>
      )}
      <div className="space-y-2">
        {quotes.map(q => (
          <Link key={q.id} href={`/quotes/${q.id}`}
            className="card px-5 py-4 flex items-center gap-4 hover:shadow-md transition">
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold text-gray-800">
                {q.folio_code ?? 'Presupuesto sin folio'}
              </div>
              <div className="text-xs text-gray-400 mt-0.5">
                {new Date(q.created_at).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })}
              </div>
            </div>
            {q.total !== null && (
              <div className="text-base font-bold text-gray-800 shrink-0">
                ${Number(q.total).toLocaleString('es-MX')}
              </div>
            )}
            <QuoteStatusBadge status={q.status} />
          </Link>
        ))}
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════
   TAB: ARCHIVOS
══════════════════════════════════════════════════════════════ */
function TabArchivos({ p }: { p: Patient }) {
  return (
    <div className="space-y-4">
      <div className="card p-5">
        <div className="font-semibold text-gray-700 mb-4">Subir archivos</div>
        <MobileCaptureKit patientId={p.id} />
        <div className="mt-3">
          <UploadPatientFile clinicId={p.clinic_id ?? ''} patientId={p.id} />
        </div>
      </div>
      <div className="card p-5">
        <div className="font-semibold text-gray-700 mb-4">Archivos del paciente</div>
        <FilesList patientId={p.id} />
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════
   TAB: ACCIONES
══════════════════════════════════════════════════════════════ */
function TabAcciones({ p }: { p: Patient }) {
  const groups = [
    {
      label: 'Clínico',
      items: [
        { href: `/pacientes/${p.id}/historia`,               icon: '📋', label: 'Historia clínica',     desc: 'F-1, plan de tratamiento y odontograma' },
        { href: `/pacientes/${p.id}/odontogramas`,           icon: '🦷', label: 'Odontogramas',          desc: 'Ver historial y agregar evoluciones' },
      ],
    },
    {
      label: 'Documentos',
      items: [
        { href: `/quotes/new?patientId=${p.id}`,             icon: '💰', label: 'Nuevo presupuesto',     desc: 'Crear cotización de tratamiento' },
        { href: `/prescriptions/new?patient_id=${p.id}`,     icon: '💊', label: 'Nueva receta',          desc: 'Emitir prescripción médica' },
        { href: `/consents/new?patient_id=${p.id}`,          icon: '📄', label: 'Consentimiento',        desc: 'Nuevo documento de consentimiento informado' },
      ],
    },
    {
      label: 'Órdenes',
      items: [
        { href: `/radiology-orders/new?patient_id=${p.id}`,  icon: '🩻', label: 'Solicitud de RX',       desc: 'Orden de radiografía' },
        { href: `/lab-orders/new?patient_id=${p.id}`,        icon: '🧪', label: 'Solicitud de Lab',      desc: 'Orden de laboratorio' },
      ],
    },
    {
      label: 'Agenda',
      items: [
        { href: `/citas/new?patient_id=${p.id}`,             icon: '📅', label: 'Nueva cita',            desc: 'Agendar próxima visita' },
        { href: `/pacientes/${p.id}/printables`,             icon: '🖨️', label: 'Imprimibles',            desc: 'Documentos listos para imprimir' },
      ],
    },
  ]

  return (
    <div className="space-y-5">
      {groups.map(g => (
        <div key={g.label}>
          <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 px-1">{g.label}</div>
          <div className="grid sm:grid-cols-2 gap-2">
            {g.items.map(a => (
              <Link key={a.href} href={a.href}
                className="card p-4 flex items-start gap-3 hover:shadow-md hover:border-brand transition group">
                <div className="w-9 h-9 rounded-xl bg-brand/10 flex items-center justify-center text-lg shrink-0 mt-0.5 group-hover:bg-brand/20 transition">
                  {a.icon}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold text-gray-800 group-hover:text-brand-dark transition">{a.label}</div>
                  <div className="text-xs text-gray-400 mt-0.5 leading-snug">{a.desc}</div>
                </div>
                <span className="text-gray-300 group-hover:text-brand transition text-lg shrink-0 self-center">›</span>
              </Link>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════
   SUBCOMPONENTES
══════════════════════════════════════════════════════════════ */
function MetricCard({ icon, label, value, sub, href, colorValue }: {
  icon: string; label: string; value: string; sub?: string
  href?: string; colorValue?: string
}) {
  const inner = (
    <div className="card p-4 flex flex-col gap-1 hover:shadow-md transition">
      <div className="text-xl">{icon}</div>
      <div className={`text-lg font-bold leading-tight ${colorValue ?? 'text-gray-800'}`}>{value}</div>
      <div className="text-xs text-gray-400">{label}</div>
      {sub && <div className="text-xs text-gray-400 truncate">{sub}</div>}
    </div>
  )
  if (href) return <Link href={href}>{inner}</Link>
  return inner
}

function InfoSection({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) {
  return (
    <div className="card p-5">
      <div className="flex items-center gap-2 mb-3">
        <span>{icon}</span>
        <h3 className="font-semibold text-gray-700 text-sm">{title}</h3>
      </div>
      {children}
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null
  return (
    <div className="flex items-start justify-between py-2 border-b border-gray-50 last:border-0">
      <span className="text-xs text-gray-400 w-28 shrink-0 pt-0.5">{label}</span>
      <span className="text-sm text-gray-700 text-right">{value}</span>
    </div>
  )
}

function QuoteStatusBadge({ status }: { status: string }) {
  const s: Record<string, string> = {
    borrador:    'bg-gray-100 text-gray-500',
    aprobado:    'bg-emerald-50 text-emerald-700',
    aceptado:    'bg-emerald-50 text-emerald-700',
    pagado:      'bg-teal-50 text-teal-700',
    cancelado:   'bg-red-50 text-red-500 line-through',
  }
  const label: Record<string, string> = {
    borrador: 'Borrador', aprobado: 'Aprobado', aceptado: 'Aceptado',
    pagado: 'Pagado', cancelado: 'Cancelado',
  }
  return (
    <span className={`text-xs px-2.5 py-1 rounded-full font-semibold shrink-0 ${s[status] ?? 'bg-gray-100 text-gray-500'}`}>
      {label[status] ?? status}
    </span>
  )
}

function SkeletonList({ n, h }: { n: number; h: number }) {
  return (
    <div className="space-y-2 animate-pulse">
      {Array.from({ length: n }).map((_, i) => (
        <div key={i} className="rounded-2xl bg-gray-100" style={{ height: `${h * 4}px` }} />
      ))}
    </div>
  )
}

/* ── FilesList ──────────────────────────────────────────────── */
function FilesList({ patientId }: { patientId: string }) {
  const { data: rows, error, isLoading, mutate } = useSWR(['files', patientId], () => fetchFiles(patientId))
  const [items, setItems] = React.useState<GridFileItem[]>([])

  React.useEffect(() => {
    let alive = true
    ;(async () => {
      if (!rows) return
      const signed = await Promise.all(
        rows.map(async r => {
          const { data } = await supabase.storage.from(FILES_BUCKET).createSignedUrl(r.path, 3600)
          return { id: r.id, path: r.path, name: r.meta?.filename ?? r.path.split('/').pop() ?? r.path, url: data?.signedUrl ?? '', created_at: r.created_at, type: r.kind ?? 'file' } as GridFileItem
        })
      )
      if (alive) setItems(signed)
    })()
    return () => { alive = false }
  }, [rows])

  async function handleDelete(f: GridFileItem) {
    if (!f?.id || !f?.path) return
    if (!confirm('¿Eliminar archivo?')) return
    await supabase.from('files').delete().eq('id', f.id)
    await supabase.storage.from(FILES_BUCKET).remove([f.path])
    mutate()
  }

  if (isLoading) return <div className="text-sm text-gray-400 animate-pulse">Cargando archivos…</div>
  if (error)     return <div className="text-sm text-red-600">Error al cargar archivos</div>
  if (!rows || rows.length === 0) return (
    <div className="text-center py-8 text-gray-400">
      <div className="text-3xl mb-1">📂</div>
      <div className="text-sm">Sin archivos subidos aún</div>
    </div>
  )
  return <PatientFilesGrid files={items} onDelete={handleDelete} />
}

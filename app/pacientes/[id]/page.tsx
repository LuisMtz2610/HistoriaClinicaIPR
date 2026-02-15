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

/* ─── helpers ─────────────────────────────────────────────── */
function fmtDDMMYYYY(d?: string | null) {
  if (!d) return '—'
  const [y, m, day] = d.split('-')
  if (!y || !m || !day) return d
  return `${day}/${m}/${y}`
}

function age(birth?: string | null) {
  if (!birth) return null
  const [y, m, d] = birth.split('-').map(Number)
  const today = new Date()
  let a = today.getFullYear() - y
  if (today.getMonth() + 1 < m || (today.getMonth() + 1 === m && today.getDate() < d)) a--
  return a
}

/* ─── tipos ─────────────────────────────────────────────── */
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
type ClinicalForm = { id: string; form_type: string; form_date: string; data?: any }
type FileRow = { id: string; patient_id: string | null; path: string; kind: string | null; created_at: string; meta: any }
type GridFileItem = { id?: string; path?: string; name?: string; url: string; created_at?: string; type?: string }

/* ─── fetchers ───────────────────────────────────────────── */
const fetchPatient = async (id: string) => {
  const { data, error } = await supabase.from('patients').select('*').eq('id', id).single()
  if (error) throw error
  return data as Patient
}
const fetchLastF1 = async (id: string) => {
  const { data, error } = await supabase
    .from('clinical_forms').select('id, form_type, form_date, data')
    .eq('patient_id', id).order('form_date', { ascending: false }).limit(1).maybeSingle()
  if (error) throw error
  return (data || null) as ClinicalForm | null
}
const fetchFiles = async (id: string) => {
  const { data, error } = await supabase
    .from('files').select('id, patient_id, path, kind, created_at, meta')
    .eq('patient_id', id).order('created_at', { ascending: false })
  if (error) throw error
  return (data || []) as FileRow[]
}

/* ─── tabs ───────────────────────────────────────────────── */
type Tab = 'info' | 'clinico' | 'archivos' | 'acciones'
const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'info',     label: 'Datos',       icon: '👤' },
  { id: 'clinico',  label: 'Clínico',     icon: '🩺' },
  { id: 'archivos', label: 'Archivos',    icon: '📁' },
  { id: 'acciones', label: 'Acciones',    icon: '⚡' },
]

/* ─── componente principal ───────────────────────────────── */
export default function PatientView() {
  const id = String(useParams().id)
  const patientQ = useSWR(['patient', id], () => fetchPatient(id))
  const f1Q      = useSWR(['lastF1', id],  () => fetchLastF1(id))
  const [tab, setTab]       = React.useState<Tab>('info')
  const [showEdit, setShowEdit] = React.useState(false)

  if (patientQ.isLoading) return (
    <div className="flex items-center justify-center h-40 text-gray-400 animate-pulse">
      Cargando paciente…
    </div>
  )
  if (patientQ.error) return (
    <div className="card p-6 text-red-600">
      Error: {String((patientQ.error as any).message || patientQ.error)}
    </div>
  )
  if (!patientQ.data) return <div className="card p-6">No encontrado.</div>

  const p = patientQ.data
  const fullName = `${p.last_name}, ${p.first_name}`
  const yearsOld = age(p.birth_date)
  const sex = p.sex ?? p.gender

  return (
    <div className="space-y-4">

      {/* ── Hero del paciente ─────────────────────────── */}
      <div className="card p-5">
        <div className="flex flex-col sm:flex-row sm:items-start gap-4">

          {/* Avatar inicial */}
          <div className="shrink-0 w-16 h-16 rounded-2xl bg-brand flex items-center justify-center text-white text-2xl font-bold select-none">
            {p.first_name?.[0]?.toUpperCase()}{p.last_name?.[0]?.toUpperCase()}
          </div>

          {/* Info básica */}
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold text-brand-dark truncate">{fullName}</h1>
            <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-500">
              {yearsOld !== null && (
                <span>🎂 {yearsOld} años · {fmtDateDDMMYYYY(p.birth_date)}</span>
              )}
              {sex && <span>{sex === 'M' ? '♂ Masculino' : sex === 'F' ? '♀ Femenino' : sex}</span>}
              {p.phone && (
                <a href={`tel:${p.phone}`} className="text-brand hover:underline">
                  📞 {p.phone}
                </a>
              )}
              {p.blood_type && (
                <span className="font-medium text-rose-600">
                  🩸 {p.blood_type}{p.rh_factor ? ` ${p.rh_factor}` : ''}
                </span>
              )}
            </div>
            {(p.allergies_summary || p.allergies) && (
              <div className="mt-2 inline-flex items-center gap-1.5 text-xs bg-amber-50 border border-amber-200 text-amber-800 rounded-lg px-3 py-1.5">
                <span>⚠️</span>
                <span><strong>Alergias:</strong> {p.allergies_summary || p.allergies}</span>
              </div>
            )}
          </div>

          {/* Botón editar */}
          <div className="shrink-0">
            <button
              onClick={() => setShowEdit(true)}
              className="btn flex items-center gap-1.5"
            >
              <span className="text-base">✏️</span>
              <span className="hidden sm:inline">Editar</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── Tabs ──────────────────────────────────────── */}
      <div className="flex gap-1 bg-white rounded-2xl border p-1 overflow-x-auto">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={[
              'flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition flex-1 justify-center',
              tab === t.id
                ? 'bg-brand text-white shadow-sm'
                : 'text-gray-600 hover:bg-gray-100',
            ].join(' ')}
          >
            <span>{t.icon}</span>
            <span>{t.label}</span>
          </button>
        ))}
      </div>

      {/* ── Contenido por tab ─────────────────────────── */}
      {tab === 'info' && <TabInfo p={p} />}
      {tab === 'clinico' && <TabClinico p={p} f1={f1Q.data ?? null} f1Loading={f1Q.isLoading} />}
      {tab === 'archivos' && <TabArchivos p={p} />}
      {tab === 'acciones' && <TabAcciones p={p} />}

      {/* Modal edición */}
      {showEdit && (
        <EditPatientModal
          patient={p}
          onClose={() => setShowEdit(false)}
          onSaved={() => { setShowEdit(false); patientQ.mutate() }}
        />
      )}
    </div>
  )
}

/* ─── Tab: Datos generales ───────────────────────────────── */
function TabInfo({ p }: { p: Patient }) {
  return (
    <div className="grid md:grid-cols-2 gap-4">

      <InfoCard title="Identificación" icon="🪪">
        <InfoRow label="Nombre completo" value={`${p.first_name} ${p.last_name}`} />
        <InfoRow label="Género" value={p.sex === 'M' ? 'Masculino' : p.sex === 'F' ? 'Femenino' : (p.gender ?? null)} />
        <InfoRow label="Nacimiento" value={fmtDateDDMMYYYY(p.birth_date)} />
        <InfoRow label="Lugar de nac." value={[p.birth_city, p.birth_state].filter(Boolean).join(', ') || null} />
        <InfoRow label="Escolaridad" value={p.schooling} />
        <InfoRow label="Ocupación" value={p.occupation} />
        <InfoRow label="Estado civil" value={p.marital_status} />
      </InfoCard>

      <InfoCard title="Contacto" icon="📱">
        {p.phone && (
          <div className="flex items-center justify-between py-1.5 border-b border-gray-50 last:border-0">
            <span className="text-xs text-gray-400 w-28 shrink-0">Teléfono</span>
            <a href={`tel:${p.phone}`} className="text-sm text-brand hover:underline font-medium">{p.phone}</a>
          </div>
        )}
        {p.office_phone && (
          <div className="flex items-center justify-between py-1.5 border-b border-gray-50 last:border-0">
            <span className="text-xs text-gray-400 w-28 shrink-0">Tel. oficina</span>
            <a href={`tel:${p.office_phone}`} className="text-sm text-brand hover:underline">{p.office_phone}</a>
          </div>
        )}
        {p.email && (
          <div className="flex items-center justify-between py-1.5 border-b border-gray-50 last:border-0">
            <span className="text-xs text-gray-400 w-28 shrink-0">Email</span>
            <a href={`mailto:${p.email}`} className="text-sm text-brand hover:underline truncate max-w-[160px]">{p.email}</a>
          </div>
        )}
        <InfoRow label="Última visita" value={fmtDateDDMMYYYY(p.last_visit_date)} />
        <InfoRow label="Motivo visita" value={p.last_visit_reason} />
      </InfoCard>

      <InfoCard title="Domicilio" icon="🏠" className="md:col-span-2">
        <div className="text-sm text-gray-700">
          {[p.address_street, p.address_ext_no, p.address_int_no ? `Int. ${p.address_int_no}` : '']
            .filter(Boolean).join(' ') || '—'}
          {(p.address_colony || p.address_municipality || p.address_state) && (
            <span className="text-gray-400">
              {' · '}{[p.address_colony, p.address_municipality, p.address_state].filter(Boolean).join(', ')}
            </span>
          )}
        </div>
      </InfoCard>

    </div>
  )
}

/* ─── Tab: Clínico ───────────────────────────────────────── */
function TabClinico({ p, f1, f1Loading }: { p: Patient; f1: ClinicalForm | null; f1Loading: boolean }) {
  return (
    <div className="space-y-4">

      {/* Resumen clínico rápido */}
      <div className="grid sm:grid-cols-3 gap-3">
        <div className="card p-4 flex flex-col items-center gap-1 text-center">
          <span className="text-2xl">🩸</span>
          <div className="text-lg font-bold text-brand-dark">
            {p.blood_type || '—'}{p.rh_factor ? ` ${p.rh_factor}` : ''}
          </div>
          <div className="text-xs text-gray-400">Grupo sanguíneo</div>
        </div>
        <div className="card p-4 col-span-2">
          <div className="text-xs text-gray-400 mb-1">⚠️ Alergias</div>
          <div className="text-sm text-gray-800">
            {p.allergies_summary || p.allergies || <span className="text-gray-400 italic">Sin alergias registradas</span>}
          </div>
        </div>
      </div>

      {/* Antecedentes */}
      {p.medical_history && (
        <InfoCard title="Antecedentes médicos" icon="📋">
          <p className="text-sm text-gray-700 whitespace-pre-wrap">{p.medical_history}</p>
        </InfoCard>
      )}

      {/* Historia clínica F-1 */}
      <InfoCard title="Historia clínica (F-1)" icon="📝">
        {f1Loading ? (
          <div className="text-sm text-gray-400 animate-pulse">Cargando…</div>
        ) : !f1 ? (
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500">Sin historia registrada</span>
            <Link href={`/pacientes/${p.id}/historia`} className="btn text-sm">Capturar ahora</Link>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              Último registro: <strong>{new Date(f1.form_date).toLocaleDateString('es-MX')}</strong>
            </div>
            <Link href={`/pacientes/${p.id}/historia`} className="btn text-sm">Ver historia</Link>
          </div>
        )}
      </InfoCard>

    </div>
  )
}

/* ─── Tab: Archivos ──────────────────────────────────────── */
function TabArchivos({ p }: { p: Patient }) {
  return (
    <div className="space-y-4">
      <div className="card p-5">
        <div className="font-semibold mb-3 text-gray-700">Subir archivos</div>
        <MobileCaptureKit patientId={p.id} />
        <div className="mt-3">
          <UploadPatientFile clinicId={p.clinic_id ?? ''} patientId={p.id} />
        </div>
      </div>
      <div className="card p-5">
        <div className="font-semibold mb-3 text-gray-700">Archivos del paciente</div>
        <FilesList patientId={p.id} />
      </div>
    </div>
  )
}

/* ─── Tab: Acciones ──────────────────────────────────────── */
function TabAcciones({ p }: { p: Patient }) {
  const acciones = [
    { href: `/pacientes/${p.id}/historia`,               icon: '📋', label: 'Historia clínica',     desc: 'Ver / editar F-1 y odontograma' },
    { href: `/quotes/new?patientId=${p.id}`,             icon: '💰', label: 'Nuevo presupuesto',     desc: 'Crear cotización de tratamiento' },
    { href: `/citas/new?patient_id=${p.id}`,             icon: '📅', label: 'Nueva cita',            desc: 'Agendar próxima visita' },
    { href: `/prescriptions/new?patient_id=${p.id}`,     icon: '💊', label: 'Nueva receta',          desc: 'Emitir prescripción médica' },
    { href: `/radiology-orders/new?patient_id=${p.id}`,  icon: '🩻', label: 'Solicitud de RX',       desc: 'Orden de radiografía' },
    { href: `/lab-orders/new?patient_id=${p.id}`,        icon: '🧪', label: 'Solicitud de Lab',      desc: 'Orden de laboratorio' },
    { href: `/consents/new?patient_id=${p.id}`,          icon: '📄', label: 'Consentimiento',        desc: 'Nuevo documento de consentimiento' },
    { href: `/pacientes/${p.id}/odontogramas`,           icon: '🦷', label: 'Historial odontograma', desc: 'Ver versiones anteriores' },
    { href: `/pacientes/${p.id}/printables`,             icon: '🖨️', label: 'Imprimibles',            desc: 'Documentos listos para imprimir' },
  ]
  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {acciones.map(a => (
        <Link
          key={a.href}
          href={a.href}
          className="card p-4 flex items-start gap-3 hover:shadow-md hover:border-brand transition group"
        >
          <span className="text-2xl mt-0.5 shrink-0">{a.icon}</span>
          <div className="min-w-0">
            <div className="text-sm font-semibold text-gray-800 group-hover:text-brand-dark transition">
              {a.label}
            </div>
            <div className="text-xs text-gray-400 mt-0.5">{a.desc}</div>
          </div>
          <span className="ml-auto text-gray-300 group-hover:text-brand transition shrink-0">›</span>
        </Link>
      ))}
    </div>
  )
}

/* ─── Subcomponentes de UI ───────────────────────────────── */
function InfoCard({ title, icon, children, className = '' }: {
  title: string; icon: string; children: React.ReactNode; className?: string
}) {
  return (
    <div className={`card p-5 ${className}`}>
      <div className="flex items-center gap-2 mb-3">
        <span>{icon}</span>
        <h3 className="font-semibold text-gray-700 text-sm">{title}</h3>
      </div>
      {children}
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value || value === '—') return null
  return (
    <div className="flex items-start justify-between py-1.5 border-b border-gray-50 last:border-0">
      <span className="text-xs text-gray-400 w-28 shrink-0 pt-0.5">{label}</span>
      <span className="text-sm text-gray-700 text-right">{value}</span>
    </div>
  )
}

/* ─── FilesList ──────────────────────────────────────────── */
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
          return {
            id: r.id, path: r.path,
            name: r.meta?.filename ?? r.path.split('/').pop() ?? r.path,
            url: data?.signedUrl ?? '',
            created_at: r.created_at,
            type: r.kind ?? 'file',
          } as GridFileItem
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

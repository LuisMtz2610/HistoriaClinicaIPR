'use client'

import * as React from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import useSWR from 'swr'
import { supabase } from '@/lib/supabase'
import UploadPatientFile from '@/components/UploadPatientFile'
import EditPatientModal from '@/components/EditPatientModal'
import PatientPrintableActions from '@/app/(clinic)/_components/PatientPrintableActions'
import MobileCaptureKit from '@/components/kit/MobileCaptureKit'
import { fmtDateDDMMYYYY } from '@/lib/date'
import PatientFilesGrid from "@/app/(clinic)/_components/PatientFilesGrid";

/** === Constantes === */
const FILES_BUCKET = 'clinical-files'

/** === Helpers === */
// Para campos DATE (YYYY-MM-DD) evitar desfase de timezone
function fmtDDMMYYYY(d?: string | null) {
  if (!d) return '—'
  const [y, m, day] = d.split('-')
  if (!y || !m || !day) return d
  return `${day}/${m}/${y}`
}

/** === Tipos mínimos usados aquí === */
type Patient = {
  id: string
  clinic_id: string | null
  first_name: string
  last_name: string
  sex: string | null               // <-- requerido por EditPatientModal
  gender: string | null            // existe también en tu esquema; lo conservamos
  birth_date: string | null        // DATE -> YYYY-MM-DD
  birth_state: string | null
  birth_city: string | null
  occupation: string | null
  schooling: string | null
  marital_status: string | null
  phone: string | null
  office_phone: string | null
  email: string | null
  last_visit_date: string | null   // DATE -> YYYY-MM-DD
  last_visit_reason: string | null
  allergies: string | null
  allergies_summary: string | null
  medical_history: string | null
  blood_type: string | null
  rh_factor: string | null
  address_street: string | null
  address_ext_no: string | null
  address_int_no: string | null
  address_colony: string | null
  address_municipality: string | null
  address_state: string | null
}

type ClinicalForm = {
  id: string
  form_type: string
  form_date: string // timestamptz
  data?: any
}

type FileRow = {
  id: string
  patient_id: string | null
  path: string
  kind: 'xray' | 'photo' | 'consent' | 'doc' | 'other' | null
  created_at: string
  meta: any
}

/** === Fetchers (SWR) === */
const fetchPatient = async (id: string) => {
  const { data, error } = await supabase.from('patients').select('*').eq('id', id).single()
  if (error) throw error
  return data as Patient
}

const fetchLastF1 = async (patientId: string) => {
  const { data, error } = await supabase
    .from('clinical_forms')
    .select('id, form_type, form_date, data')
    .eq('patient_id', patientId)
    .order('form_date', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) throw error
  return (data || null) as ClinicalForm | null
}

const fetchFiles = async (patientId: string) => {
  const { data, error } = await supabase
    .from('files')
    .select('id, patient_id, path, kind, created_at, meta')
    .eq('patient_id', patientId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data || []) as FileRow[]
}

/** === Página principal === */
export default function PatientView() {
  const params = useParams()
  const id = String(params.id)

  const patientQ = useSWR(['patient', id], () => fetchPatient(id))
  const f1Q = useSWR(['lastF1', id], () => fetchLastF1(id))
  const [showEdit, setShowEdit] = React.useState(false)

  if (patientQ.isLoading) return <div className="p-4">Cargando…</div>
  if (patientQ.error) {
    return (
      <div className="p-4 text-red-600">
        Error: {String((patientQ.error as any).message || patientQ.error)}
      </div>
    )
  }
  if (!patientQ.data) return <div className="p-4">No encontrado.</div>

  const p = patientQ.data
  const fullName = `${p.last_name}, ${p.first_name}`

  return (
    <main className="container mx-auto px-4 py-6 space-y-5">
      {/* ===== Encabezado ===== */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold">Paciente: {fullName}</h1>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setShowEdit(true)}
              className="px-3 py-2 rounded-xl text-white"
              style={{ backgroundColor: '#14b8a6' }} // turquesa
            >
              Editar
            </button>
            <Link
              href={`/quotes/new?patientId=${p.id}`}
              className="px-3 py-2 rounded-xl text-white"
              style={{ backgroundColor: '#14b8a6' }}
            >
              Nuevo presupuesto
            </Link>
            <Link
              href={`/pacientes/${p.id}/historia`}
              className="px-3 py-2 rounded-xl text-white"
              style={{ backgroundColor: '#14b8a6' }}
            >
              Historia clínica
            </Link>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link
            href={`/prescriptions/new?patient_id=${p.id}`}
            className="px-3 py-2 rounded-xl text-white"
            style={{ backgroundColor: '#14b8a6' }}
          >
            Nueva Receta
          </Link>
          <Link
            href={`/radiology-orders/new?patient_id=${p.id}`}
            className="px-3 py-2 rounded-xl text-white"
            style={{ backgroundColor: '#14b8a6' }}
          >
            Solicitud RX
          </Link>
          <Link
            href={`/lab-orders/new?patient_id=${p.id}`}
            className="px-3 py-2 rounded-xl text-white"
            style={{ backgroundColor: '#14b8a6' }}
          >
            Solicitud Lab
          </Link>
          <Link
            href={`/consents/new?patient_id=${p.id}`}
            className="px-3 py-2 rounded-xl text-white"
            style={{ backgroundColor: '#14b8a6' }}
          >
            Consentimiento
          </Link>
          <Link
            href={`/pacientes/${p.id}/printables`}
            className="px-3 py-2 rounded-xl text-white"
            style={{ backgroundColor: '#14b8a6' }}
          >
            Historial impresos
          </Link>
        </div>
      </section>

      {/* ===== Datos principales ===== */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Identificación */}
        <div className="bg-white rounded-2xl shadow p-5">
          <div className="font-semibold mb-2">Identificación</div>
          <div className="text-sm text-gray-700 space-y-1">
            <div><span className="font-medium">Nombre:</span> {fullName}</div>
            <div><span className="font-medium">Género:</span> {p.sex ?? p.gender ?? '—'}</div>
            <div><span className="font-medium">Nacimiento:</span> {fmtDateDDMMYYYY(p.birth_date)}</div>
            {(p.birth_city || p.birth_state) && (
              <div><span className="font-medium">Lugar de nacimiento:</span> {p.birth_city || '—'}, {p.birth_state || '—'}</div>
            )}
            {p.schooling && <div><span className="font-medium">Escolaridad:</span> {p.schooling}</div>}
            {p.occupation && <div><span className="font-medium">Ocupación:</span> {p.occupation}</div>}
            {p.marital_status && <div><span className="font-medium">Estado civil:</span> {p.marital_status}</div>}
          </div>
        </div>

        {/* Contacto */}
        <div className="bg-white rounded-2xl shadow p-5">
          <div className="font-semibold mb-2">Contacto</div>
          <div className="text-sm text-gray-700 space-y-1">
            {p.phone && <div><span className="font-medium">Teléfono:</span> {p.phone}</div>}
            {p.office_phone && <div><span className="font-medium">Teléfono oficina:</span> {p.office_phone}</div>}
            {p.email && <div><span className="font-medium">Email:</span> {p.email}</div>}
            {p.last_visit_date && (
              <div><span className="font-medium">Última visita:</span> {fmtDDMMYYYY(p.last_visit_date)}</div>
            )}
            {p.last_visit_reason && (
              <div><span className="font-medium">Motivo:</span> {p.last_visit_reason}</div>
            )}
          </div>
        </div>
      </section>

      {/* ===== Domicilio ===== */}
      <section className="bg-white rounded-2xl shadow p-5">
        <div className="font-semibold mb-2">Domicilio</div>
        <div className="text-sm text-gray-700 space-y-1">
          <div>
            <span className="font-medium">Calle y números:</span>{' '}
            {[
              p.address_street || '',
              p.address_ext_no || '',
              p.address_int_no ? `Int. ${p.address_int_no}` : ''
            ].filter(Boolean).join(' ') || '—'}
          </div>
          <div>
            <span className="font-medium">Colonia:</span> {p.address_colony || '—'} ·{' '}
            <span className="font-medium">Municipio:</span> {p.address_municipality || '—'} ·{' '}
            <span className="font-medium">Estado:</span> {p.address_state || '—'}
          </div>
        </div>
      </section>

      {/* ===== Resumen clínico ===== */}
      <section className="bg-white rounded-2xl shadow p-5">
        <div className="font-semibold mb-2">Resumen clínico</div>
        <div className="text-sm text-gray-700 space-y-1">
          <div><span className="font-medium">Alergias (resumen):</span> {p.allergies_summary || p.allergies || '—'}</div>
          {(p.blood_type || p.rh_factor) && (
            <div><span className="font-medium">Grupo/RH:</span> {p.blood_type || '—'} {p.rh_factor || ''}</div>
          )}
          <div><span className="font-medium">Alergias (libre):</span> {p.allergies || '—'}</div>
          <div><span className="font-medium">Antecedentes:</span> {p.medical_history || '—'}</div>
        </div>
      </section>

      {/* ===== Historia F-1 más reciente ===== */}
      <section className="bg-white rounded-2xl shadow p-5">
        <div className="flex items-center justify-between">
          <div className="font-semibold">Historia F-1 más reciente</div>
          <Link href={`/pacientes/${p.id}/historia`} className="px-3 py-2 rounded-xl bg-gray-100">
            Ver todo
          </Link>
        </div>

        {f1Q.isLoading ? (
          <div className="mt-2 text-sm">Cargando F-1…</div>
        ) : !f1Q.data ? (
          <div className="mt-2 text-sm text-gray-600">
            Aún no hay historia F-1.{' '}
            <Link className="underline" href={`/pacientes/${p.id}/historia`}>Capturar ahora</Link>
          </div>
        ) : (
          <div className="mt-3 grid md:grid-cols-2 gap-4 text-sm text-gray-700">
            <div>
              <div><span className="font-medium">Fecha:</span>{' '}
                {new Date(f1Q.data.form_date).toLocaleString()}
              </div>
              <div><span className="font-medium">Tipo:</span> {f1Q.data.form_type}</div>
            </div>
            <div className="text-gray-500">
              Último registro estomatológico capturado.
            </div>
          </div>
        )}
      </section>

      {/* ===== Acciones imprimibles del paciente ===== */}
      {false && (<section className="bg-white rounded-2xl shadow p-5">
        <PatientPrintableActions patientId={p.id} />
      </section>)}

      {/* ===== Archivos del paciente ===== */}
      <section className="bg-white rounded-2xl shadow p-5">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Archivos</h2>
          <div className="text-sm text-gray-500">Sube fotos, RX, consentimientos, etc.</div>
        </div>

        <div className="mt-3">
          <MobileCaptureKit patientId={p.id} />
        </div>

        <div className="mt-3">
          {/* clinicId ahora SIEMPRE es string */}
          <UploadPatientFile clinicId={p.clinic_id ?? ''} patientId={p.id} />
        </div>

        <div className="mt-4">
          <FilesList patientId={p.id} />
        </div>
      </section>

      {/* ===== Modal de edición ===== */}
      {showEdit && (
        <EditPatientModal
          patient={p}
          onClose={() => setShowEdit(false)}
          onSaved={() => {
            setShowEdit(false)
            patientQ.mutate()
          }}
        />
      )}
    </main>
  )
}

/** ===== Listado de archivos usando PatientFilesGrid ===== */
type GridFileItem = {
  id?: string
  path?: string
  name?: string
  url: string
  created_at?: string
  type?: string
}

function FilesList({ patientId }: { patientId: string }) {
  const { data: rows, error, isLoading, mutate } = useSWR(
    ['files', patientId],
    () => fetchFiles(patientId)
  )

  const [items, setItems] = React.useState<GridFileItem[]>([])

  React.useEffect(() => {
    let alive = true
    ;(async () => {
      if (!rows) return
      const signed = await Promise.all(
        rows.map(async (r) => {
          const { data } = await supabase.storage
            .from(FILES_BUCKET)
            .createSignedUrl(r.path, 3600)
          return {
            id: r.id,
            path: r.path,
            name: r.meta?.filename ?? r.path.split('/').pop() ?? r.path,
            url: data?.signedUrl ?? '',
            created_at: r.created_at,
            type: r.kind ?? 'file',
          } as GridFileItem
        })
      )
      if (alive) setItems(signed)
    })()
    return () => {
      alive = false
    }
  }, [rows])

  async function handleDelete(f: GridFileItem) {
    if (!f?.id || !f?.path) return
    if (!confirm('¿Eliminar archivo?')) return
    // 1) Borra metadata
    await supabase.from('files').delete().eq('id', f.id)
    // 2) Borra del storage
    await supabase.storage.from(FILES_BUCKET).remove([f.path])
    mutate()
  }

  if (isLoading) return <div className="text-sm">Cargando archivos…</div>
  if (error) return <div className="text-sm text-red-600">Error al cargar archivos</div>
  if (!rows || rows.length === 0) return <div className="text-sm text-gray-500">Sin archivos</div>

  return <PatientFilesGrid files={items} onDelete={handleDelete} />
}

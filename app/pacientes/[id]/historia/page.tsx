'use client'

import * as React from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import useSWR from 'swr'
import { supabase } from '@/lib/supabase'
import F1Form from '@/components/forms/F1Form'
import OdontogramaDxOverlay from '@/components/OdontogramaDxOverlay'

/* ------------------------- Data loaders (SWR) ------------------------- */

const fetchPatient = async (id: string) => {
  const { data, error } = await supabase
    .from('patients')
    .select('*')
    .eq('id', id)
    .single()
  if (error) throw error
  return data
}

const fetchForms = async (patientId: string) => {
  const { data, error } = await supabase
    .from('clinical_forms')
    .select('id, form_type, form_date, author_id')
    .eq('patient_id', patientId)
    .order('form_date', { ascending: false })
  if (error) throw error
  return data
}

const fetchObservations = async (patientId: string) => {
  const { data, error } = await supabase
    .from('visit_observations')
    .select('id, note, taken_at, author_id')
    .eq('patient_id', patientId)
    .order('taken_at', { ascending: false })
    .limit(10)
  if (error) throw error
  return data
}

/* -------------------------------- Page -------------------------------- */

export default function HistoriaClinicaPage() {
  // ✅ TODOS los hooks arriba, sin returns antes (evita el error de hooks):
  const params = useParams()
  const id = String(params.id)

  const p = useSWR(['patient', id], () => fetchPatient(id))
  const forms = useSWR(['forms', id], () => fetchForms(id))
  const obs = useSWR(['obs', id], () => fetchObservations(id))

  const [note, setNote] = React.useState('')
  const [savingObs, setSavingObs] = React.useState(false)

  React.useEffect(() => {
    const rf = () => forms.mutate()
    window.addEventListener('forms:changed', rf)
    return () => window.removeEventListener('forms:changed', rf)
  }, [forms])

  const saveObs = async () => {
    if (!note.trim()) {
      alert('Escribe alguna observación.')
      return
    }
    setSavingObs(true)
    try {
      const { data: u } = await supabase.auth.getUser()
      const { error } = await supabase.from('visit_observations').insert({
        patient_id: id,
        author_id: u?.user?.id || null,
        note,
      })
      if (error) throw error
      setNote('')
      obs.mutate()
      alert('Observación guardada')
    } catch (e: any) {
      alert(e.message || String(e))
    } finally {
      setSavingObs(false)
    }
  }

  // ⛔ Returns condicionales después de declarar hooks:
  if (p.isLoading) return <div className="p-4">Cargando…</div>
  if (p.error)
    return (
      <div className="p-4 text-red-600">
        Error: {String((p.error as any).message || p.error)}
      </div>
    )

  const patient = p.data

  return (
    <div className="space-y-4">
      {/* Encabezado */}
      <div className="flex items-center gap-3">
        <h1 className="page-title">
          Historia clínica — {patient.last_name}, {patient.first_name}
        </h1>
        <Link href={`/pacientes/${patient.id}`} className="btn ml-auto">
          Volver a la ficha
        </Link>
      </div>

      {/* F-1 Estomatológica */}
      <div className="card p-4">
        <div className="font-semibold mb-3">Nueva Historia (F-1 Estomatológica)</div>
        <F1Form patient={patient} />
      </div>

      {/* Odontograma interactivo con overlay */}
      <div className="card p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="font-semibold">Odontograma diagnóstico</div>
          <Link
            href={`/pacientes/${patient.id}/historia/odontograma/print`}
            target="_blank"
            className="btn"
            title="Abrir vista de impresión en nueva pestaña"
          >
            Imprimir
          </Link>
        </div>
        <OdontogramaDxOverlay patientId={patient.id} />
      </div>

      {/* Observaciones por visita (guardable) */}
      <div className="card p-4">
        <div className="font-semibold mb-2">Observaciones</div>
        <textarea
          className="textarea w-full min-h-[140px] border rounded-xl p-3"
          placeholder="Escribe observaciones, indicaciones o notas clínicas…"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
        <div className="mt-2 flex justify-end">
          <button className="btn" onClick={saveObs} disabled={savingObs}>
            {savingObs ? 'Guardando…' : 'Guardar observación'}
          </button>
        </div>

        {/* Listado últimas observaciones */}
        <div className="mt-4">
          <div className="font-medium mb-2">Últimas 10 observaciones</div>
          {obs.isLoading ? (
            <div>Cargando…</div>
          ) : obs.error ? (
            <div className="text-red-600">
              Error: {String((obs.error as any).message || obs.error)}
            </div>
          ) : (obs.data || []).length === 0 ? (
            <div className="text-gray-600">Aún no hay observaciones registradas.</div>
          ) : (
            <ul className="space-y-2 text-sm">
              {(obs.data || []).map((o: any) => (
                <li key={o.id} className="rounded-xl border p-3">
                  <div className="text-gray-800 whitespace-pre-wrap">{o.note}</div>
                  <div className="text-[12px] text-gray-500 mt-1">
                    {new Date(o.taken_at).toLocaleString()}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Historial de formularios */}
      <div className="card p-4">
        <div className="font-semibold mb-2">Historial de formularios</div>
        {forms.isLoading ? (
          <div>Cargando formularios…</div>
        ) : forms.error ? (
          <div className="text-red-600">
            Error: {String((forms.error as any).message || forms.error)}
          </div>
        ) : (forms.data || []).length === 0 ? (
          <div>Aún no hay historias capturadas.</div>
        ) : (
          <div className="grid gap-2">
            {(forms.data || []).map((f: any) => (
              <div
                key={f.id}
                className="rounded-xl border p-3 flex items-center justify-between"
              >
                <div className="text-sm">
                  <div className="font-medium">{f.form_type}</div>
                  <div className="text-gray-600">
                    {new Date(f.form_date).toLocaleString()}
                  </div>
                </div>
                <Link href={`/pacientes/${patient.id}/historia/${f.id}`} className="btn">
                  Ver
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Estilos de impresión para toda la página */}
      <style jsx global>{`
        @media print {
          @page { size: A4 portrait; margin: 14mm; }
          .card { box-shadow: none !important; }
          .btn, a[href] { display: none !important; }
          textarea { border: 1px solid #444 !important; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
      `}</style>
    </div>
  )
}

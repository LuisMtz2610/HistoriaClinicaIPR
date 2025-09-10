'use client'
import * as React from 'react'
import { useParams } from 'next/navigation'
import useSWR from 'swr'
import { supabase } from '@/lib/supabase'
import F1FormEditor from '@/components/forms/F1FormEditor'

const fetchForm = async (formId: string) => {
  const { data, error } = await supabase
    .from('clinical_forms')
    .select('*')
    .eq('id', formId)
    .single()
  if (error) throw error
  return data
}

const fetchPatient = async (id: string) => {
  const { data, error } = await supabase
    .from('patients')
    .select('*')
    .eq('id', id)
    .single()
  if (error) throw error
  return data
}

export default function FormDetailPage(){
  const params = useParams()
  const patientId = String(params.id)
  const formId = String(params.formId)

  const { data: patient, error: pErr, isLoading: pLoad } = useSWR(['patient', patientId], ()=>fetchPatient(patientId))
  const { data: form, error: fErr, isLoading: fLoad, mutate } = useSWR(['form', formId], ()=>fetchForm(formId))

  if (pLoad || fLoad) return <div>Cargando…</div>
  if (pErr) return <div className="text-red-600">Error paciente: {String((pErr as any).message || pErr)}</div>
  if (fErr) return <div className="text-red-600">Error formulario: {String((fErr as any).message || fErr)}</div>
  if (!form) return <div>No encontrado.</div>

  const header = (
    <div className="mb-4">
      <h1 className="page-title">Formulario — {patient.last_name}, {patient.first_name}</h1>
      <div className="text-sm text-gray-600">
        {form.form_type} · {new Date(form.form_date).toLocaleString()}
      </div>
    </div>
  )

  // Render según tipo; por ahora soportamos F-1 con editor
  if (form.form_type === 'estomatologica_f1') {
    return (
      <div className="space-y-4">
        {header}
        <div className="card p-4">
          <div className="font-semibold mb-3">Editar Historia (F-1 Estomatológica)</div>
          <F1FormEditor form={form} patient={patient} onUpdated={()=>{ mutate(); }} />
        </div>
      </div>
    )
  }

  // Fallback: mostrar JSON si no es F-1 aún
  return (
    <div className="space-y-4">
      {header}
      <div className="card p-4">
        <div className="font-semibold mb-2">Vista previa (JSON)</div>
        <pre className="text-xs overflow-auto bg-gray-50 p-3 rounded-xl border">{JSON.stringify(form.data, null, 2)}</pre>
      </div>
    </div>
  )
}

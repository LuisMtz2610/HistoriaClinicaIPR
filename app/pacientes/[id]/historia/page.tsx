'use client'

import * as React from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import useSWR from 'swr'
import { supabase } from '@/lib/supabase'
import F1Form from '@/components/forms/F1Form'
import OdontogramaDxOverlay from '@/components/OdontogramaDxOverlay'

/* ── fetchers ─────────────────────────────────────────────── */
const fetchPatient = async (id: string) => {
  const { data, error } = await supabase.from('patients').select('*').eq('id', id).single()
  if (error) throw error
  return data
}
const fetchForms = async (id: string) => {
  const { data, error } = await supabase
    .from('clinical_forms').select('id, form_type, form_date, author_id')
    .eq('patient_id', id).order('form_date', { ascending: false })
  if (error) throw error
  return data
}
const fetchObs = async (id: string) => {
  const { data, error } = await supabase
    .from('visit_observations').select('id, note, taken_at')
    .eq('patient_id', id).order('taken_at', { ascending: false }).limit(10)
  if (error) throw error
  return data
}
const fetchPlans = async (id: string) => {
  const { data, error } = await supabase
    .from('treatment_plans')
    .select('id, tooth, diagnosis, treatment, priority, status, session_date, notes, price_est')
    .eq('patient_id', id)
    .order('created_at', { ascending: true })
  if (error) throw error
  return (data || []) as TreatmentRow[]
}

/* ── tipos ───────────────────────────────────────────────── */
type TreatmentRow = {
  id: string
  tooth: string | null
  diagnosis: string
  treatment: string
  priority: 'urgente' | 'alta' | 'normal' | 'baja'
  status: 'pendiente' | 'en_proceso' | 'completado' | 'cancelado'
  session_date: string | null
  notes: string | null
  price_est: number | null
}

const PRIORITY_COLOR: Record<string, string> = {
  urgente: 'bg-red-100 text-red-700 border-red-200',
  alta:    'bg-orange-100 text-orange-700 border-orange-200',
  normal:  'bg-gray-100 text-gray-600 border-gray-200',
  baja:    'bg-sky-50 text-sky-600 border-sky-200',
}
const STATUS_COLOR: Record<string, string> = {
  pendiente:   'bg-amber-50 text-amber-700 border-amber-200',
  en_proceso:  'bg-blue-50 text-blue-700 border-blue-200',
  completado:  'bg-emerald-50 text-emerald-700 border-emerald-200',
  cancelado:   'bg-gray-100 text-gray-400 border-gray-200 line-through',
}
const STATUS_LABEL: Record<string, string> = {
  pendiente: 'Pendiente', en_proceso: 'En proceso',
  completado: 'Completado', cancelado: 'Cancelado',
}
const PRIORITY_LABEL: Record<string, string> = {
  urgente: '🔴 Urgente', alta: '🟠 Alta', normal: '⚪ Normal', baja: '🔵 Baja',
}

/* ── página principal ────────────────────────────────────── */
export default function HistoriaClinicaPage() {
  const { id } = useParams() as { id: string }

  const p     = useSWR(['patient', id], () => fetchPatient(id))
  const forms = useSWR(['forms', id],   () => fetchForms(id))
  const obs   = useSWR(['obs', id],     () => fetchObs(id))
  const plans = useSWR(['plans', id],   () => fetchPlans(id))

  const [note,      setNote]      = React.useState('')
  const [savingObs, setSavingObs] = React.useState(false)
  const [obsMsg,    setObsMsg]    = React.useState<string | null>(null)

  React.useEffect(() => {
    const rf = () => forms.mutate()
    window.addEventListener('forms:changed', rf)
    return () => window.removeEventListener('forms:changed', rf)
  }, [forms])

  const saveObs = async () => {
    if (!note.trim()) return
    setSavingObs(true); setObsMsg(null)
    try {
      const { data: u } = await supabase.auth.getUser()
      const { error } = await supabase.from('visit_observations').insert({
        patient_id: id, author_id: u?.user?.id || null, note,
      })
      if (error) throw error
      setNote(''); obs.mutate(); setObsMsg('✓ Guardado')
      setTimeout(() => setObsMsg(null), 2000)
    } catch (e: any) { setObsMsg('⚠ ' + (e.message || String(e))) }
    finally { setSavingObs(false) }
  }

  if (p.isLoading) return <div className="card p-6 animate-pulse text-gray-400">Cargando…</div>
  if (p.error) return <div className="card p-6 text-red-600">Error al cargar paciente</div>

  const patient = p.data

  return (
    <div className="space-y-5">

      {/* Encabezado */}
      <div className="flex items-center gap-3 flex-wrap">
        <h1 className="page-title">Historia clínica</h1>
        <span className="text-gray-400">—</span>
        <span className="text-lg font-medium text-brand-dark">
          {patient.last_name}, {patient.first_name}
        </span>
        <Link href={`/pacientes/${patient.id}`} className="btn ml-auto">
          ← Volver a la ficha
        </Link>
      </div>

      {/* ── TABLA DE DIAGNÓSTICO Y PLAN DE TRATAMIENTO ── */}
      <TreatmentPlanSection patientId={id} plansData={plans} />

      {/* ── ODONTOGRAMA ── */}
      <div className="card p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-gray-700">🦷 Odontograma diagnóstico</h2>
          <Link
            href={`/pacientes/${patient.id}/historia/odontograma/print`}
            target="_blank" className="btn text-sm"
          >
            🖨️ Imprimir
          </Link>
        </div>
        <OdontogramaDxOverlay patientId={patient.id} />
      </div>

      {/* ── F-1 ESTOMATOLÓGICA ── */}
      <div className="card p-4">
        <h2 className="font-semibold text-gray-700 mb-3">📋 Historia F-1 Estomatológica</h2>
        <F1Form patient={patient} />
      </div>

      {/* ── OBSERVACIONES POR VISITA ── */}
      <div className="card p-4">
        <h2 className="font-semibold text-gray-700 mb-3">📝 Observaciones de visita</h2>
        <textarea
          className="textarea w-full"
          placeholder="Observaciones, indicaciones o notas clínicas de esta visita…"
          value={note}
          onChange={e => setNote(e.target.value)}
          rows={3}
        />
        <div className="mt-2 flex items-center gap-3 justify-end">
          {obsMsg && <span className="text-sm text-emerald-600">{obsMsg}</span>}
          <button className="btn text-sm" onClick={saveObs} disabled={savingObs || !note.trim()}>
            {savingObs ? 'Guardando…' : 'Guardar observación'}
          </button>
        </div>

        {/* Historial */}
        <div className="mt-4 space-y-2">
          {(obs.data || []).length === 0 && !obs.isLoading && (
            <div className="text-sm text-gray-400 text-center py-4">Sin observaciones registradas</div>
          )}
          {(obs.data || []).map((o: any) => (
            <div key={o.id} className="rounded-xl border bg-gray-50 p-3">
              <div className="text-sm text-gray-800 whitespace-pre-wrap">{o.note}</div>
              <div className="text-xs text-gray-400 mt-1">
                {new Date(o.taken_at).toLocaleString('es-MX')}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── HISTORIAL DE FORMULARIOS F-1 ── */}
      <div className="card p-4">
        <h2 className="font-semibold text-gray-700 mb-3">🗂️ Historial de formularios F-1</h2>
        {(forms.data || []).length === 0 && !forms.isLoading ? (
          <div className="text-sm text-gray-400 text-center py-4">Sin formularios capturados</div>
        ) : (
          <div className="space-y-2">
            {(forms.data || []).map((f: any) => (
              <div key={f.id} className="flex items-center justify-between rounded-xl border p-3">
                <div className="text-sm">
                  <div className="font-medium">{f.form_type}</div>
                  <div className="text-gray-400">{new Date(f.form_date).toLocaleString('es-MX')}</div>
                </div>
                <Link href={`/pacientes/${patient.id}/historia/${f.id}`} className="btn text-sm">Ver</Link>
              </div>
            ))}
          </div>
        )}
      </div>

      <style jsx global>{`
        @media print {
          @page { size: A4 portrait; margin: 14mm; }
          .card { box-shadow: none !important; }
          .btn, a[href] { display: none !important; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
      `}</style>
    </div>
  )
}

/* ── Sección: Plan de tratamiento ────────────────────────── */
function TreatmentPlanSection({
  patientId, plansData,
}: {
  patientId: string
  plansData: ReturnType<typeof useSWR<TreatmentRow[]>>
}) {
  const [adding, setAdding]   = React.useState(false)
  const [editing, setEditing] = React.useState<string | null>(null)
  const [saving, setSaving]   = React.useState(false)
  const [msg, setMsg]         = React.useState<string | null>(null)

  const empty: Omit<TreatmentRow, 'id'> = {
    tooth: '', diagnosis: '', treatment: '',
    priority: 'normal', status: 'pendiente',
    session_date: null, notes: null, price_est: null,
  }
  const [form, setForm] = React.useState({ ...empty })

  const rows = plansData.data ?? []

  const openAdd = () => { setForm({ ...empty }); setAditing(false); setAdding(true) }

  // eslint-disable-next-line react-hooks/rules-of-hooks — no es un hook
  function setAditing(v: boolean) { setEditing(v ? editing : null) }

  const openEdit = (r: TreatmentRow) => {
    setForm({
      tooth: r.tooth ?? '', diagnosis: r.diagnosis, treatment: r.treatment,
      priority: r.priority, status: r.status,
      session_date: r.session_date ?? null,
      notes: r.notes ?? null, price_est: r.price_est ?? null,
    })
    setEditing(r.id); setAdding(false)
  }

  const save = async () => {
    if (!form.diagnosis.trim() && !form.treatment.trim()) return
    setSaving(true); setMsg(null)
    try {
      const { data: u } = await supabase.auth.getUser()
      if (editing) {
        const { error } = await supabase.from('treatment_plans')
          .update({ ...form, updated_at: new Date().toISOString() }).eq('id', editing)
        if (error) throw error
      } else {
        const { error } = await supabase.from('treatment_plans')
          .insert({ ...form, patient_id: patientId, created_by: u?.user?.id || null })
        if (error) throw error
      }
      setAdding(false); setEditing(null)
      plansData.mutate()
      setMsg('✓ Guardado')
      setTimeout(() => setMsg(null), 2000)
    } catch (e: any) { setMsg('⚠ ' + (e.message || String(e))) }
    finally { setSaving(false) }
  }

  const remove = async (id: string) => {
    if (!confirm('¿Eliminar este procedimiento?')) return
    await supabase.from('treatment_plans').delete().eq('id', id)
    plansData.mutate()
  }

  const updateStatus = async (id: string, status: TreatmentRow['status']) => {
    await supabase.from('treatment_plans').update({ status }).eq('id', id)
    plansData.mutate()
  }

  const f = (k: keyof typeof form, v: any) => setForm(prev => ({ ...prev, [k]: v }))

  return (
    <div className="card p-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-gray-700">🩺 Diagnóstico y Plan de Tratamiento</h2>
        <div className="flex items-center gap-2">
          {msg && <span className="text-sm text-emerald-600">{msg}</span>}
          {!adding && !editing && (
            <button onClick={openAdd} className="btn text-sm">+ Agregar procedimiento</button>
          )}
        </div>
      </div>

      {/* Formulario de agregar / editar */}
      {(adding || editing) && (
        <div className="mb-4 rounded-2xl border-2 border-brand/30 bg-brand/5 p-4 space-y-3">
          <div className="text-sm font-semibold text-brand-dark">
            {editing ? 'Editar procedimiento' : 'Nuevo procedimiento'}
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Diente(s)</label>
              <input className="input text-sm" placeholder="ej. 16, múltiples, superior"
                value={form.tooth ?? ''}
                onChange={e => f('tooth', e.target.value)} />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Fecha de sesión</label>
              <input type="date" className="input text-sm"
                value={form.session_date ?? ''}
                onChange={e => f('session_date', e.target.value || null)} />
            </div>
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Diagnóstico <span className="text-red-400">*</span></label>
            <textarea className="input text-sm min-h-[70px]"
              placeholder="Describe el diagnóstico clínico…"
              value={form.diagnosis}
              onChange={e => f('diagnosis', e.target.value)} />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Tratamiento propuesto <span className="text-red-400">*</span></label>
            <textarea className="input text-sm min-h-[70px]"
              placeholder="Describe el plan de tratamiento…"
              value={form.treatment}
              onChange={e => f('treatment', e.target.value)} />
          </div>
          <div className="grid sm:grid-cols-3 gap-3">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Prioridad</label>
              <select className="input text-sm" value={form.priority} onChange={e => f('priority', e.target.value)}>
                <option value="urgente">🔴 Urgente</option>
                <option value="alta">🟠 Alta</option>
                <option value="normal">⚪ Normal</option>
                <option value="baja">🔵 Baja</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Estado</label>
              <select className="input text-sm" value={form.status} onChange={e => f('status', e.target.value as any)}>
                <option value="pendiente">Pendiente</option>
                <option value="en_proceso">En proceso</option>
                <option value="completado">Completado</option>
                <option value="cancelado">Cancelado</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Precio estimado</label>
              <input type="number" className="input text-sm" placeholder="0.00"
                value={form.price_est ?? ''}
                onChange={e => f('price_est', e.target.value ? Number(e.target.value) : null)} />
            </div>
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Notas adicionales</label>
            <input className="input text-sm" placeholder="Observaciones, materiales, etc."
              value={form.notes ?? ''}
              onChange={e => f('notes', e.target.value || null)} />
          </div>
          <div className="flex gap-2 justify-end pt-1">
            <button onClick={() => { setAdding(false); setEditing(null) }}
              className="px-4 py-2 rounded-xl border text-sm hover:bg-gray-50 transition">
              Cancelar
            </button>
            <button onClick={save} disabled={saving || (!form.diagnosis.trim() && !form.treatment.trim())}
              className="btn text-sm">
              {saving ? 'Guardando…' : 'Guardar'}
            </button>
          </div>
        </div>
      )}

      {/* Tabla */}
      {plansData.isLoading ? (
        <div className="animate-pulse space-y-2">
          {[1,2,3].map(i => <div key={i} className="h-12 rounded-xl bg-gray-100" />)}
        </div>
      ) : rows.length === 0 ? (
        <div className="text-center py-10 text-gray-400">
          <div className="text-3xl mb-2">🩺</div>
          <div className="text-sm">Sin procedimientos registrados</div>
          <button onClick={openAdd} className="btn mt-3 text-sm">
            Agregar primer procedimiento
          </button>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-gray-400 border-b">
                <th className="text-left pb-2 pr-3 font-medium w-16">Diente</th>
                <th className="text-left pb-2 pr-3 font-medium">Diagnóstico</th>
                <th className="text-left pb-2 pr-3 font-medium">Tratamiento</th>
                <th className="text-left pb-2 pr-3 font-medium w-24">Prioridad</th>
                <th className="text-left pb-2 pr-3 font-medium w-28">Estado</th>
                <th className="text-left pb-2 pr-3 font-medium w-24 hidden md:table-cell">Fecha</th>
                <th className="text-left pb-2 font-medium w-20 hidden md:table-cell">Precio</th>
                <th className="pb-2 w-20"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {rows.map(r => (
                <tr key={r.id} className={`hover:bg-gray-50 transition ${r.status === 'completado' ? 'opacity-60' : ''}`}>
                  <td className="py-2.5 pr-3 font-medium text-brand-dark">
                    {r.tooth || <span className="text-gray-300">—</span>}
                  </td>
                  <td className="py-2.5 pr-3 text-gray-700 max-w-[180px]">
                    <div className="line-clamp-2">{r.diagnosis || '—'}</div>
                  </td>
                  <td className="py-2.5 pr-3 text-gray-700 max-w-[200px]">
                    <div className="line-clamp-2">{r.treatment || '—'}</div>
                  </td>
                  <td className="py-2.5 pr-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${PRIORITY_COLOR[r.priority]}`}>
                      {PRIORITY_LABEL[r.priority]}
                    </span>
                  </td>
                  <td className="py-2.5 pr-3">
                    <select
                      value={r.status}
                      onChange={e => updateStatus(r.id, e.target.value as any)}
                      className={`text-xs rounded-lg px-2 py-1 border font-medium cursor-pointer ${STATUS_COLOR[r.status]}`}
                    >
                      <option value="pendiente">Pendiente</option>
                      <option value="en_proceso">En proceso</option>
                      <option value="completado">Completado</option>
                      <option value="cancelado">Cancelado</option>
                    </select>
                  </td>
                  <td className="py-2.5 pr-3 text-gray-400 text-xs hidden md:table-cell">
                    {r.session_date
                      ? new Date(r.session_date + 'T12:00').toLocaleDateString('es-MX')
                      : '—'}
                  </td>
                  <td className="py-2.5 pr-3 text-gray-500 text-xs hidden md:table-cell">
                    {r.price_est
                      ? `$${Number(r.price_est).toLocaleString('es-MX')}`
                      : '—'}
                  </td>
                  <td className="py-2.5">
                    <div className="flex items-center gap-1.5">
                      <button onClick={() => openEdit(r)}
                        className="text-xs text-brand hover:underline">Editar</button>
                      <span className="text-gray-200">|</span>
                      <button onClick={() => remove(r.id)}
                        className="text-xs text-rose-400 hover:text-rose-600">✕</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Resumen */}
          <div className="mt-3 pt-3 border-t flex items-center gap-4 text-xs text-gray-400 flex-wrap">
            <span>{rows.filter(r => r.status === 'pendiente').length} pendiente(s)</span>
            <span>{rows.filter(r => r.status === 'en_proceso').length} en proceso</span>
            <span className="text-emerald-600">{rows.filter(r => r.status === 'completado').length} completado(s)</span>
            {rows.some(r => r.price_est) && (
              <span className="ml-auto font-medium text-gray-600">
                Total estimado: ${rows.reduce((s, r) => s + (r.price_est ?? 0), 0).toLocaleString('es-MX')}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

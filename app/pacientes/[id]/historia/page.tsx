'use client'

import * as React from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import useSWR from 'swr'
import { supabase } from '@/lib/supabase'
import F1Form from '@/components/forms/F1Form'
import OdontogramaDxOverlay from '@/components/OdontogramaDxOverlay'

/* ══════════════════════════════════════════════════════════════
   TIPOS
══════════════════════════════════════════════════════════════ */
type Patient = {
  id: string; first_name: string; last_name: string
  birth_date: string | null; sex: string | null; gender: string | null
  phone: string | null; email: string | null
  blood_type: string | null; rh_factor: string | null
  allergies: string | null; allergies_summary: string | null
  medical_history: string | null; occupation: string | null
  clinic_id: string | null
}

type TreatmentRow = {
  id: string; tooth: string | null; diagnosis: string; treatment: string
  priority: 'urgente' | 'alta' | 'normal' | 'baja'
  status: 'pendiente' | 'en_proceso' | 'completado' | 'cancelado'
  session_date: string | null; notes: string | null; price_est: number | null
}

type ObsRow = { id: string; note: string; taken_at: string }
type FormRow = { id: string; form_type: string; form_date: string }

/* ══════════════════════════════════════════════════════════════
   FETCHERS
══════════════════════════════════════════════════════════════ */
const fetchPatient = async (id: string) => {
  const { data, error } = await supabase.from('patients').select('*').eq('id', id).single()
  if (error) throw error; return data as Patient
}
const fetchForms = async (id: string) => {
  const { data, error } = await supabase.from('clinical_forms')
    .select('id, form_type, form_date').eq('patient_id', id)
    .order('form_date', { ascending: false })
  if (error) throw error; return (data ?? []) as FormRow[]
}
const fetchObs = async (id: string) => {
  const { data, error } = await supabase.from('visit_observations')
    .select('id, note, taken_at').eq('patient_id', id)
    .order('taken_at', { ascending: false }).limit(20)
  if (error) throw error; return (data ?? []) as ObsRow[]
}
const fetchPlans = async (id: string) => {
  const { data, error } = await supabase.from('treatment_plans')
    .select('id, tooth, diagnosis, treatment, priority, status, session_date, notes, price_est')
    .eq('patient_id', id).order('created_at', { ascending: true })
  if (error) throw error; return (data ?? []) as TreatmentRow[]
}

/* ══════════════════════════════════════════════════════════════
   CONSTANTES DE ESTILO
══════════════════════════════════════════════════════════════ */
const PRIORITY_META: Record<string, { label: string; cls: string }> = {
  urgente: { label: 'Urgente',    cls: 'bg-red-100 text-red-700 border-red-200' },
  alta:    { label: 'Alta',       cls: 'bg-orange-100 text-orange-700 border-orange-200' },
  normal:  { label: 'Normal',     cls: 'bg-gray-100 text-gray-500 border-gray-200' },
  baja:    { label: 'Baja',       cls: 'bg-sky-50 text-sky-600 border-sky-200' },
}
const STATUS_META: Record<string, { label: string; cls: string; dot: string }> = {
  pendiente:  { label: 'Pendiente',  cls: 'bg-amber-50 text-amber-700 border-amber-200',    dot: '#f59e0b' },
  en_proceso: { label: 'En proceso', cls: 'bg-blue-50 text-blue-700 border-blue-200',        dot: '#3b82f6' },
  completado: { label: 'Completado', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: '#22c55e' },
  cancelado:  { label: 'Cancelado',  cls: 'bg-gray-100 text-gray-400 border-gray-200',       dot: '#9ca3af' },
}

/* ══════════════════════════════════════════════════════════════
   SECCIONES DE NAVEGACIÓN
══════════════════════════════════════════════════════════════ */
const SECTIONS = [
  { id: 'plan',       icon: '🩺', label: 'Plan de tratamiento' },
  { id: 'odontograma', icon: '🦷', label: 'Odontograma' },
  { id: 'f1',         icon: '📋', label: 'Historia F-1' },
  { id: 'notas',      icon: '📝', label: 'Notas de visita' },
  { id: 'historial',  icon: '🗂️', label: 'Historial F-1' },
] as const

type SectionId = typeof SECTIONS[number]['id']

/* ══════════════════════════════════════════════════════════════
   COMPONENTE PRINCIPAL
══════════════════════════════════════════════════════════════ */
export default function HistoriaClinicaPage() {
  const { id } = useParams() as { id: string }

  const patientQ = useSWR(['patient', id], () => fetchPatient(id))
  const formsQ   = useSWR(['forms',   id], () => fetchForms(id))
  const obsQ     = useSWR(['obs',     id], () => fetchObs(id))
  const plansQ   = useSWR(['plans',   id], () => fetchPlans(id))

  const [activeSection, setActiveSection] = React.useState<SectionId>('plan')
  const [note,          setNote]          = React.useState('')
  const [savingObs,     setSavingObs]     = React.useState(false)
  const [obsMsg,        setObsMsg]        = React.useState<string | null>(null)

  React.useEffect(() => {
    const rf = () => formsQ.mutate()
    window.addEventListener('forms:changed', rf)
    return () => window.removeEventListener('forms:changed', rf)
  }, [formsQ])

  const saveObs = async () => {
    if (!note.trim()) return
    setSavingObs(true); setObsMsg(null)
    try {
      const { data: u } = await supabase.auth.getUser()
      const { error } = await supabase.from('visit_observations').insert({
        patient_id: id, author_id: u?.user?.id || null, note,
      })
      if (error) throw error
      setNote(''); obsQ.mutate()
      setObsMsg('✓ Guardado'); setTimeout(() => setObsMsg(null), 2500)
    } catch (e: any) { setObsMsg('⚠ ' + (e.message || String(e))) }
    finally { setSavingObs(false) }
  }

  if (patientQ.isLoading) return (
    <div className="flex items-center justify-center py-20 gap-3 text-gray-400">
      <div style={{ width: 20, height: 20, borderRadius: '50%', border: '2.5px solid #2B9C93', borderTopColor: 'transparent', animation: 'spin 0.7s linear infinite' }}/>
      <span>Cargando historia clínica…</span>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
  if (patientQ.error) return <div className="card p-6 text-red-600">Error al cargar paciente</div>

  const patient = patientQ.data!
  const age = patient.birth_date ? (() => {
    const [y, m, d] = patient.birth_date!.split('-').map(Number)
    const t = new Date(); let a = t.getFullYear() - y
    if (t.getMonth() + 1 < m || (t.getMonth() + 1 === m && t.getDate() < d)) a--
    return a
  })() : null

  const pendingCount    = (plansQ.data ?? []).filter(r => r.status === 'pendiente').length
  const inProcessCount  = (plansQ.data ?? []).filter(r => r.status === 'en_proceso').length
  const completedCount  = (plansQ.data ?? []).filter(r => r.status === 'completado').length

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)' }}>

      {/* ── BANNER DEL PACIENTE ───────────────────────────────── */}
      <div className="bg-white border-b border-gray-200 sticky top-16 z-20">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-4 flex-wrap">
          {/* Avatar inicial */}
          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-base shrink-0"
            style={{ background: 'linear-gradient(135deg, #2B9C93, #217A73)' }}>
            {patient.first_name[0]}{patient.last_name[0]}
          </div>

          {/* Nombre y datos rápidos */}
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline gap-2 flex-wrap">
              <h1 className="text-lg font-bold text-gray-900 leading-tight">
                {patient.last_name}, {patient.first_name}
              </h1>
              {age !== null && (
                <span className="text-sm text-gray-400">{age} años</span>
              )}
            </div>
            <div className="flex items-center gap-3 mt-0.5 flex-wrap">
              {patient.blood_type && (
                <span className="text-xs font-semibold text-rose-600 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-md">
                  🩸 {patient.blood_type}{patient.rh_factor ?? ''}
                </span>
              )}
              {(patient.allergies_summary || patient.allergies) && (
                <span className="text-xs text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md">
                  ⚠️ {patient.allergies_summary || patient.allergies}
                </span>
              )}
              {patient.phone && (
                <a href={`tel:${patient.phone}`} className="text-xs text-gray-400 hover:text-brand transition">
                  📱 {patient.phone}
                </a>
              )}
            </div>
          </div>

          {/* Acciones rápidas */}
          <div className="flex items-center gap-2 ml-auto flex-wrap">
            <Link
              href={`/pacientes/${patient.id}/historia/odontograma/print`}
              target="_blank"
              className="px-3 py-1.5 rounded-xl text-xs font-medium border border-gray-200 text-gray-500 hover:bg-gray-50 transition"
            >
              🖨️ Imprimir
            </Link>
            <Link
              href={`/pacientes/${patient.id}`}
              className="px-3 py-1.5 rounded-xl text-xs font-medium bg-brand text-white hover:bg-brand-dark transition"
            >
              ← Ficha
            </Link>
          </div>
        </div>

        {/* ── NAV DE SECCIONES ───────────────────────────────── */}
        <div className="max-w-6xl mx-auto px-4 flex overflow-x-auto gap-0 border-t border-gray-100">
          {SECTIONS.map(s => {
            const isActive = activeSection === s.id
            const badge = s.id === 'plan' && pendingCount > 0 ? pendingCount : null
            return (
              <button
                key={s.id}
                onClick={() => setActiveSection(s.id)}
                className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 whitespace-nowrap transition-all shrink-0 ${
                  isActive
                    ? 'border-brand text-brand'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-200'
                }`}
              >
                <span>{s.icon}</span>
                <span>{s.label}</span>
                {badge !== null && (
                  <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700">
                    {badge}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* ── CONTENIDO ─────────────────────────────────────────── */}
      <div className="max-w-6xl mx-auto px-4 py-6">

        {/* ── SECCIÓN: PLAN DE TRATAMIENTO ─────────────────── */}
        {activeSection === 'plan' && (
          <TreatmentPlanSection
            patientId={id}
            plansData={plansQ}
            pendingCount={pendingCount}
            inProcessCount={inProcessCount}
            completedCount={completedCount}
          />
        )}

        {/* ── SECCIÓN: ODONTOGRAMA ─────────────────────────── */}
        {activeSection === 'odontograma' && (
          <div className="space-y-4">
            <SectionHeader
              icon="🦷" title="Odontograma diagnóstico"
              action={
                <Link
                  href={`/pacientes/${patient.id}/odontogramas`}
                  className="px-3 py-1.5 rounded-xl text-xs font-medium border border-gray-200 text-gray-500 hover:bg-gray-50 transition"
                >
                  Ver historial de versiones →
                </Link>
              }
            />
            <OdontogramaDxOverlay patientId={patient.id} mode="diagnostico" />
          </div>
        )}

        {/* ── SECCIÓN: HISTORIA F-1 ────────────────────────── */}
        {activeSection === 'f1' && (
          <div className="space-y-4">
            <SectionHeader icon="📋" title="Historia clínica estomatológica F-1" />
            <div className="card p-5">
              <F1Form patient={patient} />
            </div>
          </div>
        )}

        {/* ── SECCIÓN: NOTAS DE VISITA ─────────────────────── */}
        {activeSection === 'notas' && (
          <div className="space-y-4">
            <SectionHeader
              icon="📝" title="Notas de visita"
              subtitle={`${(obsQ.data ?? []).length} nota${(obsQ.data ?? []).length !== 1 ? 's' : ''} registrada${(obsQ.data ?? []).length !== 1 ? 's' : ''}`}
            />

            {/* Nueva nota */}
            <div className="card p-5">
              <div className="text-sm font-semibold text-gray-700 mb-3">Nueva nota de visita</div>
              <textarea
                className="textarea w-full text-sm"
                placeholder="Observaciones, indicaciones, hallazgos o notas clínicas de esta visita…"
                value={note}
                onChange={e => setNote(e.target.value)}
                rows={4}
              />
              <div className="mt-3 flex items-center justify-between gap-3">
                <div className="text-xs text-gray-400">
                  {new Date().toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                </div>
                <div className="flex items-center gap-3">
                  {obsMsg && (
                    <span className={`text-sm font-medium ${obsMsg.startsWith('⚠') ? 'text-red-600' : 'text-emerald-600'}`}>
                      {obsMsg}
                    </span>
                  )}
                  <button
                    className="btn text-sm"
                    onClick={saveObs}
                    disabled={savingObs || !note.trim()}
                  >
                    {savingObs ? 'Guardando…' : 'Guardar nota'}
                  </button>
                </div>
              </div>
            </div>

            {/* Lista de notas */}
            {obsQ.isLoading && <SkeletonList n={3} />}
            {!obsQ.isLoading && (obsQ.data ?? []).length === 0 && (
              <EmptyState icon="📝" title="Sin notas registradas" desc="Las notas de visita aparecerán aquí." />
            )}
            <div className="space-y-3">
              {(obsQ.data ?? []).map((o, idx) => (
                <div key={o.id} className="card px-5 py-4 flex gap-4">
                  {/* Línea de tiempo */}
                  <div className="flex flex-col items-center shrink-0">
                    <div className="w-2 h-2 rounded-full bg-brand mt-1.5"/>
                    {idx < (obsQ.data ?? []).length - 1 && (
                      <div className="w-px flex-1 bg-gray-200 mt-1"/>
                    )}
                  </div>
                  <div className="flex-1 min-w-0 pb-2">
                    <div className="text-xs text-gray-400 mb-1.5">
                      {new Date(o.taken_at).toLocaleDateString('es-MX', {
                        weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
                        hour: '2-digit', minute: '2-digit',
                      })}
                    </div>
                    <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{o.note}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── SECCIÓN: HISTORIAL F-1 ───────────────────────── */}
        {activeSection === 'historial' && (
          <div className="space-y-4">
            <SectionHeader
              icon="🗂️" title="Historial de formularios F-1"
              subtitle={`${(formsQ.data ?? []).length} formulario${(formsQ.data ?? []).length !== 1 ? 's' : ''} guardado${(formsQ.data ?? []).length !== 1 ? 's' : ''}`}
            />

            {formsQ.isLoading && <SkeletonList n={3} />}
            {!formsQ.isLoading && (formsQ.data ?? []).length === 0 && (
              <EmptyState
                icon="📋"
                title="Sin formularios guardados"
                desc="Los formularios F-1 guardados desde la pestaña Historia F-1 aparecerán aquí."
                action={
                  <button onClick={() => setActiveSection('f1')} className="btn mt-3 text-sm">
                    Ir a Historia F-1
                  </button>
                }
              />
            )}
            <div className="space-y-2">
              {(formsQ.data ?? []).map((f, idx) => (
                <div key={f.id} className="card px-5 py-4 flex items-center gap-4 hover:shadow-md transition group">
                  <div className="w-8 h-8 rounded-xl bg-brand/10 flex items-center justify-center text-brand font-bold text-sm shrink-0">
                    {(formsQ.data ?? []).length - idx}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-gray-800">
                      {f.form_type === 'estomatologica_f1' ? 'Historia estomatológica F-1' : f.form_type}
                    </div>
                    <div className="text-xs text-gray-400 mt-0.5">
                      {new Date(f.form_date).toLocaleDateString('es-MX', {
                        weekday: 'short', day: 'numeric', month: 'long', year: 'numeric',
                      })}
                    </div>
                  </div>
                  <Link
                    href={`/pacientes/${patient.id}/historia/${f.id}`}
                    className="px-3 py-1.5 rounded-xl text-xs font-medium border border-gray-200 text-brand hover:bg-brand/5 transition opacity-0 group-hover:opacity-100"
                  >
                    Ver →
                  </Link>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>

      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════
   PLAN DE TRATAMIENTO
══════════════════════════════════════════════════════════════ */
function TreatmentPlanSection({
  patientId, plansData, pendingCount, inProcessCount, completedCount,
}: {
  patientId: string
  plansData: ReturnType<typeof useSWR<TreatmentRow[]>>
  pendingCount: number; inProcessCount: number; completedCount: number
}) {
  const [adding,  setAdding]  = React.useState(false)
  const [editing, setEditing] = React.useState<string | null>(null)
  const [saving,  setSaving]  = React.useState(false)
  const [msg,     setMsg]     = React.useState<string | null>(null)
  const [filter,  setFilter]  = React.useState<string>('todos')

  const emptyForm = {
    tooth: '', diagnosis: '', treatment: '',
    priority: 'normal' as const, status: 'pendiente' as const,
    session_date: '', notes: '', price_est: '',
  }
  const [form, setForm] = React.useState({ ...emptyForm })

  const rows = plansData.data ?? []
  const filtered = filter === 'todos' ? rows : rows.filter(r => r.status === filter)
  const totalEst = rows.reduce((s, r) => s + (r.price_est ?? 0), 0)

  const openAdd = () => {
    setForm({ ...emptyForm }); setEditing(null); setAdding(true)
    setTimeout(() => document.getElementById('plan-form-scroll')?.scrollIntoView({ behavior: 'smooth' }), 50)
  }

  const openEdit = (r: TreatmentRow) => {
    setForm({
      tooth: r.tooth ?? '', diagnosis: r.diagnosis, treatment: r.treatment,
      priority: r.priority, status: r.status,
      session_date: r.session_date ?? '', notes: r.notes ?? '', price_est: String(r.price_est ?? ''),
    })
    setEditing(r.id); setAdding(false)
    setTimeout(() => document.getElementById('plan-form-scroll')?.scrollIntoView({ behavior: 'smooth' }), 50)
  }

  const cancel = () => { setAdding(false); setEditing(null) }

  const save = async () => {
    if (!form.diagnosis.trim() && !form.treatment.trim()) return
    setSaving(true); setMsg(null)
    try {
      const { data: u } = await supabase.auth.getUser()
      const payload = {
        tooth: form.tooth || null,
        diagnosis: form.diagnosis, treatment: form.treatment,
        priority: form.priority, status: form.status,
        session_date: form.session_date || null,
        notes: form.notes || null,
        price_est: form.price_est ? Number(form.price_est) : null,
      }
      if (editing) {
        const { error } = await supabase.from('treatment_plans').update(payload).eq('id', editing)
        if (error) throw error
      } else {
        const { error } = await supabase.from('treatment_plans').insert({
          ...payload, patient_id: patientId, created_by: u?.user?.id || null,
        })
        if (error) throw error
      }
      cancel(); plansData.mutate()
      setMsg('✓ Guardado'); setTimeout(() => setMsg(null), 2500)
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

  const f = (k: keyof typeof form, v: string) => setForm(prev => ({ ...prev, [k]: v }))

  return (
    <div className="space-y-4">
      {/* Header de sección */}
      <SectionHeader
        icon="🩺"
        title="Diagnóstico y Plan de tratamiento"
        subtitle={rows.length > 0 ? `${rows.length} procedimiento${rows.length !== 1 ? 's' : ''}` : undefined}
        action={
          <div className="flex items-center gap-2">
            {msg && <span className={`text-sm font-medium ${msg.startsWith('⚠') ? 'text-red-600' : 'text-emerald-600'}`}>{msg}</span>}
            {!adding && !editing && (
              <button onClick={openAdd} className="btn text-sm">+ Agregar procedimiento</button>
            )}
          </div>
        }
      />

      {/* Tarjetas de resumen */}
      {rows.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <SummaryCard
            label="Pendientes" value={pendingCount}
            color="amber" active={filter === 'pendiente'}
            onClick={() => setFilter(filter === 'pendiente' ? 'todos' : 'pendiente')}
          />
          <SummaryCard
            label="En proceso" value={inProcessCount}
            color="blue" active={filter === 'en_proceso'}
            onClick={() => setFilter(filter === 'en_proceso' ? 'todos' : 'en_proceso')}
          />
          <SummaryCard
            label="Completados" value={completedCount}
            color="emerald" active={filter === 'completado'}
            onClick={() => setFilter(filter === 'completado' ? 'todos' : 'completado')}
          />
          <div className={`rounded-2xl border p-4 flex flex-col gap-1 bg-gray-50 border-gray-200`}>
            <div className="text-xl font-bold text-gray-700 tabular-nums">
              ${totalEst.toLocaleString('es-MX')}
            </div>
            <div className="text-xs text-gray-400 leading-tight">Total estimado</div>
          </div>
        </div>
      )}

      {/* Formulario add/edit */}
      {(adding || editing) && (
        <div id="plan-form-scroll" className="card p-5 border-2 border-brand/30 space-y-4">
          <div className="flex items-center justify-between">
            <div className="text-sm font-bold text-brand-dark">
              {editing ? '✏️ Editar procedimiento' : '➕ Nuevo procedimiento'}
            </div>
            <button onClick={cancel} className="text-gray-400 hover:text-gray-600 text-lg leading-none">✕</button>
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Diente(s)</label>
              <input className="input text-sm" placeholder="ej. 16, 26, superior izq." value={form.tooth} onChange={e => f('tooth', e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Fecha de sesión</label>
              <input type="date" className="input text-sm" value={form.session_date} onChange={e => f('session_date', e.target.value)} />
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Diagnóstico <span className="text-red-400">*</span></label>
              <textarea className="input text-sm min-h-[88px]" placeholder="Describe el diagnóstico clínico…" value={form.diagnosis} onChange={e => f('diagnosis', e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Tratamiento propuesto <span className="text-red-400">*</span></label>
              <textarea className="input text-sm min-h-[88px]" placeholder="Describe el plan de tratamiento…" value={form.treatment} onChange={e => f('treatment', e.target.value)} />
            </div>
          </div>

          <div className="grid sm:grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Prioridad</label>
              <select className="input text-sm" value={form.priority} onChange={e => f('priority', e.target.value)}>
                <option value="urgente">🔴 Urgente</option>
                <option value="alta">🟠 Alta</option>
                <option value="normal">⚪ Normal</option>
                <option value="baja">🔵 Baja</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Estado</label>
              <select className="input text-sm" value={form.status} onChange={e => f('status', e.target.value)}>
                <option value="pendiente">Pendiente</option>
                <option value="en_proceso">En proceso</option>
                <option value="completado">Completado</option>
                <option value="cancelado">Cancelado</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Precio estimado</label>
              <input type="number" min="0" className="input text-sm" placeholder="$0.00" value={form.price_est} onChange={e => f('price_est', e.target.value)} />
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">Notas adicionales</label>
            <input className="input text-sm" placeholder="Materiales, observaciones, referencias…" value={form.notes} onChange={e => f('notes', e.target.value)} />
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <button onClick={cancel} className="px-4 py-2 rounded-xl border text-sm text-gray-500 hover:bg-gray-50 transition">Cancelar</button>
            <button
              onClick={save}
              disabled={saving || (!form.diagnosis.trim() && !form.treatment.trim())}
              className="btn text-sm"
            >
              {saving ? 'Guardando…' : 'Guardar'}
            </button>
          </div>
        </div>
      )}

      {/* Loading */}
      {plansData.isLoading && <SkeletonList n={3} />}

      {/* Empty */}
      {!plansData.isLoading && rows.length === 0 && (
        <EmptyState
          icon="🩺" title="Sin procedimientos registrados"
          desc="Agrega el primer procedimiento del plan de tratamiento."
          action={<button onClick={openAdd} className="btn mt-3 text-sm">+ Agregar procedimiento</button>}
        />
      )}

      {/* Lista de procedimientos */}
      {!plansData.isLoading && rows.length > 0 && (
        <div className="space-y-2">
          {filtered.map(r => {
            const pm = PRIORITY_META[r.priority] ?? PRIORITY_META.normal
            const sm = STATUS_META[r.status] ?? STATUS_META.pendiente
            const isCompleted = r.status === 'completado'
            const isCancelled = r.status === 'cancelado'

            return (
              <div
                key={r.id}
                className={`card px-5 py-4 transition group ${isCompleted || isCancelled ? 'opacity-60' : ''}`}
              >
                <div className="flex items-start gap-4 flex-wrap">
                  {/* Diente */}
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm shrink-0"
                    style={{ background: '#f0fdfa', color: '#0f766e', border: '1.5px solid #ccfbf1' }}>
                    {r.tooth ? r.tooth.split(',')[0].trim().slice(0, 3) : '—'}
                  </div>

                  {/* Contenido */}
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-xs px-2 py-0.5 rounded-full border font-semibold ${pm.cls}`}>
                        {pm.label}
                      </span>
                      {r.session_date && (
                        <span className="text-xs text-gray-400">
                          📅 {new Date(r.session_date + 'T12:00').toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })}
                        </span>
                      )}
                      {r.price_est && (
                        <span className="text-xs text-gray-400">
                          💰 ${Number(r.price_est).toLocaleString('es-MX')}
                        </span>
                      )}
                    </div>

                    {r.diagnosis && (
                      <div className="text-sm text-gray-800">
                        <span className="text-xs font-semibold text-gray-400 mr-1.5">DX</span>
                        <span className={isCancelled ? 'line-through' : ''}>{r.diagnosis}</span>
                      </div>
                    )}

                    {r.treatment && (
                      <div className="text-sm text-gray-600">
                        <span className="text-xs font-semibold text-gray-400 mr-1.5">TX</span>
                        {r.treatment}
                      </div>
                    )}

                    {r.notes && (
                      <div className="text-xs text-gray-400 italic">{r.notes}</div>
                    )}
                  </div>

                  {/* Estado + acciones */}
                  <div className="flex items-center gap-2 shrink-0">
                    <select
                      value={r.status}
                      onChange={e => updateStatus(r.id, e.target.value as any)}
                      className={`text-xs rounded-lg px-2 py-1.5 border font-semibold cursor-pointer ${sm.cls}`}
                    >
                      <option value="pendiente">Pendiente</option>
                      <option value="en_proceso">En proceso</option>
                      <option value="completado">Completado</option>
                      <option value="cancelado">Cancelado</option>
                    </select>

                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition">
                      <button
                        onClick={() => openEdit(r)}
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-brand hover:bg-brand/10 transition text-sm"
                        title="Editar"
                      >✏️</button>
                      <button
                        onClick={() => remove(r.id)}
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-rose-400 hover:bg-rose-50 transition text-sm"
                        title="Eliminar"
                      >✕</button>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}

          {filter !== 'todos' && filtered.length === 0 && (
            <div className="card p-6 text-center text-sm text-gray-400">
              No hay procedimientos con estado "{STATUS_META[filter]?.label ?? filter}"
              <button onClick={() => setFilter('todos')} className="block mx-auto mt-2 text-brand hover:underline text-xs">
                Ver todos
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════
   SUBCOMPONENTES UI
══════════════════════════════════════════════════════════════ */
function SectionHeader({
  icon, title, subtitle, action,
}: {
  icon: string; title: string; subtitle?: string; action?: React.ReactNode
}) {
  return (
    <div className="flex items-center gap-3 flex-wrap">
      <div className="w-9 h-9 rounded-xl bg-brand/10 flex items-center justify-center text-lg shrink-0">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-bold text-gray-800 text-base leading-tight">{title}</div>
        {subtitle && <div className="text-xs text-gray-400 mt-0.5">{subtitle}</div>}
      </div>
      {action && <div className="ml-auto">{action}</div>}
    </div>
  )
}

function SummaryCard({
  label, value, color, active, onClick,
}: {
  label: string; value: number; color: string; active: boolean; onClick: () => void
}) {
  const colors: Record<string, { bg: string; border: string; num: string }> = {
    amber:   { bg: active ? '#fffbeb' : '#fafafa', border: active ? '#fbbf24' : '#e5e7eb', num: '#d97706' },
    blue:    { bg: active ? '#eff6ff' : '#fafafa', border: active ? '#93c5fd' : '#e5e7eb', num: '#2563eb' },
    emerald: { bg: active ? '#f0fdf4' : '#fafafa', border: active ? '#86efac' : '#e5e7eb', num: '#16a34a' },
  }
  const c = colors[color] ?? colors.amber
  return (
    <button
      onClick={onClick}
      className="rounded-2xl border p-4 flex flex-col gap-1 text-left transition hover:shadow-sm"
      style={{ background: c.bg, borderColor: c.border }}
    >
      <div className="text-2xl font-bold tabular-nums" style={{ color: c.num }}>{value}</div>
      <div className="text-xs text-gray-400 leading-tight">{label}</div>
    </button>
  )
}

function EmptyState({ icon, title, desc, action }: {
  icon: string; title: string; desc: string; action?: React.ReactNode
}) {
  return (
    <div className="card p-10 text-center">
      <div className="text-4xl mb-3">{icon}</div>
      <div className="font-semibold text-gray-600 mb-1">{title}</div>
      <div className="text-sm text-gray-400">{desc}</div>
      {action}
    </div>
  )
}

function SkeletonList({ n }: { n: number }) {
  return (
    <div className="space-y-2 animate-pulse">
      {Array.from({ length: n }).map((_, i) => (
        <div key={i} className="h-16 rounded-2xl bg-gray-100" />
      ))}
    </div>
  )
}

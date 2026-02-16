'use client'

import React, { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'

function toUTC(dateStr: string, timeStr: string) {
  const [y, m, d] = dateStr.split('-').map(Number)
  const [hh, mm]  = timeStr.split(':').map(Number)
  return new Date(y, m - 1, d, hh, mm, 0).toISOString()
}

type PatientLite = { id: string; first_name: string; last_name: string; phone?: string | null }

const MOTIVOS = ['Revisión general', 'Limpieza dental', 'Extracción', 'Endodoncia', 'Ortodoncia', 'Implante', 'Blanqueamiento', 'Urgencia', 'Seguimiento', 'Varios']
const DURACIONES = [{ label: '30 min', mins: 30 }, { label: '45 min', mins: 45 }, { label: '1 hora', mins: 60 }, { label: '1:30 h', mins: 90 }, { label: '2 horas', mins: 120 }]

export default function Client() {
  const router = useRouter()
  const sp     = useSearchParams()
  const initialPid  = sp.get('patient_id') ?? ''
  const initialDate = sp.get('date') ?? ''

  const todayISO = useMemo(() => {
    const d = new Date()
    const p = (n: number) => String(n).padStart(2, '0')
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
  }, [])

  const [date,     setDate]     = useState(initialDate || todayISO)
  const [start,    setStart]    = useState('10:00')
  const [durMins,  setDurMins]  = useState(60)
  const [reason,   setReason]   = useState('')
  const [notes,    setNotes]    = useState('')
  const [patientId,setPatientId]= useState(initialPid)
  const [patient,  setPatient]  = useState<PatientLite | null>(null)
  const [saving,   setSaving]   = useState(false)
  const [errMsg,   setErrMsg]   = useState<string | null>(null)

  // Búsqueda de pacientes
  const [q,       setQ]       = useState('')
  const [results, setResults] = useState<PatientLite[]>([])
  const [focused, setFocused] = useState(false)

  // Modal nuevo paciente
  const [showNew,   setShowNew]   = useState(false)
  const [npFirst,   setNpFirst]   = useState('')
  const [npLast,    setNpLast]    = useState('')
  const [npPhone,   setNpPhone]   = useState('')
  const [creating,  setCreating]  = useState(false)

  // Calcular hora fin
  const endTime = useMemo(() => {
    if (!start) return ''
    const [hh, mm] = start.split(':').map(Number)
    const total = hh * 60 + mm + durMins
    const eh = Math.floor(total / 60) % 24
    const em = total % 60
    return `${String(eh).padStart(2,'0')}:${String(em).padStart(2,'0')}`
  }, [start, durMins])

  // Si viene patientId preseleccionado, cargar datos
  useEffect(() => {
    if (!initialPid) return
    ;(async () => {
      const { data } = await supabase.from('patients').select('id, first_name, last_name, phone').eq('id', initialPid).maybeSingle()
      if (data) setPatient(data as PatientLite)
    })()
  }, [initialPid])

  async function searchPatients(term: string) {
    setQ(term)
    if (!term.trim()) { setResults([]); return }
    const { data } = await supabase.from('patients')
      .select('id, first_name, last_name, phone')
      .or(`first_name.ilike.%${term}%,last_name.ilike.%${term}%,phone.ilike.%${term}%`)
      .order('last_name').limit(10)
    setResults((data as any) ?? [])
  }

  function selectPatient(p: PatientLite) {
    setPatient(p); setPatientId(p.id); setQ(''); setResults([])
  }

  async function createQuickPatient() {
    if (!npFirst.trim() || !npLast.trim()) { alert('Nombre y apellidos son obligatorios'); return }
    setCreating(true)
    const { data, error } = await supabase.from('patients')
      .insert({ first_name: npFirst.trim(), last_name: npLast.trim(), phone: npPhone.trim() || null })
      .select('id, first_name, last_name, phone').single()
    setCreating(false)
    if (error) { alert(error.message); return }
    selectPatient(data as PatientLite)
    setShowNew(false); setNpFirst(''); setNpLast(''); setNpPhone('')
  }

  async function onSave(e: React.FormEvent) {
    e.preventDefault()
    if (!patientId) { setErrMsg('Debes seleccionar un paciente'); return }
    setSaving(true); setErrMsg(null)
    const starts_at = toUTC(date, start)
    const ends_at   = toUTC(date, endTime)
    const { error } = await supabase.from('appointments')
      .insert({ patient_id: patientId, starts_at, ends_at, reason: reason || 'Varios', notes, status: 'scheduled' })
    setSaving(false)
    if (error) { setErrMsg(error.message); return }
    router.push('/citas')
  }

  return (
    <div className="max-w-2xl mx-auto space-y-5">

      {/* Header */}
      <div className="flex items-center gap-3">
        <div>
          <h1 className="page-title">Nueva cita</h1>
          <p className="text-xs text-gray-400 mt-0.5">Completa los datos para agendar</p>
        </div>
        <Link href="/citas" className="btn ml-auto text-sm">← Volver</Link>
      </div>

      <form onSubmit={onSave} className="space-y-4">

        {/* 1 — Paciente */}
        <div className="card p-5 space-y-3">
          <div className="text-sm font-bold text-gray-700 flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-brand text-white text-xs flex items-center justify-center font-bold">1</span>
            Paciente
          </div>

          {patient ? (
            <div className="flex items-center gap-3 p-3 rounded-xl bg-brand/5 border border-brand/20">
              <div className="w-10 h-10 rounded-xl bg-brand/20 flex items-center justify-center font-bold text-brand text-sm shrink-0">
                {patient.first_name[0]}{patient.last_name[0]}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-gray-800">{patient.last_name}, {patient.first_name}</div>
                {patient.phone && <div className="text-xs text-gray-400">{patient.phone}</div>}
              </div>
              <button type="button" onClick={() => { setPatient(null); setPatientId('') }}
                className="text-gray-400 hover:text-gray-600 text-lg leading-none">×</button>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">🔍</span>
                <input
                  className="input pl-9 text-sm"
                  placeholder="Buscar por nombre o teléfono…"
                  value={q}
                  onChange={e => searchPatients(e.target.value)}
                  onFocus={() => setFocused(true)}
                  onBlur={() => setTimeout(() => setFocused(false), 150)}
                  autoComplete="off"
                />
              </div>
              {focused && results.length > 0 && (
                <div className="border border-gray-200 rounded-xl overflow-hidden shadow-md bg-white">
                  {results.map(p => (
                    <button type="button" key={p.id} onClick={() => selectPatient(p)}
                      className="w-full text-left px-4 py-2.5 hover:bg-brand/5 transition flex items-center gap-3 border-b border-gray-50 last:border-0">
                      <div className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-500 shrink-0">
                        {p.first_name[0]}{p.last_name[0]}
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-800">{p.last_name}, {p.first_name}</div>
                        {p.phone && <div className="text-xs text-gray-400">{p.phone}</div>}
                      </div>
                    </button>
                  ))}
                </div>
              )}
              <button type="button" onClick={() => setShowNew(true)}
                className="text-xs text-brand hover:underline font-medium">
                + Registrar nuevo paciente
              </button>
            </div>
          )}
        </div>

        {/* 2 — Fecha y hora */}
        <div className="card p-5 space-y-4">
          <div className="text-sm font-bold text-gray-700 flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-brand text-white text-xs flex items-center justify-center font-bold">2</span>
            Fecha y horario
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Fecha</label>
              <input type="date" className="input text-sm w-full" value={date} onChange={e => setDate(e.target.value)} required />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Hora inicio</label>
              <input type="time" className="input text-sm w-full" value={start} onChange={e => setStart(e.target.value)} required />
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-gray-500 mb-2 block">Duración</label>
            <div className="flex gap-2 flex-wrap">
              {DURACIONES.map(d => (
                <button type="button" key={d.mins} onClick={() => setDurMins(d.mins)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition ${
                    durMins === d.mins ? 'bg-brand text-white border-transparent' : 'bg-white text-gray-600 border-gray-200 hover:border-brand'
                  }`}>
                  {d.label}
                </button>
              ))}
            </div>
            {endTime && (
              <div className="mt-2 text-xs text-gray-400">
                Termina a las <span className="font-semibold text-gray-600">{endTime}</span>
              </div>
            )}
          </div>
        </div>

        {/* 3 — Motivo */}
        <div className="card p-5 space-y-3">
          <div className="text-sm font-bold text-gray-700 flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-brand text-white text-xs flex items-center justify-center font-bold">3</span>
            Motivo y notas
          </div>

          <div>
            <label className="text-xs font-medium text-gray-500 mb-2 block">Motivo de la cita</label>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {MOTIVOS.map(m => (
                <button type="button" key={m} onClick={() => setReason(m)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition ${
                    reason === m ? 'bg-brand/10 border-brand/30 text-brand' : 'bg-white border-gray-200 text-gray-500 hover:border-brand/30'
                  }`}>
                  {m}
                </button>
              ))}
            </div>
            <input className="input text-sm" placeholder="O escribe un motivo personalizado…"
              value={reason} onChange={e => setReason(e.target.value)} />
          </div>

          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">Notas adicionales</label>
            <textarea className="input text-sm w-full" rows={3}
              placeholder="Indicaciones, materiales necesarios, observaciones…"
              value={notes} onChange={e => setNotes(e.target.value)} />
          </div>
        </div>

        {/* Error */}
        {errMsg && (
          <div className="px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700">⚠ {errMsg}</div>
        )}

        {/* Submit */}
        <div className="flex gap-3 justify-end">
          <Link href="/citas" className="px-4 py-2.5 rounded-xl border text-sm text-gray-500 hover:bg-gray-50 transition">
            Cancelar
          </Link>
          <button type="submit" disabled={saving || !patientId}
            className={`btn text-sm px-6 ${(!patientId || saving) ? 'opacity-60 cursor-not-allowed' : ''}`}>
            {saving ? 'Guardando…' : '✓ Agendar cita'}
          </button>
        </div>
      </form>

      {/* Modal nuevo paciente */}
      {showNew && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <div className="font-bold text-gray-800">Nuevo paciente rápido</div>
              <button onClick={() => setShowNew(false)} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Nombre(s) *</label>
                <input className="input text-sm w-full" placeholder="Juan" value={npFirst} onChange={e => setNpFirst(e.target.value)} />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Apellidos *</label>
                <input className="input text-sm w-full" placeholder="García López" value={npLast} onChange={e => setNpLast(e.target.value)} />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Teléfono</label>
                <input className="input text-sm w-full" placeholder="55 1234 5678" value={npPhone} onChange={e => setNpPhone(e.target.value)} />
              </div>
            </div>
            <div className="flex gap-2 justify-end pt-1">
              <button onClick={() => setShowNew(false)} className="px-4 py-2 rounded-xl border text-sm text-gray-500 hover:bg-gray-50">
                Cancelar
              </button>
              <button onClick={createQuickPatient} disabled={creating}
                className="btn text-sm">
                {creating ? 'Creando…' : 'Crear paciente'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

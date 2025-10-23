'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';

// Convierte fecha+hora LOCAL a un instante UTC (Z)
function toUTC(dateStr: string, timeStr: string) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const [hh, mm] = timeStr.split(':').map(Number);
  return new Date(y, m - 1, d, hh, mm, 0).toISOString();
}

type PatientLite = { id: string; first_name: string; last_name: string };

export default function Client() {
  const router = useRouter();
  const sp = useSearchParams();
  const initialPid = sp.get('patient_id') ?? '';

  const todayISO = useMemo(() => {
    const d = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  }, []);

  const [date, setDate] = useState<string>(todayISO);
  const [start, setStart] = useState<string>('10:00');
  const [end, setEnd] = useState<string>('11:00');
  const [reason, setReason] = useState<string>('Varios');
  const [notes, setNotes] = useState<string>('');

  const [patientId, setPatientId] = useState<string>(initialPid);
  const [saving, setSaving] = useState(false);

  // Picker de pacientes (cuando no hay patient_id)
  const [q, setQ] = useState('');
  const [results, setResults] = useState<PatientLite[]>([]);

  async function searchPatients(term: string) {
    setQ(term);
    if (!term.trim()) { setResults([]); return; }
    const { data } = await supabase
      .from('patients')
      .select('id, first_name, last_name')
      .or(`first_name.ilike.%${term}%,last_name.ilike.%${term}%`)
      .order('last_name', { ascending: true })
      .limit(20);
    setResults((data as any) ?? []);
  }

  // Modal "Paciente nuevo"
  const [showNewPatient, setShowNewPatient] = useState(false);
  const [npFirst, setNpFirst] = useState('');
  const [npLast, setNpLast] = useState('');
  const [npPhone, setNpPhone] = useState('');
  const [creating, setCreating] = useState(false);

  async function createQuickPatient() {
    if (!npFirst.trim() || !npLast.trim()) {
      alert('Nombre y apellidos son obligatorios');
      return;
    }
    setCreating(true);
    const { data, error } = await supabase
      .from('patients')
      .insert({
        first_name: npFirst.trim(),
        last_name: npLast.trim(),
        phone: npPhone.trim() || null,
      })
      .select('id')
      .single();
    setCreating(false);
    if (error) { alert(error.message); return; }
    setPatientId(data!.id);
    setShowNewPatient(false);
    setNpFirst(''); setNpLast(''); setNpPhone('');
  }

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    if (!patientId) { alert('Debes seleccionar un paciente'); return; }
    setSaving(true);
    const starts_at = toUTC(date, start);
    const ends_at   = toUTC(date, end);
    const { error } = await supabase
      .from('appointments')
      .insert({ patient_id: patientId, starts_at, ends_at, reason, notes, status: 'scheduled' });
    setSaving(false);
    if (error) { alert(error.message); return; }
    router.push('/citas');
  }

  // Si NO hay patientId, mostramos el selector de pacientes (igual que en otras pantallas)
  if (!patientId) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <h1 className="page-title">Nueva cita</h1>
          <Link href="/citas" className="btn ml-auto">Volver</Link>
        </div>

        <div className="card p-4 space-y-3">
          <h2 className="text-lg font-semibold">Selecciona un paciente</h2>
          <div className="flex gap-2">
            <input
              className="input w-full"
              placeholder="Buscar por nombre o apellido"
              value={q}
              onChange={(e)=>searchPatients(e.target.value)}
            />
            <button type="button" className="btn" onClick={()=>setShowNewPatient(true)}>Nuevo paciente</button>
          </div>
          <div className="border rounded divide-y max-h-72 overflow-auto">
            {results.map(p => (
              <button
                type="button"
                key={p.id}
                className="w-full text-left px-3 py-2 hover:bg-neutral-50"
                onClick={()=>setPatientId(p.id)}
              >
                {p.last_name}, {p.first_name}
              </button>
            ))}
            {results.length === 0 && <div className="p-3 text-sm text-neutral-600">Escribe para buscar…</div>}
          </div>
        </div>

        {showNewPatient && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
            <div role="dialog" className="bg-white p-4 rounded w-[95%] max-w-md space-y-3">
              <div className="text-lg font-semibold">Nuevo paciente</div>
              <input className="input w-full" placeholder="Nombre(s)" value={npFirst} onChange={e=>setNpFirst(e.target.value)} />
              <input className="input w-full" placeholder="Apellidos" value={npLast} onChange={e=>setNpLast(e.target.value)} />
              <input className="input w-full" placeholder="Teléfono (opcional)" value={npPhone} onChange={e=>setNpPhone(e.target.value)} />
              <div className="flex gap-2 justify-end">
                <button type="button" className="px-3 py-2 rounded border" onClick={()=>setShowNewPatient(false)}>Cancelar</button>
                <button type="button" className="px-3 py-2 rounded bg-emerald-700 text-white" disabled={creating} onClick={createQuickPatient}>
                  {creating ? 'Creando…' : 'Crear'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Con patientId seleccionado: mostrar formulario de cita
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <h1 className="page-title">Nueva cita</h1>
        <Link href="/citas" className="btn ml-auto">Volver</Link>
      </div>

      <form onSubmit={onSave} className="card p-4 space-y-3">
        <div className="grid md:grid-cols-3 gap-3">
          <div>
            <label className="block text-sm mb-1">Fecha</label>
            <input type="date" className="input w-full" value={date} onChange={(e)=>setDate(e.target.value)} required />
          </div>
          <div>
            <label className="block text-sm mb-1">Hora inicio</label>
            <input type="time" className="input w-full" value={start} onChange={(e)=>setStart(e.target.value)} required />
          </div>
          <div>
            <label className="block text-sm mb-1">Hora fin</label>
            <input type="time" className="input w-full" value={end} onChange={(e)=>setEnd(e.target.value)} required />
          </div>
        </div>

        <div>
          <label className="block text-sm mb-1">Motivo</label>
          <input className="input w-full" value={reason} onChange={(e)=>setReason(e.target.value)} placeholder="Varios" />
        </div>
        <div>
          <label className="block text-sm mb-1">Notas</label>
          <textarea className="input w-full" rows={4} value={notes} onChange={(e)=>setNotes(e.target.value)} />
        </div>

        <div className="flex gap-2">
          <button className="btn" disabled={saving}>{saving ? 'Guardando…' : 'Guardar'}</button>
        </div>
      </form>
    </div>
  );
}

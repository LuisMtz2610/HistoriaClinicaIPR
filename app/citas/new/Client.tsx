'use client';

"use client";
import React from "react";
import useSWR from "swr";
import { useSearchParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

const fetchPatients = async () => {
  const { data, error } = await supabase
    .from("patients")
    .select("id, first_name, last_name")
    .order("last_name", { ascending: true });
  if (error) throw error;
  return data;
};

export default function NewAppointment(){
  const sp = useSearchParams();
  const router = useRouter();

  const q = useSWR("patients", fetchPatients);

  const [patientId, setPatientId] = React.useState<string | null>(sp.get("patient_id"));
  const [date, setDate] = React.useState<string>(()=> new Date().toISOString().slice(0,10));
  const [start, setStart] = React.useState<string>("10:00");
  const [end, setEnd] = React.useState<string>("10:30");
  const [reason, setReason] = React.useState<string>("");
  const [notes, setNotes] = React.useState<string>("");
  const [saving, setSaving] = React.useState(false);

  // quick new patient
  const [showNewPatient, setShowNewPatient] = React.useState(false);
  const [npFirst, setNpFirst] = React.useState("");
  const [npLast, setNpLast] = React.useState("");
  const [npPhone, setNpPhone] = React.useState("");
  const [creating, setCreating] = React.useState(false);

  async function createQuickPatient(e: React.FormEvent) {
    e.preventDefault();
    if (!npFirst.trim() || !npLast.trim()) {
      alert("Nombre y apellidos son obligatorios");
      return;
    }
    setCreating(true);
    const { data, error } = await supabase
      .from("patients")
      .insert({ first_name: npFirst.trim(), last_name: npLast.trim(), phone: npPhone.trim() || null })
      .select("id")
      .single();
    setCreating(false);
    if (error) return alert(error.message);
    setPatientId(data.id);
    setShowNewPatient(false);
  }

  async function onSave(e: React.FormEvent){
    e.preventDefault();
    if (saving) return;
    if (!patientId) { alert("Debes seleccionar un paciente"); return; }
    setSaving(true);
    const starts_at = `${date}T${start}:00`;
    const ends_at   = `${date}T${end}:00`;
    const { data, error } = await supabase.from("appointments")
      .insert({ patient_id: patientId, starts_at, ends_at, reason, notes, status: "scheduled" })
      .select("id").single();
    setSaving(false);
    if (error) { alert(error.message); return; }
    router.push(`/citas/${data.id}`);
  }

  return (
    <form className="space-y-4" onSubmit={onSave}>
      <h1 className="text-lg font-semibold">Nueva cita</h1>

      <div className="grid md:grid-cols-2 gap-3">
        {!patientId && (
          <div className="md:col-span-2">
            <label className="block text-sm mb-1">Paciente</label>
            {q.error && <div className="text-rose-700 text-sm">Error cargando pacientes</div>}
            {!q.data ? (
              <div className="text-sm text-neutral-600">Cargando pacientes…</div>
            ) : (
              <div className="flex gap-2">
                <select
                  className="border rounded p-2 grow"
                  value={patientId || ""}
                  onChange={(e)=> setPatientId(e.target.value || null)}
                >
                  <option value="">-- Selecciona --</option>
                  {q.data.map((p:any)=>(
                    <option key={p.id} value={p.id}>
                      {p.last_name}, {p.first_name}
                    </option>
                  ))}
                </select>
                <button type="button" className="px-3 py-2 rounded border" onClick={()=>setShowNewPatient(true)}>
                  Paciente nuevo
                </button>
              </div>
            )}
          </div>
        )}

        <div>
          <label className="block text-sm mb-1">Fecha</label>
          <input type="date" className="border rounded w-full p-2" value={date} onChange={e=>setDate(e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm mb-1">Hora inicio</label>
            <input type="time" className="border rounded w-full p-2" value={start} onChange={e=>setStart(e.target.value)} />
          </div>
          <div>
            <label className="block text-sm mb-1">Hora fin</label>
            <input type="time" className="border rounded w-full p-2" value={end} onChange={e=>setEnd(e.target.value)} />
          </div>
        </div>
      </div>

      <input className="border rounded w-full p-2" placeholder="Motivo" value={reason} onChange={e=>setReason(e.target.value)} />
      <textarea className="border rounded w-full p-2 h-24" placeholder="Notas" value={notes} onChange={e=>setNotes(e.target.value)} />

      <button className="px-4 py-2 rounded bg-emerald-700 text-white disabled:opacity-60" disabled={saving}>
        {saving ? "Guardando..." : "Guardar"}
      </button>

      {showNewPatient && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <form onSubmit={createQuickPatient} className="bg-white p-4 rounded w-[95%] max-w-md space-y-3">
            <div className="text-lg font-semibold">Nuevo paciente</div>
            <input className="border rounded w-full p-2" placeholder="Nombre(s)" value={npFirst} onChange={e=>setNpFirst(e.target.value)} />
            <input className="border rounded w-full p-2" placeholder="Apellidos" value={npLast} onChange={e=>setNpLast(e.target.value)} />
            <input className="border rounded w-full p-2" placeholder="Teléfono (opcional)" value={npPhone} onChange={e=>setNpPhone(e.target.value)} />
            <div className="flex gap-2 justify-end">
              <button type="button" className="px-3 py-2 rounded border" onClick={()=>setShowNewPatient(false)}>Cancelar</button>
              <button className="px-3 py-2 rounded bg-emerald-700 text-white" disabled={creating}>
                {creating ? "Creando..." : "Crear"}
              </button>
            </div>
          </form>
        </div>
      )}
    </form>
  );
}

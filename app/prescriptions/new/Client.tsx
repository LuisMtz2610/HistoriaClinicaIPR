'use client';

"use client";
import { useSearchParams, useRouter } from "next/navigation";
import { useState } from "react";
import { supabase } from "@/lib/supabase";

export default function NewPrescription() {
  const sp = useSearchParams();
  const router = useRouter();
  const patient_id = sp.get("patient_id") || "";
// Patient selection (if no patient_id in URL)
const [pid, setPid] = useState<string>(patient_id || "");
const [q, setQ] = useState("");
const [results, setResults] = useState<Array<{id:string,first_name:string,last_name:string}>>([]);
async function searchPatients(term: string) {
  setQ(term);
  if (!term.trim()) { setResults([]); return; }
  const { data } = await supabase
    .from('patients')
    .select('id, first_name, last_name')
    .or(`first_name.ilike.%${term}%,last_name.ilike.%${term}%`)
    .order('last_name',{ascending:true})
    .limit(15);
  setResults((data as any) || []);
}


  const [body, setBody] = useState("");
  const [indications, setIndications] = useState("");
  const [diagnosis, setDiagnosis] = useState("");

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    const { data, error } = await supabase
      .from("prescriptions")
      .insert({ patient_id: pid, body, indications, diagnosis })
      .select("id")
      .single();
    if (error) return alert(error.message);
    router.push(`/prescriptions/${data.id}/print`);
  }

  if (!pid) {
    return (
      <div className="space-y-3">
        <h1 className="text-lg font-semibold">Selecciona un paciente</h1>
        <input className="border rounded w-full p-2" placeholder="Buscar por nombre o apellido" value={q} onChange={e=>searchPatients(e.target.value)} />
        <div className="border rounded divide-y max-h-64 overflow-auto">
          {results.map(p=> (
            <button type="button" key={p.id} className="w-full text-left px-3 py-2 hover:bg-neutral-50" onClick={()=>setPid(p.id)}>
              {p.last_name}, {p.first_name}
            </button>
          ))}
        </div>
      </div>
    )
  }

  return (
    <form className="space-y-4" onSubmit={onSave}>
      <h1 className="text-lg font-semibold">Nueva Receta</h1>
      <textarea className="border rounded w-full p-2 h-40" placeholder="Medicamentos (uno por línea)" value={body} onChange={e=>setBody(e.target.value)} />
      <textarea className="border rounded w-full p-2 h-28" placeholder="Indicaciones" value={indications} onChange={e=>setIndications(e.target.value)} />
      <input className="border rounded w-full p-2" placeholder="Diagnóstico" value={diagnosis} onChange={e=>setDiagnosis(e.target.value)} />
      <button className="px-4 py-2 rounded bg-neutral-900 text-white">Guardar e imprimir</button>
    </form>
  );
}

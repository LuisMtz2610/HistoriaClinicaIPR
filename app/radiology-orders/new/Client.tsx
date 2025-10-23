'use client';

"use client";
import { useSearchParams, useRouter } from "next/navigation";
import { useState } from "react";
import { supabase } from "@/lib/supabase";

export default function NewRX() {
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

  const [notes, setNotes] = useState("");
  const [studies, setStudies] = useState<string[]>([]);

  function toggle(name: string) {
    setStudies(s => s.includes(name) ? s.filter(x=>x!==name) : [...s, name]);
  }

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    const { data, error } = await supabase.from("radiology_orders")
      .insert({ patient_id: pid, studies, notes }).select("id").single();
    if (error) return alert(error.message);
    router.push(`/radiology-orders/${data.id}/print`);
  }

  const opts = ["Dentoalveolar", "Aleta mordible", "Serie radiográfica", "Oclusal",
    "Ortopantomografía (adulto)", "Ortopantomografía (infantil)",
    "Lateral de cráneo", "Cefalometría lateral", "Watters", "Cadwell", "AP de cráneo", "Metacarpal", "Otros"];

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
      <h1 className="text-lg font-semibold">Solicitud de estudio radiográfico</h1>
      <div className="grid md:grid-cols-2 gap-3">
        {opts.map(o=>(
          <label key={o} className="flex items-center gap-2">
            <input type="checkbox" checked={studies.includes(o)} onChange={()=>toggle(o)} />
            <span>{o}</span>
          </label>
        ))}
      </div>
      <textarea className="border rounded w-full p-2 h-28" placeholder="Notas/otros" value={notes} onChange={e=>setNotes(e.target.value)} />
      <button className="px-4 py-2 rounded bg-neutral-900 text-white">Guardar e imprimir</button>
    </form>
  );
}

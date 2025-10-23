'use client';

"use client";
import { useSearchParams, useRouter } from "next/navigation";
import { useState } from "react";
import { supabase } from "@/lib/supabase";

const DEFAULT_TESTS = [
  "Biometría hemática","Química sanguínea","Examen general de orina",
  "Grupo sanguíneo ABO y Rh","RPR (VDRL)","TP y TTP",
  "Ac. anti-VIH (ELISA)","Ac. anti-VIH (Western blot)",
  "Prueba inmunológica de embarazo","Perfil de hepatitis A","Perfil de hepatitis B","Perfil de hepatitis C","Perfil de hepatitis D"
];

export default function NewLab() {
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

  const [tests, setTests] = useState<string[]>([]);
  const [presumptive_dx, setDx] = useState("");

  function toggle(t: string) {
    setTests(s => s.includes(t) ? s.filter(x=>x!==t) : [...s, t]);
  }

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    const { data, error } = await supabase.from("lab_orders")
      .insert({ patient_id: pid, tests, presumptive_dx: presumptive_dx || null })
      .select("id").single();
    if (error) return alert(error.message);
    router.push(`/lab-orders/${data.id}/print`);
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
      <h1 className="text-lg font-semibold">Solicitud de examen de laboratorio</h1>
      <div className="grid md:grid-cols-2 gap-3">
        {DEFAULT_TESTS.map(o=>(
          <label key={o} className="flex items-center gap-2">
            <input type="checkbox" checked={tests.includes(o)} onChange={()=>toggle(o)} />
            <span>{o}</span>
          </label>
        ))}
      </div>
      <input className="border rounded w-full p-2" placeholder="Diagnóstico de presunción" value={presumptive_dx} onChange={e=>setDx(e.target.value)} />
      <button className="px-4 py-2 rounded bg-neutral-900 text-white">Guardar e imprimir</button>
    </form>
  );
}

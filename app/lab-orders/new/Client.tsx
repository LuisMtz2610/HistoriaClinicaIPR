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
  const [tests, setTests] = useState<string[]>([]);
  const [presumptive_dx, setDx] = useState("");

  function toggle(t: string) {
    setTests(s => s.includes(t) ? s.filter(x=>x!==t) : [...s, t]);
  }

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    const { data, error } = await supabase.from("lab_orders")
      .insert({ patient_id, tests, presumptive_dx: presumptive_dx || null })
      .select("id").single();
    if (error) return alert(error.message);
    router.push(`/lab-orders/${data.id}/print`);
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

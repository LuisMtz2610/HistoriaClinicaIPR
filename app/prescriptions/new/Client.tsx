'use client';

"use client";
import { useSearchParams, useRouter } from "next/navigation";
import { useState } from "react";
import { supabase } from "@/lib/supabase";

export default function NewPrescription() {
  const sp = useSearchParams();
  const router = useRouter();
  const patient_id = sp.get("patient_id") || "";

  const [body, setBody] = useState("");
  const [indications, setIndications] = useState("");
  const [diagnosis, setDiagnosis] = useState("");

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    const { data, error } = await supabase
      .from("prescriptions")
      .insert({ patient_id, body, indications, diagnosis })
      .select("id")
      .single();
    if (error) return alert(error.message);
    router.push(`/prescriptions/${data.id}/print`);
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

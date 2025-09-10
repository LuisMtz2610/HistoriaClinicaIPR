'use client';

"use client";
import { useSearchParams, useRouter } from "next/navigation";
import { useState } from "react";
import { supabase } from "@/lib/supabase";

export default function NewConsent() {
  const sp = useSearchParams();
  const router = useRouter();
  const patient_id = sp.get("patient_id") || "";
  const [diagnosis, setDiagnosis] = useState("");
  const [treatments, setTreatments] = useState("");
  const [risks, setRisks] = useState("");
  const [benefits, setBenefits] = useState("");
  const [alternatives, setAlternatives] = useState("");
  const [saving, setSaving] = useState(false);

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    if (saving) return;
    setSaving(true);

    const dataJson = { diagnosis, treatments, risks, benefits, alternatives };

    const { data, error } = await supabase
      .from("consents")
      .insert({
        patient_id,
        form_type: "consentimiento_f12", // <- Enum clinical_form_type requerido por la DB
        signed_at: new Date().toISOString(),
        data: dataJson,
      })
      .select("id")
      .single();

    setSaving(false);

    if (error) {
      alert(error.message);
      return;
    }

    router.push(`/consents/${data.id}/print`);
  }

  return (
    <form className="space-y-4" onSubmit={onSave}>
      <h1 className="text-lg font-semibold">Consentimiento informado</h1>
      <input
        className="border rounded w-full p-2"
        placeholder="Diagnóstico(s)"
        value={diagnosis}
        onChange={(e) => setDiagnosis(e.target.value)}
      />
      <textarea
        className="border rounded w-full p-2 h-24"
        placeholder="Tratamiento(s) por realizar"
        value={treatments}
        onChange={(e) => setTreatments(e.target.value)}
      />
      <textarea
        className="border rounded w-full p-2 h-24"
        placeholder="Riesgos y complicaciones"
        value={risks}
        onChange={(e) => setRisks(e.target.value)}
      />
      <textarea
        className="border rounded w-full p-2 h-24"
        placeholder="Beneficio esperado"
        value={benefits}
        onChange={(e) => setBenefits(e.target.value)}
      />
      <textarea
        className="border rounded w-full p-2 h-24"
        placeholder="Tratamientos alternativos"
        value={alternatives}
        onChange={(e) => setAlternatives(e.target.value)}
      />

      <button
        type="submit"
        className="px-4 py-2 rounded bg-neutral-900 text-white disabled:opacity-60"
        disabled={saving}
      >
        {saving ? "Guardando..." : "Guardar e imprimir"}
      </button>
    </form>
  );
}

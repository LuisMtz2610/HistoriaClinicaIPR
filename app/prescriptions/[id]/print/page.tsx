"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import PrintFrame from "@/app/(clinic)/_components/PrintFrame";
import PrintHeader from "@/app/(clinic)/_components/PrintHeader";
import PrintFooter from "@/app/(clinic)/_components/PrintFooter";

export default function PrintPrescription() {
  const { id } = useParams<{ id: string }>();
  const [p, setP] = useState<any>(null);
  const [patient, setPatient] = useState<any>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("prescriptions")
        .select("*")
        .eq("id", id).maybeSingle();
      setP(data);
      if (data?.patient_id) {
        const { data: pat } = await supabase.from("patients").select("first_name,last_name").eq("id", data.patient_id).maybeSingle();
        setPatient(pat);
      }
      setTimeout(() => window.print(), 300);
    })();
  }, [id]);

  if (!p) return <div>Cargando…</div>;

  return (
    <PrintFrame>
      <PrintHeader title="Receta médica odontológica" />
      <div className="mb-3 text-[13px]">
        <div><b>Paciente:</b> {patient ? `${patient.last_name}, ${patient.first_name}` : "—"}</div>
        <div><b>Fecha:</b> {new Date(p.created_at).toLocaleDateString()}</div>
      </div>

      <div className="text-[14px] leading-6">
        {p.body?.split("\n").map((l:string, i:number)=>(
          <div key={i}>• {l}</div>
        ))}
      </div>

      {p.indications && (
        <>
          <div className="mt-3 font-semibold">Indicaciones</div>
          <div className="whitespace-pre-wrap">{p.indications}</div>
        </>
      )}

      {p.diagnosis && (
        <>
          <div className="mt-3 font-semibold">Diagnóstico</div>
          <div>{p.diagnosis}</div>
        </>
      )}

      <div className="mt-12">
        <div className="border-t w-64"></div>
        <div className="text-[12px] mt-1">Firma del C.D.</div>
      </div>

      <PrintFooter />
    </PrintFrame>
  );
}

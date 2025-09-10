"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import PrintFrame from "@/app/(clinic)/_components/PrintFrame";
import PrintHeader from "@/app/(clinic)/_components/PrintHeader";
import PrintFooter from "@/app/(clinic)/_components/PrintFooter";

export default function PrintRX() {
  const { id } = useParams<{ id: string }>();
  const [row, setRow] = useState<any>(null);
  const [patient, setPatient] = useState<any>(null);

  useEffect(()=>{(async()=>{
    const { data } = await supabase.from("radiology_orders").select("*").eq("id", id).maybeSingle();
    setRow(data);
    if (data?.patient_id) {
      const { data: pat } = await supabase.from("patients").select("first_name,last_name").eq("id", data.patient_id).maybeSingle();
      setPatient(pat);
    }
    setTimeout(()=>window.print(), 300);
  })()},[id]);

  if (!row) return <div>Cargando…</div>;

  return (
    <PrintFrame>
      <PrintHeader title="Solicitud de estudio radiográfico" />
      <div className="mb-3 text-[13px]">
        <div><b>Paciente:</b> {patient ? `${patient.last_name}, ${patient.first_name}` : "—"}</div>
        <div><b>Fecha:</b> {new Date(row.created_at).toLocaleDateString()}</div>
      </div>

      <div className="grid md:grid-cols-2 gap-x-8 gap-y-2 text-[13px]">
        {row.studies?.map((s:string, i:number)=> <div key={i}>☑ {s}</div>)}
      </div>

      {row.notes && (
        <>
          <div className="mt-4 font-semibold">Notas</div>
          <div className="whitespace-pre-wrap">{row.notes}</div>
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

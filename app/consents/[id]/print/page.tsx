"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import PrintFrame from "@/app/(clinic)/_components/PrintFrame";
import PrintHeader from "@/app/(clinic)/_components/PrintHeader";
import PrintFooter from "@/app/(clinic)/_components/PrintFooter";

export default function PrintConsent() {
  const { id } = useParams<{ id: string }>();
  const [row, setRow] = useState<any>(null);
  const [patient, setPatient] = useState<any>(null);

  useEffect(()=>{(async()=>{
    const { data } = await supabase.from("consents").select("*").eq("id", id).maybeSingle();
    setRow(data);
    if (data?.patient_id) {
      const { data: pat } = await supabase.from("patients").select("first_name,last_name").eq("id", data.patient_id).maybeSingle();
      setPatient(pat);
    }
    setTimeout(()=>window.print(), 300);
  })()},[id]);

  if (!row) return <div>Cargando…</div>;
  const d = row.data || {};
  const fecha = row.signed_at || row.created_at || new Date().toISOString();

  return (
    <PrintFrame>
      <PrintHeader title="Consentimiento informado" />
      <div className="mb-3 text-[13px]">
        <div><b>Paciente:</b> {patient ? `${patient.last_name}, ${patient.first_name}` : "—"}</div>
        <div><b>Fecha:</b> {new Date(fecha).toLocaleDateString()}</div>
      </div>

      <div className="space-y-3 text-[13px]">
        <div><b>Diagnóstico(s):</b><br />{d.diagnosis || "—"}</div>
        <div><b>Tratamiento(s) por realizar:</b><br />{d.treatments || "—"}</div>
        <div><b>Tratamientos alternativos:</b><br />{d.alternatives || "—"}</div>
        <div><b>Riesgos y complicaciones:</b><br />{d.risks || "—"}</div>
        <div><b>Beneficio esperado:</b><br />{d.benefits || "—"}</div>
      </div>

      <div className="grid grid-cols-3 gap-6 mt-10">
        <div><div className="border-t w-full"></div><div className="text-[12px] mt-1">Paciente / Representante</div></div>
        <div><div className="border-t w-full"></div><div className="text-[12px] mt-1">Testigo 1</div></div>
        <div><div className="border-t w-full"></div><div className="text-[12px] mt-1">Testigo 2</div></div>
      </div>

      <div className="mt-6">
        <div className="border-t w-64"></div>
        <div className="text-[12px] mt-1">Firma del C.D.</div>
      </div>

      <PrintFooter />
    </PrintFrame>
  );
}

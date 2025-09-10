"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import PrintFrame from "@/app/(clinic)/_components/PrintFrame";
import PrintHeader from "@/app/(clinic)/_components/PrintHeader";
import PrintFooter from "@/app/(clinic)/_components/PrintFooter";

async function waitForAssets() {
  try { if (document.fonts && (document.fonts as any).ready) await (document.fonts as any).ready; } catch {}
  const imgs = Array.from(document.images || []);
  await Promise.all(imgs.map(img => img.complete ? Promise.resolve(null) : new Promise(res=>{img.onload=()=>res(null); img.onerror=()=>res(null);})));
}

export default function PrintAppointment(){
  const { id } = useParams<{id:string}>();
  const [row, setRow] = useState<any>(null);
  const [patient, setPatient] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(()=>{(async()=>{
    try{
      const { data, error } = await supabase.from("appointments")
        .select("*, patient:patient_id(first_name,last_name)")
        .eq("id", id).single();
      if (error) throw error;
      setRow(data);
      setPatient(data?.patient);
      await waitForAssets();
      setTimeout(()=>window.print(), 150);
    }catch(e:any){ setError(e?.message || String(e)); }
  })()},[id]);

  if (error) return <div>Error: {error}</div>;
  if (!row) return <div>Cargando…</div>;

  const ini = new Date(row.starts_at);
  const fin = new Date(row.ends_at);

  return (
    <PrintFrame>
      <PrintHeader title="Comprobante de cita" />
      <div className="mb-3 text-[13px]">
        <div><b>Paciente:</b> {patient ? `${patient.last_name}, ${patient.first_name}` : "—"}</div>
        <div><b>Fecha:</b> {ini.toLocaleDateString()}</div>
        <div><b>Hora:</b> {ini.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})} – {fin.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</div>
      </div>
      {row.reason && <div className="text-[13px]"><b>Motivo:</b> {row.reason}</div>}
      {row.notes && <div className="text-[13px] whitespace-pre-wrap mt-2">{row.notes}</div>}

      <div className="mt-10">
        <div className="border-t w-64"></div>
        <div className="text-[12px] mt-1">Firma de conformidad</div>
      </div>

      <PrintFooter />
    </PrintFrame>
  );
}

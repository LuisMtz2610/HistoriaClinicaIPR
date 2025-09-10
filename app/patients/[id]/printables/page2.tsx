"use client";
import { useParams } from "next/navigation";
import useSWR from "swr";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

async function fetchAll(pid:string){
  const tables = ["prescriptions","radiology_orders","lab_orders","consents"];
  const results:any[] = [];
  for(const t of tables){
    const { data } = await supabase.from(t).select("id, created_at").eq("patient_id",pid);
    if(data) data.forEach(r=>results.push({...r, table:t}));
  }
  return results.sort((a,b)=> new Date(b.created_at).getTime()- new Date(a.created_at).getTime());
}

export default function PatientPrintables(){
  const { id } = useParams<{id:string}>();
  const q = useSWR(["printables",id], ()=>fetchAll(id));
  if(q.error) return <div>Error: {String(q.error.message)}</div>;
  if(!q.data) return <div>Cargando…</div>;
  return (
    <div className="space-y-4">
      <h1 className="text-lg font-semibold">Historial de imprimibles</h1>
      <table className="w-full border text-sm">
        <thead><tr className="bg-neutral-100">
          <th className="border px-2 py-1">Tipo</th>
          <th className="border px-2 py-1">Folio</th>
          <th className="border px-2 py-1">Fecha</th>
          <th className="border px-2 py-1">Acciones</th>
        </tr></thead>
        <tbody>
          {q.data.map((r:any)=>(
            <tr key={r.table+"-"+r.id}>
              <td className="border px-2 py-1">{r.table}</td>
              <td className="border px-2 py-1">{r.id.slice(0,8)}</td>
              <td className="border px-2 py-1">{new Date(r.created_at).toLocaleDateString()}</td>
              <td className="border px-2 py-1 text-center">
                <Link href={`/${r.table}/${r.id}/print`} className="text-emerald-600 hover:underline">Imprimir</Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

"use client";
import useSWR from "swr";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

const fetchRows = async () => {
  const { data, error } = await supabase
    .from("consents")
    .select("id, signed_at, patient_id, patients(first_name,last_name)")
    .order("signed_at", { ascending: false });
  if (error) throw error;
  return data;
};

export default function ConsentimientosList() {
  const q = useSWR("consents", fetchRows);
  if (q.error) return <div>Error: {String((q.error as any).message || q.error)}</div>;
  if (!q.data) return <div>Cargando…</div>;
  return (
    <div className="space-y-4">
      <h1 className="text-lg font-semibold">Consentimientos</h1>
      <table className="w-full border text-sm">
        <thead><tr className="bg-neutral-100">
          <th className="border px-2 py-1 text-left">Folio</th>
          <th className="border px-2 py-1 text-left">Paciente</th>
          <th className="border px-2 py-1">Fecha</th>
          <th className="border px-2 py-1">Acciones</th>
        </tr></thead>
        <tbody>
          {q.data.map((r:any)=>(
            <tr key={r.id}>
              <td className="border px-2 py-1">{r.id.slice(0,8)}</td>
              <td className="border px-2 py-1">{r.patients? r.patients.last_name+", "+r.patients.first_name:"—"}</td>
              <td className="border px-2 py-1">{r.signed_at ? new Date(r.signed_at).toLocaleDateString() : "—"}</td>
              <td className="border px-2 py-1 text-center">
                <Link href={`/consents/${r.id}/print`} className="text-emerald-600 hover:underline">Imprimir</Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

import Link from "next/link";
import PrintHeader from "../../../_components/PrintHeader";
import PrintFrame from "../../../_components/PrintFrame";

export default async function Page({ params }: { params: { id: string } }) {
  const pid = params.id;
  const { createClient } = await import("@supabase/supabase-js");
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

  const [presc, rx, lab, cons] = await Promise.all([
    supabase.from("prescriptions").select("id, created_at, folio").eq("patient_id", pid).order("created_at", { ascending: false }),
    supabase.from("radiology_orders").select("id, created_at, folio").eq("patient_id", pid).order("created_at", { ascending: false }),
    supabase.from("lab_orders").select("id, created_at, folio").eq("patient_id", pid).order("created_at", { ascending: false }),
    supabase.from("consent_prints").select("id, created_at, folio").eq("patient_id", pid).order("created_at", { ascending: false }),
  ]);

  return (
    <div className="p-6 space-y-8">
      <section>
        <h2 className="text-lg font-semibold mb-2">Recetas</h2>
        <table className="w-full text-sm">
          <thead><tr><th className="text-left p-2">Folio</th><th className="text-left p-2">Fecha</th><th className="text-left p-2">Acciones</th></tr></thead>
          <tbody>
            {(presc.data || []).map((r:any) => (
              <tr key={r.id} className="border-t">
                <td className="p-2">{r.folio || "—"}</td>
                <td className="p-2">{new Date(r.created_at).toLocaleString()}</td>
                <td className="p-2"><Link className="underline" href={`/prescriptions/${r.id}/print`} target="_blank">Imprimir</Link></td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-2">Solicitudes RX</h2>
        <table className="w-full text-sm">
          <thead><tr><th className="text-left p-2">Folio</th><th className="text-left p-2">Fecha</th><th className="text-left p-2">Acciones</th></tr></thead>
          <tbody>
            {(rx.data || []).map((r:any) => (
              <tr key={r.id} className="border-t">
                <td className="p-2">{r.folio || "—"}</td>
                <td className="p-2">{new Date(r.created_at).toLocaleString()}</td>
                <td className="p-2"><Link className="underline" href={`/radiology-orders/${r.id}/print`} target="_blank">Imprimir</Link></td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-2">Solicitudes de Laboratorio</h2>
        <table className="w-full text-sm">
          <thead><tr><th className="text-left p-2">Folio</th><th className="text-left p-2">Fecha</th><th className="text-left p-2">Acciones</th></tr></thead>
          <tbody>
            {(lab.data || []).map((r:any) => (
              <tr key={r.id} className="border-t">
                <td className="p-2">{r.folio || "—"}</td>
                <td className="p-2">{new Date(r.created_at).toLocaleString()}</td>
                <td className="p-2"><Link className="underline" href={`/lab-orders/${r.id}/print`} target="_blank">Imprimir</Link></td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-2">Consentimientos</h2>
        <table className="w-full text-sm">
          <thead><tr><th className="text-left p-2">Folio</th><th className="text-left p-2">Fecha</th><th className="text-left p-2">Acciones</th></tr></thead>
          <tbody>
            {(cons.data || []).map((r:any) => (
              <tr key={r.id} className="border-t">
                <td className="p-2">{r.folio || "—"}</td>
                <td className="p-2">{new Date(r.created_at).toLocaleString()}</td>
                <td className="p-2"><Link className="underline" href={`/consents/${r.id}/print`} target="_blank">Imprimir</Link></td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}

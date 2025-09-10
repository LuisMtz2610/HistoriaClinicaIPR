import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'
import ConsentSignatureSection from '@/components/kit/ConsentSignatureSectionKit'
import { saveConsentSignaturePathKit } from './actions'

export const dynamic = 'force-dynamic';

async function getData(id: string) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const sb = createClient(url, key);
  const { data, error } = await sb
    .from('consents')
    .select('id, title, body, patient_id, patients(name)')
    .eq('id', id)
    .single();
  if (error) throw new Error(error.message);
  return data as any;
}

export default async function Page({ params }: { params: { id: string } }) {
  const c = await getData(params.id);
  return (
    <main className="container mx-auto px-4 py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Consentimiento</h1>
          <p className="text-sm text-gray-600">Paciente: {c.patients?.name || c.patient_id}</p>
        </div>
        <div className="flex gap-2">
          <Link href={`/consents/${c.id}/print`} className="px-3 py-2 rounded-xl bg-gray-800 text-white">Imprimir</Link>
        </div>
      </div>

      <section className="bg-white rounded-2xl shadow p-5">
        <h2 className="text-lg font-semibold mb-2">{c.title || 'Documento de consentimiento'}</h2>
        <article className="prose max-w-none whitespace-pre-wrap">{c.body}</article>
      </section>

      <section className="bg-white rounded-2xl shadow p-5">
        <h3 className="text-base font-semibold mb-2">Firma del paciente</h3>
        {/* Al guardar, intentamos escribir la ruta en consents.signature_path (si existe) */}
        <ConsentSignatureSection
          patientId={c.patient_id}
          consentId={c.id}
          onSaved={async (path) => { 'use server'; await saveConsentSignaturePathKit(c.id, path); }}
        />
        <p className="text-xs text-gray-500 mt-2">La firma se guarda como PNG en el storage y, si existe la columna <code>signature_path</code>, se registra en la tabla.</p>
      </section>
    </main>
  );
}

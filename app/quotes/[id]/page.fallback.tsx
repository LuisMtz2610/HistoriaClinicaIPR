import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'
import ShareWhatsAppButtonKit from '@/components/kit/ShareWhatsAppButtonKit'
import SignaturePadKit from '@/components/kit/SignaturePadKit'

export const dynamic = 'force-dynamic';

async function getData(id: string) {
  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
  const { data, error } = await sb
    .from('quotes')
    .select('id, folio, total, patient_id, patients(name)')
    .eq('id', id)
    .single()
  if (error) throw new Error(error.message)
  return data as any
}

export default async function Page({ params }: { params: { id: string } }) {
  const q = await getData(params.id)
  return (
    <main className="container mx-auto px-4 py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Presupuesto {q.folio || q.id}</h1>
          <p className="text-sm text-gray-600">Paciente: {q.patients?.name || q.patient_id}</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/quotes/${q.id}/print`} className="px-3 py-2 rounded-xl bg-gray-800 text-white">Imprimir</Link>
          <ShareWhatsAppButtonKit quoteId={q.id} />
        </div>
      </div>

      {/* ...acá iría tu contenido/calculo del detalle... */}

      <section className="bg-white rounded-2xl shadow p-5">
        <h3 className="text-base font-semibold mb-2">Firma del paciente</h3>
        <SignaturePadKit patientId={q.patient_id} consentId={`quote-${q.id}`} />
      </section>
    </main>
  )
}

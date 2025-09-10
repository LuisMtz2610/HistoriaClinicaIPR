'use client'
import * as React from 'react'
import { useParams } from 'next/navigation'
import useSWR from 'swr'
import { supabase } from '@/lib/supabase'
import ClinicLetterhead from '@/components/ClinicLetterhead'

const fetchPrescription = async (id:string) => {
  const { data, error } = await supabase
    .from('prescriptions')
    .select('*, patients(*)')
    .eq('id', id).single()
  if (error) throw error
  return data
}

export default function PrintRecetaPage() {
  const { id } = useParams<{id:string}>()
  const q = useSWR(['rx', id], () => fetchPrescription(id))
  React.useEffect(()=>{ const t=setTimeout(()=>window.print(), 500); return ()=>clearTimeout(t) }, [])
  if (q.isLoading) return <div className="p-6">Cargando…</div>
  if (q.error) return <div className="p-6 text-red-600">Error</div>
  const rx = q.data
  const p = rx.patients

  return (
    <main className="p-6 print:p-8">
      <ClinicLetterhead/>
      <h1 className="text-xl font-semibold mb-2">Receta médica odontológica</h1>

      <div className="text-sm text-gray-700 mb-4">
        Paciente: <b>{p.last_name}, {p.first_name}</b> · Fecha: {new Date(rx.created_at).toLocaleString()}
      </div>

      <section className="mb-3 whitespace-pre-wrap">{rx.body}</section>
      {rx.indications && (
        <section className="mb-3">
          <div className="font-medium">Indicaciones</div>
          <div className="whitespace-pre-wrap">{rx.indications}</div>
        </section>
      )}
      {rx.diagnosis && (
        <section className="mb-3">
          <div className="font-medium">Diagnóstico</div>
          <div className="whitespace-pre-wrap">{rx.diagnosis}</div>
        </section>
      )}

      <div className="mt-12">
        _______________________________________<br/>
        Firma y sello
      </div>

      <style jsx global>{`
        @media print {
          .btn, a[href] { display: none !important; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
      `}</style>
    </main>
  )
}

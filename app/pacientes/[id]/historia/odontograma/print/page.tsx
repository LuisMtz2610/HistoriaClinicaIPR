'use client'
import * as React from 'react'
import { useParams } from 'next/navigation'
import useSWR from 'swr'
import { supabase } from '@/lib/supabase'
import { CODE_OPTIONS } from '@/components/OdontogramaDxSelects'

const rowTop  = ['18','17','16','15','14','13','12','11','21','22','23','24','25','26','27','28']
const rowBottom = ['48','47','46','45','44','43','42','41','31','32','33','34','35','36','37','38']
const ALL_TEETH = [...rowTop, ...rowBottom]

const fetchPatient = async (id: string) => {
  const { data, error } = await supabase.from('patients').select('*').eq('id', id).single()
  if (error) throw error
  return data
}
const fetchLastOdo = async (patientId: string) => {
  const { data, error } = await supabase
    .from('odontograms')
    .select('state, created_at')
    .eq('patient_id', patientId)
    .order('created_at', { ascending: false })
    .limit(1)
  if (error) throw error
  return (data && data[0]) || null
}

export default function PrintOdontogramaPage(){
  // Espera a que la lámina cargue y luego imprime
  const printWhenReady = (imgId: string) => {
    const el = document.getElementById(imgId) as HTMLImageElement | null;
    const go = () => { window.print(); setTimeout(() => window.close?.(), 300); };
    if (!el) { setTimeout(go, 500); return; }
    if (el.complete) go();
    else el.onload = go;
  };

  const id = String(useParams().id)
  const p = useSWR(['patient', id], () => fetchPatient(id))
  const odo = useSWR(['odo', id], () => fetchLastOdo(id))

  React.useEffect(()=>{ const t=setTimeout(()=>printWhenReady('odo-base-img'), 300); return ()=>clearTimeout(t) }, [])

  if (p.isLoading || odo.isLoading) return <div className="p-6">Preparando impresión…</div>
  if (p.error) return <div className="p-6 text-red-600">Error cargando paciente</div>
  const patient = p.data
  const snapshot = (odo.data?.state as Record<string,string>) || {}
  const takenAt = odo.data?.created_at ? new Date(odo.data.created_at).toLocaleString() : '—'
  const labelFor = (code: string) => CODE_OPTIONS.find(c=>c.value===code)?.label ?? code ?? '9'

  return (
    <div className="p-6 print:p-0">
      
      {/* Lámina base del odontograma (se imprime). Usar <img>, no next/image */}
      <img
        id="odo-base-img"
        src="/odontograma/diagnostico-base.png"
        alt="Odontograma diagnóstico"
        className="w-full max-w-full h-auto border rounded mb-4"
      />

      <div className="mb-4">
        <div className="text-xl font-semibold">Odontograma diagnóstico</div>
        <div className="text-sm text-gray-700">Paciente: {patient.last_name}, {patient.first_name}</div>
        <div className="text-sm text-gray-700">Fecha de registro: {takenAt}</div>
      </div>

      {/* Listado por FDI del último snapshot */}
      <div className="grid gap-4">
        <div>
          <div className="font-medium mb-1">Arcada superior</div>
          <div className="grid" style={{ display:'grid', gridTemplateColumns:'repeat(16, minmax(70px,1fr))', gap:'8px' }}>
            {rowTop.map(t => (
              <div key={t} className="text-xs">
                <div className="font-semibold text-center mb-1">{t}</div>
                <div className="rounded-lg border p-2 text-center">
                  {labelFor(snapshot[t] ?? '9')}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <div className="font-medium mb-1 mt-2">Arcada inferior</div>
          <div className="grid" style={{ display:'grid', gridTemplateColumns:'repeat(16, minmax(70px,1fr))', gap:'8px' }}>
            {rowBottom.map(t => (
              <div key={t} className="text-xs">
                <div className="font-semibold text-center mb-1">{t}</div>
                <div className="rounded-lg border p-2 text-center">
                  {labelFor(snapshot[t] ?? '9')}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Leyenda completa */}
      <div className="mt-6">
        <div className="font-semibold mb-2">Leyenda</div>
        <div className="grid md:grid-cols-2 gap-x-6 gap-y-1 text-sm">
          {CODE_OPTIONS.map(opt => (
            <div key={opt.value} className="text-gray-800">{opt.label}</div>
          ))}
        </div>
      </div>

      {/* Bloque de observaciones vacío (o para escribir a mano) */}
      <div className="mt-6">
        <div className="font-semibold mb-2">Observaciones</div>
        <div className="border rounded-xl" style={{ minHeight: 140 }} />
      </div>

      <style jsx global>{`
        @media print {
          @page { size: A4 portrait; margin: 14mm; }
          .btn, a[href] { display: none !important; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
      `}</style>
    </div>
  )
}

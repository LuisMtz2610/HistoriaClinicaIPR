'use client'
import * as React from 'react'
import { supabase } from '@/lib/supabase'

/** Orden FDI por filas como en la lámina */
const rowTop = ['18','17','16','15','14','13','12','11','21','22','23','24','25','26','27','28']
const rowBottom = ['48','47','46','45','44','43','42','41','31','32','33','34','35','36','37','38']

/** Códigos del odontograma (resumen) */
const CODES: { value:number, label:string }[] = [
  { value: 0,  label: 'Sano' },
  { value: 1,  label: 'Con caries' },
  { value: 2,  label: 'Obturado con caries' },
  { value: 3,  label: 'Obturado sin caries' },
  { value: 4,  label: 'Perdido por caries' },
  { value: 5,  label: 'Perdido otra causa' },
  { value: 6,  label: 'Fisura obturada' },
  { value: 7,  label: 'Soporte/corona/implante' },
  { value: 8,  label: 'Sin erupcionar' },
  { value: 9,  label: 'No registrado' },
  { value: 11, label: 'Recesión gingival' },
  { value: 12, label: 'Tratamiento de conductos' },
  { value: 13, label: 'Instrumento separado' },
  { value: 14, label: 'Bolsas periodontales' },
  { value: 15, label: 'Fluorosis' },
  { value: 16, label: 'Alteraciones morfológicas' },
  { value: 17, label: 'Lesión endoperiodontal' },
]

/** Icono SVG minimalista por código (visible en web e impresión) */
const Icon = ({ code }: { code:number }) => {
  const common = { width: 18, height: 18 }
  switch (code) {
    case 0:  return <svg {...common}><circle cx="9" cy="9" r="7" fill="none" stroke="green" strokeWidth="2"/></svg>
    case 1:  return <svg {...common}><circle cx="9" cy="9" r="7" fill="black"/></svg>
    case 2:  return <svg {...common}><circle cx="9" cy="9" r="7" fill="black"/><rect x="4" y="4" width="10" height="10" fill="white"/></svg>
    case 3:  return <svg {...common}><rect x="4" y="4" width="10" height="10" fill="black"/></svg>
    case 4:  return <svg {...common}><line x1="3" y1="3" x2="15" y2="15" stroke="black" strokeWidth="2"/><line x1="15" y1="3" x2="3" y2="15" stroke="black" strokeWidth="2"/></svg>
    case 5:  return <svg {...common}><line x1="3" y1="9" x2="15" y2="9" stroke="black" strokeWidth="2"/></svg>
    case 6:  return <svg {...common}><path d="M3,9 L15,9 M9,3 L9,15" stroke="black" strokeWidth="2"/></svg>
    case 7:  return <svg {...common}><circle cx="9" cy="5" r="4" fill="none" stroke="purple" strokeWidth="2"/><rect x="7" y="9" width="4" height="6" fill="purple"/></svg>
    case 8:  return <svg {...common}><circle cx="9" cy="9" r="7" fill="none" stroke="#555" strokeDasharray="2 2"/></svg>
    case 9:  return <svg {...common}><circle cx="9" cy="9" r="2" fill="#bbb"/></svg>
    case 11: return <svg {...common}><path d="M3,13 C7,7 11,7 15,13" stroke="black" strokeWidth="2" fill="none"/></svg>
    case 12: return <svg {...common}><path d="M9,3 L9,15" stroke="orange" strokeWidth="3"/></svg>
    case 13: return <svg {...common}><path d="M6,12 L12,6" stroke="black" strokeWidth="2"/><circle cx="6" cy="12" r="2" fill="black"/></svg>
    case 14: return <svg {...common}><path d="M4,12 L14,12" stroke="black" strokeWidth="2"/><path d="M6,12 L6,7 M9,12 L9,7 M12,12 L12,7" stroke="black" strokeWidth="1"/></svg>
    case 15: return <svg {...common}><path d="M9,1 L11,6 L17,6 L12.5,9.5 L14,16 L9,12.5 L4,16 L5.5,9.5 L1,6 L7,6 Z" fill="none" stroke="black" strokeWidth="1"/></svg>
    case 16: return <svg {...common}><path d="M3,9 Q9,3 15,9 Q9,15 3,9 Z" fill="none" stroke="black" strokeWidth="2"/></svg>
    case 17: return <svg {...common}><path d="M9,3 L9,15" stroke="orange" strokeWidth="3"/><path d="M4,12 L14,12" stroke="black" strokeWidth="2"/></svg>
    default: return <svg {...common}><circle cx="9" cy="9" r="2" fill="#bbb"/></svg>
  }
}

/** Posicionamiento relativo de los 32 dientes (en %), sobre la imagen base */
function useToothPositions() {
  const count = 16
  const step = 100 / (count + 1)
  const paddingX = 0 // puedes poner 2 si lo quieres más adentro
  const xsTop    = Array.from({length:count}, (_,i)=> paddingX + (i+1)*step)
  const xsBottom = xsTop
  const Y_TOP = 28   // % aprox. donde cae la hilera superior
  const Y_BOTTOM = 76 // % aprox. donde cae la hilera inferior
  const pos: Record<string,{x:number,y:number}> = {}
  rowTop.forEach((t, i)    => pos[t] = { x: xsTop[i],    y: Y_TOP })
  rowBottom.forEach((t, i) => pos[t] = { x: xsBottom[i], y: Y_BOTTOM })
  return pos
}

type Snapshot = Record<string, number>

export default function OdontogramaDxOverlay({ patientId }: { patientId: string }) {
  const [map, setMap] = React.useState<Snapshot>({})
  const [loading, setLoading] = React.useState(true)
  const [saving, setSaving] = React.useState(false)
  const positions = useToothPositions()

  // Cargar snapshot más reciente (columna real: 'state')
  React.useEffect(() => {
    (async () => {
      setLoading(true)
      const { data, error } = await supabase
        .from('odontograms')
        .select('state')
        .eq('patient_id', patientId)
        .order('created_at', { ascending: false })
        .limit(1)
      if (!error && data && data[0]) setMap(data[0].state || {})
      setLoading(false)
    })()
  }, [patientId])

  const listCodes = CODES.map(c => c.value)
  const cycle = (tooth: string) => {
    const cur = map[tooth] ?? 9
    const idx = listCodes.indexOf(cur)
    const next = listCodes[(idx + 1) % listCodes.length]
    setMap(m => ({ ...m, [tooth]: next }))
  }
  const clearTooth = (tooth: string) => setMap(m => ({ ...m, [tooth]: 9 }))

  const save = async () => {
    setSaving(true)
    try {
      const { error } = await supabase.from('odontograms').insert({
        patient_id: patientId,
        state: map,
        note: null,
      })
      if (error) throw error
      alert('Odontograma guardado')
    } catch (e:any) {
      alert(e.message || String(e))
    } finally {
      setSaving(false)
    }
  }

  const reload = async () => {
    setLoading(true)
    try {
      const { data } = await supabase
        .from('odontograms')
        .select('state')
        .eq('patient_id', patientId)
        .order('created_at', { ascending: false })
        .limit(1)
      if (data && data[0]) setMap(data[0].state || {})
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <div className="card p-4">Cargando odontograma…</div>

  return (
    <div className="space-y-3">
      {/* Barra de acciones */}
      <div className="flex gap-2">
        <button className="btn" onClick={save} disabled={saving}>
          {saving ? 'Guardando…' : 'Guardar'}
        </button>
        <button className="btn border" onClick={reload}>Cargar último</button>
        <div className="ml-auto text-sm text-gray-500">
          Click: cambia código · Alt+click/Click derecho: limpia
        </div>
      </div>

      {/* Contenedor relativo con la imagen base y los puntos */}
      <div className="relative w-full overflow-hidden rounded-xl border bg-white">
        {/* Tu imagen base del odontograma */}
        <img
          src="/odontograma/diagnostico-base.png"
          alt="Odontograma diagnóstico"
          className="w-full h-auto block"
        />

        {/* Hotspots (absolutos en %) */}
        {[...rowTop, ...rowBottom].map(t => {
          const pos = positions[t]
          const code = map[t] ?? 9
          const label = CODES.find(c => c.value === code)?.label || '—'
          return (
            <button
              key={t}
              onClick={(e) => { e.preventDefault(); cycle(t) }}
              onContextMenu={(e) => { e.preventDefault(); clearTooth(t) }}
              onAuxClick={(e) => { e.preventDefault(); clearTooth(t) }} // click medio
              className="absolute -translate-x-1/2 -translate-y-1/2"
              style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
              title={`${t}: ${label}`}
            >
              <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-white/90 border shadow">
                <Icon code={code} />
              </span>
            </button>
          )
        })}
      </div>

      {/* Leyenda rápida debajo */}
      <div className="grid md:grid-cols-2 gap-x-6 gap-y-1 text-sm">
        {CODES.map(c => (
          <div key={c.value} className="flex items-center gap-2">
            <span className="inline-flex items-center justify-center w-6 h-6 rounded-md border">
              <Icon code={c.value} />
            </span>
            <span className="text-gray-800">
              <span className="font-medium mr-1">{c.value}.</span>{c.label}
            </span>
          </div>
        ))}
      </div>

      {/* Estilos de impresión */}
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

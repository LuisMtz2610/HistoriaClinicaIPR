'use client'
import * as React from 'react'
import { supabase } from '@/lib/supabase'

/* ─── Datos ──────────────────────────────────────────────── */
const ROW_TOP    = ['18','17','16','15','14','13','12','11','21','22','23','24','25','26','27','28']
const ROW_BOTTOM = ['48','47','46','45','44','43','42','41','31','32','33','34','35','36','37','38']
const ALL_TEETH  = [...ROW_TOP, ...ROW_BOTTOM]

export type Code = string

export const CODES: { value: Code; label: string; color: string; bg: string }[] = [
  { value: '9',  label: 'No registrado',          color: '#94a3b8', bg: '#f1f5f9' },
  { value: '0',  label: 'Sano',                   color: '#16a34a', bg: '#dcfce7' },
  { value: '1',  label: 'Con caries',             color: '#dc2626', bg: '#fee2e2' },
  { value: '2',  label: 'Obturado con caries',    color: '#ea580c', bg: '#ffedd5' },
  { value: '3',  label: 'Obturado sin caries',    color: '#2563eb', bg: '#dbeafe' },
  { value: '4',  label: 'Perdido por caries',     color: '#1e1e1e', bg: '#e5e7eb' },
  { value: '5',  label: 'Perdido otra causa',     color: '#374151', bg: '#e5e7eb' },
  { value: '6',  label: 'Fisura obturada',        color: '#7c3aed', bg: '#ede9fe' },
  { value: '7',  label: 'Corona/implante',        color: '#0891b2', bg: '#cffafe' },
  { value: '8',  label: 'Sin erupcionar',         color: '#78716c', bg: '#f5f5f4' },
  { value: 'T',  label: 'Traumatismo/fractura',   color: '#b45309', bg: '#fef3c7' },
  { value: '11', label: 'Recesión gingival',      color: '#be123c', bg: '#ffe4e6' },
  { value: '12', label: 'Tratamiento conductos',  color: '#d97706', bg: '#fef3c7' },
  { value: '13', label: 'Instrumento separado',   color: '#6d28d9', bg: '#ede9fe' },
  { value: '14', label: 'Bolsas periodontales',   color: '#0f766e', bg: '#ccfbf1' },
  { value: '15', label: 'Fluorosis',              color: '#1d4ed8', bg: '#dbeafe' },
  { value: '16', label: 'Alt. morfológicas',      color: '#9333ea', bg: '#f3e8ff' },
  { value: '17', label: 'Lesión endoperiodontal', color: '#c2410c', bg: '#ffedd5' },
]

const CODE_MAP = Object.fromEntries(CODES.map(c => [c.value, c]))

/* ─── Posiciones sobre la imagen (%) ─────────────────────── */
// Imagen: 770×397 px · dientes entre márgenes laterales ~4.5%
// Gap central ~2.5% · 8 dientes por cuadrante
const TOOTH_POS: Record<string, { x: number; y: number }> = {
  '18': { x:  7.3, y: 30 }, '17': { x: 12.8, y: 30 }, '16': { x: 18.3, y: 30 }, '15': { x: 23.9, y: 30 },
  '14': { x: 29.4, y: 30 }, '13': { x: 34.9, y: 30 }, '12': { x: 40.5, y: 30 }, '11': { x: 46.0, y: 30 },
  '21': { x: 54.0, y: 30 }, '22': { x: 59.5, y: 30 }, '23': { x: 65.1, y: 30 }, '24': { x: 70.6, y: 30 },
  '25': { x: 76.1, y: 30 }, '26': { x: 81.7, y: 30 }, '27': { x: 87.2, y: 30 }, '28': { x: 92.7, y: 30 },
  '48': { x:  7.3, y: 68 }, '47': { x: 12.8, y: 68 }, '46': { x: 18.3, y: 68 }, '45': { x: 23.9, y: 68 },
  '44': { x: 29.4, y: 68 }, '43': { x: 34.9, y: 68 }, '42': { x: 40.5, y: 68 }, '41': { x: 46.0, y: 68 },
  '31': { x: 54.0, y: 68 }, '32': { x: 59.5, y: 68 }, '33': { x: 65.1, y: 68 }, '34': { x: 70.6, y: 68 },
  '35': { x: 76.1, y: 68 }, '36': { x: 81.7, y: 68 }, '37': { x: 87.2, y: 68 }, '38': { x: 92.7, y: 68 },
}

type Snapshot = Record<string, Code>

/* ─── Marcador visual por código ─────────────────────────── */
function ToothMark({ code }: { code: Code }) {
  const c = CODE_MAP[code] ?? CODE_MAP['9']
  const col = c.color

  // Símbolo simple e inequívoco para cada código
  const sym = (() => {
    switch (code) {
      case '0':  return <circle cx="9" cy="9" r="6" fill="none" stroke={col} strokeWidth="2"/>
      case '1':  return <circle cx="9" cy="9" r="6" fill={col}/>
      case '2':  return <><circle cx="9" cy="9" r="6" fill={col}/><circle cx="9" cy="9" r="3" fill="#fff"/></>
      case '3':  return <rect x="3" y="3" width="12" height="12" rx="2" fill={col}/>
      case '4':  return <><line x1="3" y1="3" x2="15" y2="15" stroke={col} strokeWidth="2.5"/><line x1="15" y1="3" x2="3" y2="15" stroke={col} strokeWidth="2.5"/></>
      case '5':  return <line x1="2" y1="9" x2="16" y2="9" stroke={col} strokeWidth="2.5"/>
      case '6':  return <><line x1="2" y1="9" x2="16" y2="9" stroke={col} strokeWidth="2"/><line x1="9" y1="2" x2="9" y2="16" stroke={col} strokeWidth="2"/></>
      case '7':  return <><circle cx="9" cy="6" r="4" fill="none" stroke={col} strokeWidth="2"/><rect x="7" y="10" width="4" height="5" fill={col}/></>
      case '8':  return <circle cx="9" cy="9" r="6" fill="none" stroke={col} strokeWidth="1.5" strokeDasharray="2.5 2"/>
      case 'T':  return <><line x1="9" y1="2" x2="9" y2="14" stroke={col} strokeWidth="2.5"/><line x1="5" y1="14" x2="13" y2="14" stroke={col} strokeWidth="2.5"/></>
      case '11': return <path d="M2,14 C6,6 12,6 16,14" stroke={col} strokeWidth="2" fill="none"/>
      case '12': return <line x1="9" y1="2" x2="9" y2="16" stroke={col} strokeWidth="3"/>
      case '13': return <><line x1="5" y1="13" x2="13" y2="5" stroke={col} strokeWidth="2"/><circle cx="5" cy="13" r="2.5" fill={col}/></>
      case '14': return <><line x1="3" y1="13" x2="15" y2="13" stroke={col} strokeWidth="2"/><line x1="6" y1="13" x2="6" y2="7" stroke={col} strokeWidth="1.5"/><line x1="9" y1="13" x2="9" y2="7" stroke={col} strokeWidth="1.5"/><line x1="12" y1="13" x2="12" y2="7" stroke={col} strokeWidth="1.5"/></>
      case '15': return <path d="M9,2 L10.5,6.5 L15.5,6.5 L11.5,9.5 L13,14 L9,11 L5,14 L6.5,9.5 L2.5,6.5 L7.5,6.5 Z" fill="none" stroke={col} strokeWidth="1.2"/>
      case '16': return <path d="M3,9 Q9,2 15,9 Q9,16 3,9 Z" fill="none" stroke={col} strokeWidth="2"/>
      case '17': return <><line x1="9" y1="2" x2="9" y2="16" stroke={col} strokeWidth="2.5"/><line x1="3" y1="13" x2="15" y2="13" stroke={col} strokeWidth="2"/></>
      default:   return <circle cx="9" cy="9" r="2.5" fill={col}/>
    }
  })()

  return (
    <svg width="18" height="18" viewBox="0 0 18 18" style={{ display:'block' }}>
      {sym}
    </svg>
  )
}

/* ─── Popup de selección de código ──────────────────────── */
function CodePicker({
  tooth, current, onSelect, onClose,
  anchorX, anchorY,
}: {
  tooth: string
  current: Code
  onSelect: (code: Code) => void
  onClose: () => void
  anchorX: number  // % from left
  anchorY: number  // % from top
}) {
  // Decidir si el popup va arriba o abajo del diente
  const above = anchorY > 50

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40" onClick={onClose} />

      {/* Popup */}
      <div
        className="absolute z-50 bg-white rounded-2xl shadow-2xl border border-gray-200 p-2 w-52"
        style={{
          left: `${Math.min(Math.max(anchorX, 5), 70)}%`,
          ...(above
            ? { bottom: `${100 - anchorY + 3}%` }
            : { top:    `${anchorY + 3}%` }),
        }}
      >
        <div className="text-xs font-semibold text-gray-500 px-1 pb-1 border-b mb-1">
          Pieza {tooth}
        </div>
        <div className="space-y-0.5 max-h-64 overflow-y-auto">
          {CODES.map(c => (
            <button
              key={c.value}
              onClick={() => { onSelect(c.value); onClose() }}
              className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left hover:bg-gray-50 transition"
              style={{ background: current === c.value ? c.bg : undefined }}
            >
              <span className="shrink-0 w-5 h-5 rounded flex items-center justify-center"
                    style={{ background: c.bg }}>
                <ToothMark code={c.value} />
              </span>
              <span className="text-xs text-gray-700 truncate">{c.value}. {c.label}</span>
              {current === c.value && (
                <span className="ml-auto text-[10px] font-bold" style={{ color: c.color }}>✓</span>
              )}
            </button>
          ))}
        </div>
        <button
          onClick={onClose}
          className="mt-1 w-full text-xs text-gray-400 hover:text-gray-600 py-1"
        >
          Cancelar
        </button>
      </div>
    </>
  )
}

/* ─── Componente principal ───────────────────────────────── */
export default function OdontogramaDxOverlay({ patientId }: { patientId: string }) {
  const [map,     setMap]     = React.useState<Snapshot>({})
  const [loading, setLoading] = React.useState(true)
  const [saving,  setSaving]  = React.useState(false)
  const [saved,   setSaved]   = React.useState(false)
  const [errMsg,  setErrMsg]  = React.useState<string | null>(null)
  const [picker,  setPicker]  = React.useState<{ tooth: string; x: number; y: number } | null>(null)

  // Cargar último estado
  React.useEffect(() => {
    ;(async () => {
      setLoading(true)
      const { data } = await supabase
        .from('odontograms')
        .select('state')
        .eq('patient_id', patientId)
        .order('created_at', { ascending: false })
        .limit(1)
      if (data && data[0]?.state) setMap(data[0].state as Snapshot)
      setLoading(false)
    })()
  }, [patientId])

  const setCode = (tooth: string, code: Code) =>
    setMap(m => ({ ...m, [tooth]: code }))

  const openPicker = (tooth: string, e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const pos = TOOTH_POS[tooth]
    setPicker({ tooth, x: pos.x, y: pos.y })
  }

  const save = async () => {
    setSaving(true)
    setErrMsg(null)
    try {
      const { error } = await supabase.from('odontograms').insert({
        patient_id: patientId,
        state: map,
        note: null,
      })
      if (error) throw error
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } catch (e: any) {
      setErrMsg(e.message || String(e))
    } finally {
      setSaving(false)
    }
  }

  const reload = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('odontograms')
      .select('state')
      .eq('patient_id', patientId)
      .order('created_at', { ascending: false })
      .limit(1)
    if (data && data[0]?.state) setMap(data[0].state as Snapshot)
    setLoading(false)
  }

  const reset = () => setMap({})

  if (loading) return (
    <div className="rounded-2xl border bg-white p-6 text-center text-gray-400 animate-pulse">
      Cargando odontograma…
    </div>
  )

  return (
    <div className="space-y-3">

      {/* Barra de acciones */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          className="btn"
          onClick={save}
          disabled={saving}
        >
          {saving ? 'Guardando…' : 'Guardar versión'}
        </button>
        <button className="btn-outline rounded-xl border px-4 py-2 text-sm font-medium hover:bg-gray-50 transition" onClick={reload}>
          Cargar último
        </button>
        <button className="rounded-xl border px-4 py-2 text-sm font-medium text-gray-500 hover:bg-gray-50 transition" onClick={reset}>
          Limpiar
        </button>
        <div className="ml-auto text-xs text-gray-400 hidden md:block">
          Click en cada diente para asignar código
        </div>

        {/* Feedback inline */}
        {saved && (
          <span className="text-sm font-medium text-emerald-600 flex items-center gap-1">
            <span>✓</span> Guardado
          </span>
        )}
        {errMsg && (
          <span className="text-sm text-rose-600">⚠ {errMsg}</span>
        )}
      </div>

      {/* Odontograma interactivo */}
      <div className="relative w-full overflow-visible rounded-xl border bg-white select-none">
        <img
          src="/odontograma/diagnostico-base.png"
          alt="Odontograma diagnóstico"
          className="w-full h-auto block rounded-xl"
          draggable={false}
        />

        {/* Hotspots sobre cada diente */}
        {ALL_TEETH.map(tooth => {
          const pos  = TOOTH_POS[tooth]
          const code = map[tooth] ?? '9'
          const meta = CODE_MAP[code] ?? CODE_MAP['9']
          const isSet = code !== '9'

          return (
            <button
              key={tooth}
              onClick={e => openPicker(tooth, e)}
              className="absolute -translate-x-1/2 -translate-y-1/2 group transition-transform hover:scale-125 focus:outline-none"
              style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
              title={`${tooth}: ${meta.label}`}
              aria-label={`Diente ${tooth}: ${meta.label}`}
            >
              <span
                className="inline-flex items-center justify-center rounded-full shadow-sm border transition-all"
                style={{
                  width: 26,
                  height: 26,
                  background: isSet ? meta.bg : 'rgba(255,255,255,0.85)',
                  borderColor: isSet ? meta.color : '#d1d5db',
                  borderWidth: isSet ? 1.5 : 1,
                }}
              >
                <ToothMark code={code} />
              </span>
            </button>
          )
        })}

        {/* Popup selector */}
        {picker && (
          <CodePicker
            tooth={picker.tooth}
            current={map[picker.tooth] ?? '9'}
            anchorX={picker.x}
            anchorY={picker.y}
            onSelect={code => setCode(picker.tooth, code)}
            onClose={() => setPicker(null)}
          />
        )}
      </div>

      {/* Leyenda compacta */}
      <details className="rounded-xl border bg-white">
        <summary className="cursor-pointer px-4 py-2.5 text-sm font-medium text-gray-600 select-none hover:bg-gray-50 rounded-xl transition">
          Ver leyenda de códigos
        </summary>
        <div className="px-4 pb-4 pt-2 grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-1.5">
          {CODES.map(c => (
            <div key={c.value} className="flex items-center gap-2 text-sm">
              <span
                className="inline-flex items-center justify-center w-6 h-6 rounded-md shrink-0"
                style={{ background: c.bg }}
              >
                <ToothMark code={c.value} />
              </span>
              <span className="text-gray-700">
                <span className="font-medium">{c.value}.</span> {c.label}
              </span>
            </div>
          ))}
        </div>
      </details>

    </div>
  )
}

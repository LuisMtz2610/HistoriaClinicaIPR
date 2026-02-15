'use client'
import * as React from 'react'
import { supabase } from '@/lib/supabase'

/* ─── Datos ────────────────────────────────────────────────── */
const ROW_TOP    = ['18','17','16','15','14','13','12','11','21','22','23','24','25','26','27','28']
const ROW_BOTTOM = ['48','47','46','45','44','43','42','41','31','32','33','34','35','36','37','38']
const ALL_TEETH  = [...ROW_TOP, ...ROW_BOTTOM]

export type Code = string

export const CODES: { value: Code; label: string; color: string; bg: string }[] = [
  { value: '9',  label: 'No registrado',          color: '#94a3b8', bg: '#f8fafc' },
  { value: '0',  label: 'Sano',                   color: '#16a34a', bg: '#f0fdf4' },
  { value: '1',  label: 'Con caries',             color: '#dc2626', bg: '#fef2f2' },
  { value: '2',  label: 'Obturado con caries',    color: '#ea580c', bg: '#fff7ed' },
  { value: '3',  label: 'Obturado sin caries',    color: '#2563eb', bg: '#eff6ff' },
  { value: '4',  label: 'Perdido por caries',     color: '#111827', bg: '#f3f4f6' },
  { value: '5',  label: 'Perdido otra causa',     color: '#4b5563', bg: '#f9fafb' },
  { value: '6',  label: 'Fisura obturada',        color: '#7c3aed', bg: '#faf5ff' },
  { value: '7',  label: 'Corona/implante',        color: '#0891b2', bg: '#ecfeff' },
  { value: '8',  label: 'Sin erupcionar',         color: '#78716c', bg: '#fafaf9' },
  { value: 'T',  label: 'Traumatismo/fractura',   color: '#b45309', bg: '#fffbeb' },
  { value: '11', label: 'Recesión gingival',      color: '#be123c', bg: '#fff1f2' },
  { value: '12', label: 'Trat. conductos',        color: '#d97706', bg: '#fffbeb' },
  { value: '13', label: 'Instrumento separado',   color: '#6d28d9', bg: '#f5f3ff' },
  { value: '14', label: 'Bolsas periodontales',   color: '#0f766e', bg: '#f0fdfa' },
  { value: '15', label: 'Fluorosis',              color: '#1d4ed8', bg: '#eff6ff' },
  { value: '16', label: 'Alt. morfológicas',      color: '#9333ea', bg: '#fdf4ff' },
  { value: '17', label: 'Lesión endoperiodontal', color: '#c2410c', bg: '#fff7ed' },
]
const CODE_MAP = Object.fromEntries(CODES.map(c => [c.value, c]))

/* ─── Posiciones calibradas sobre diagnostico-base.png 770x397px ─── */
const TOOTH_POS: Record<string, { x: number; y: number }> = {
  '18': { x: 13.7, y: 22.2 }, '17': { x: 18.4, y: 22.2 }, '16': { x: 23.2, y: 22.2 }, '15': { x: 27.9, y: 22.2 },
  '14': { x: 32.7, y: 22.2 }, '13': { x: 37.5, y: 22.2 }, '12': { x: 42.2, y: 22.2 }, '11': { x: 47.0, y: 22.2 },
  '21': { x: 51.7, y: 22.2 }, '22': { x: 56.5, y: 22.2 }, '23': { x: 61.3, y: 22.2 }, '24': { x: 66.1, y: 22.2 },
  '25': { x: 70.9, y: 22.2 }, '26': { x: 75.7, y: 22.2 }, '27': { x: 80.5, y: 22.2 }, '28': { x: 85.3, y: 22.2 },
  '48': { x: 13.7, y: 78.6 }, '47': { x: 18.4, y: 78.6 }, '46': { x: 23.2, y: 78.6 }, '45': { x: 27.9, y: 78.6 },
  '44': { x: 32.7, y: 78.6 }, '43': { x: 37.5, y: 78.6 }, '42': { x: 42.2, y: 78.6 }, '41': { x: 47.0, y: 78.6 },
  '31': { x: 51.7, y: 78.6 }, '32': { x: 56.5, y: 78.6 }, '33': { x: 61.3, y: 78.6 }, '34': { x: 66.1, y: 78.6 },
  '35': { x: 70.9, y: 78.6 }, '36': { x: 75.7, y: 78.6 }, '37': { x: 80.5, y: 78.6 }, '38': { x: 85.3, y: 78.6 },
}

type Snapshot = Record<string, Code>

/* ─── Símbolo SVG por código ────────────────────────────────── */
function ToothMark({ code, size = 14 }: { code: Code; size?: number }) {
  const c = CODE_MAP[code] ?? CODE_MAP['9']
  const col = c.color
  const cx = size/2, cy = size/2, r = size*0.38

  const sym = (() => {
    switch (code) {
      case '0':  return <circle cx={cx} cy={cy} r={r} fill="none" stroke={col} strokeWidth="1.8"/>
      case '1':  return <circle cx={cx} cy={cy} r={r} fill={col}/>
      case '2':  return <><circle cx={cx} cy={cy} r={r} fill={col}/><circle cx={cx} cy={cy} r={r*0.45} fill="#fff"/></>
      case '3':  return <rect x={cx-r} y={cy-r} width={r*2} height={r*2} rx="2" fill={col}/>
      case '4':  return <><line x1={cx-r} y1={cy-r} x2={cx+r} y2={cy+r} stroke={col} strokeWidth="2.2"/><line x1={cx+r} y1={cy-r} x2={cx-r} y2={cy+r} stroke={col} strokeWidth="2.2"/></>
      case '5':  return <line x1={cx-r} y1={cy} x2={cx+r} y2={cy} stroke={col} strokeWidth="2.2"/>
      case '6':  return <><line x1={cx-r} y1={cy} x2={cx+r} y2={cy} stroke={col} strokeWidth="1.8"/><line x1={cx} y1={cy-r} x2={cx} y2={cy+r} stroke={col} strokeWidth="1.8"/></>
      case '7':  return <><circle cx={cx} cy={cy-r*0.35} r={r*0.6} fill="none" stroke={col} strokeWidth="1.8"/><rect x={cx-r*0.35} y={cy+r*0.1} width={r*0.7} height={r*0.65} fill={col}/></>
      case '8':  return <circle cx={cx} cy={cy} r={r} fill="none" stroke={col} strokeWidth="1.5" strokeDasharray="2.5 2"/>
      case 'T':  return <><line x1={cx} y1={cy-r} x2={cx} y2={cy+r*0.5} stroke={col} strokeWidth="2.2"/><line x1={cx-r*0.5} y1={cy+r*0.5} x2={cx+r*0.5} y2={cy+r*0.5} stroke={col} strokeWidth="2.2"/></>
      case '11': return <path d={`M${cx-r},${cy+r*0.3} C${cx-r*0.2},${cy-r*0.8} ${cx+r*0.2},${cy-r*0.8} ${cx+r},${cy+r*0.3}`} stroke={col} strokeWidth="2" fill="none"/>
      case '12': return <line x1={cx} y1={cy-r} x2={cx} y2={cy+r} stroke={col} strokeWidth="2.8"/>
      case '13': return <><line x1={cx-r*0.4} y1={cy+r} x2={cx+r} y2={cy-r*0.4} stroke={col} strokeWidth="1.8"/><circle cx={cx-r*0.4} cy={cy+r} r={r*0.3} fill={col}/></>
      case '14': return <><line x1={cx-r} y1={cy+r*0.4} x2={cx+r} y2={cy+r*0.4} stroke={col} strokeWidth="1.8"/>{[-0.6,0,0.6].map((dx,i) => <line key={i} x1={cx+dx*r} y1={cy+r*0.4} x2={cx+dx*r} y2={cy-r*0.4} stroke={col} strokeWidth="1.2"/>)}</>
      case '15': return <path d={`M${cx},${cy-r} L${cx+r*0.35},${cy-r*0.15} L${cx+r},${cy-r*0.15} L${cx+r*0.55},${cy+r*0.3} L${cx+r*0.65},${cy+r} L${cx},${cy+r*0.6} L${cx-r*0.65},${cy+r} L${cx-r*0.55},${cy+r*0.3} L${cx-r},${cy-r*0.15} L${cx-r*0.35},${cy-r*0.15} Z`} fill="none" stroke={col} strokeWidth="1.2"/>
      case '16': return <path d={`M${cx-r},${cy} Q${cx},${cy-r*1.2} ${cx+r},${cy} Q${cx},${cy+r*1.2} ${cx-r},${cy} Z`} fill="none" stroke={col} strokeWidth="1.8"/>
      case '17': return <><line x1={cx} y1={cy-r} x2={cx} y2={cy+r} stroke={col} strokeWidth="2.2"/><line x1={cx-r} y1={cy+r*0.4} x2={cx+r} y2={cy+r*0.4} stroke={col} strokeWidth="1.8"/></>
      default:   return <circle cx={cx} cy={cy} r={r*0.5} fill={col}/>
    }
  })()

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ display: 'block', flexShrink: 0 }}>
      {sym}
    </svg>
  )
}

/* ─── Popup selector ────────────────────────────────────────── */
function CodePicker({ tooth, current, onSelect, onClose, anchorX, anchorY }: {
  tooth: string; current: Code
  onSelect: (c: Code) => void; onClose: () => void
  anchorX: number; anchorY: number
}) {
  const above = anchorY > 55
  const leftPct = Math.min(Math.max(anchorX - 10, 2), 62)

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div
        className="absolute z-50 w-56"
        style={{
          left: `${leftPct}%`,
          ...(above ? { bottom: `${100 - anchorY + 4}%` } : { top: `${anchorY + 4}%` }),
          filter: 'drop-shadow(0 8px 24px rgba(0,0,0,0.18))',
        }}
      >
        <div style={{ background: 'rgba(255,255,255,0.98)', borderRadius: 16, border: '1px solid rgba(0,0,0,0.08)', overflow: 'hidden' }}>
          <div style={{ padding: '10px 14px 8px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              Pieza {tooth}
            </div>
            <button onClick={onClose} style={{ color: '#94a3b8', fontSize: 14, background: 'none', border: 'none', cursor: 'pointer' }}>✕</button>
          </div>
          <div style={{ maxHeight: 280, overflowY: 'auto', padding: '4px 6px' }}>
            {CODES.map(c => {
              const isCurrent = current === c.value
              return (
                <button key={c.value} onClick={() => { onSelect(c.value); onClose() }}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center', gap: 8,
                    padding: '7px 8px', borderRadius: 10, border: 'none', cursor: 'pointer',
                    background: isCurrent ? c.bg : 'transparent', textAlign: 'left', transition: 'background 0.1s',
                  }}
                >
                  <span style={{ width: 22, height: 22, borderRadius: 6, flexShrink: 0, background: c.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', border: `1px solid ${isCurrent ? c.color : 'transparent'}` }}>
                    <ToothMark code={c.value} size={13} />
                  </span>
                  <span style={{ fontSize: 12, color: '#374151', flex: 1, lineHeight: 1.3 }}>
                    <span style={{ fontWeight: 600, color: c.color, marginRight: 3 }}>{c.value}.</span>
                    {c.label}
                  </span>
                  {isCurrent && <span style={{ color: c.color, fontSize: 13, fontWeight: 700, flexShrink: 0 }}>✓</span>}
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </>
  )
}

/* ─── Props ─────────────────────────────────────────────────── */
export interface OdontogramaDxOverlayProps {
  patientId: string
  snapshotId?: string
  mode?: 'diagnostico' | 'evolucion'
  onSaved?: (newId: string) => void
}

/* ─── Componente principal ──────────────────────────────────── */
export default function OdontogramaDxOverlay({
  patientId, snapshotId, mode = 'diagnostico', onSaved,
}: OdontogramaDxOverlayProps) {
  const [map,           setMap]           = React.useState<Snapshot>({})
  const [loading,       setLoading]       = React.useState(true)
  const [saving,        setSaving]        = React.useState(false)
  const [saved,         setSaved]         = React.useState(false)
  const [errMsg,        setErrMsg]        = React.useState<string | null>(null)
  const [picker,        setPicker]        = React.useState<{ tooth: string; x: number; y: number } | null>(null)
  const [changedTeeth,  setChangedTeeth]  = React.useState<Set<string>>(new Set())

  React.useEffect(() => {
    ;(async () => {
      setLoading(true)
      let snap: Snapshot | null = null
      if (snapshotId) {
        const { data } = await supabase.from('odontograms').select('snapshot').eq('id', snapshotId).maybeSingle()
        snap = data?.snapshot ?? null
      } else {
        const { data } = await supabase.from('odontograms').select('snapshot').eq('patient_id', patientId).order('created_at', { ascending: false }).limit(1)
        snap = data?.[0]?.snapshot ?? null
      }
      if (snap) setMap(snap as Snapshot)
      setLoading(false)
    })()
  }, [patientId, snapshotId])

  const setCode = (tooth: string, code: Code) => {
    setMap(m => ({ ...m, [tooth]: code }))
    setChangedTeeth(prev => new Set([...prev, tooth]))
  }

  const openPicker = (tooth: string, e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation()
    const pos = TOOTH_POS[tooth]
    setPicker({ tooth, x: pos.x, y: pos.y })
  }

  const save = async () => {
    setSaving(true); setErrMsg(null)
    try {
      const { data, error } = await supabase.from('odontograms')
        .insert({ patient_id: patientId, kind: mode, snapshot: map })
        .select('id').single()
      if (error) throw error
      setSaved(true); setChangedTeeth(new Set())
      setTimeout(() => setSaved(false), 3000)
      onSaved?.(data.id)
    } catch (e: any) {
      setErrMsg(e.message || String(e))
    } finally {
      setSaving(false)
    }
  }

  const reload = async () => {
    setLoading(true)
    const { data } = await supabase.from('odontograms').select('snapshot').eq('patient_id', patientId).order('created_at', { ascending: false }).limit(1)
    if (data?.[0]?.snapshot) setMap(data[0].snapshot as Snapshot)
    setChangedTeeth(new Set()); setLoading(false)
  }

  const reset = () => { setMap({}); setChangedTeeth(new Set()) }
  const changedCount = changedTeeth.size
  const isEvolucion = mode === 'evolucion'
  const hallazgos = Object.entries(map).filter(([, c]) => c !== '9')

  if (loading) return (
    <div className="flex items-center justify-center gap-3 p-8 bg-white rounded-2xl border border-gray-200">
      <div style={{ width: 18, height: 18, borderRadius: '50%', border: '2px solid #2B9C93', borderTopColor: 'transparent', animation: 'spin 0.7s linear infinite' }}/>
      <span className="text-sm text-gray-400">Cargando odontograma…</span>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  return (
    <div className="space-y-3">

      {/* Barra de acciones */}
      <div className="flex flex-wrap items-center gap-2 px-4 py-3 bg-white rounded-2xl border border-gray-200">
        <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold ${
          isEvolucion ? 'bg-orange-50 border border-orange-200 text-orange-700' : 'bg-emerald-50 border border-emerald-200 text-emerald-700'
        }`}>
          {isEvolucion ? '🔄 Evolución' : '🦷 Diagnóstico inicial'}
        </div>

        {changedCount > 0 && (
          <div className="flex items-center gap-1.5 text-xs text-amber-600 font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block"/>
            {changedCount} pieza{changedCount !== 1 ? 's' : ''} modificada{changedCount !== 1 ? 's' : ''}
          </div>
        )}

        <div className="flex-1"/>

        <button onClick={reload} className="px-3 py-1.5 rounded-xl text-xs font-medium border border-gray-200 text-gray-500 hover:bg-gray-50 transition">
          ↩ Recargar
        </button>
        <button onClick={reset} className="px-3 py-1.5 rounded-xl text-xs font-medium border border-gray-200 text-gray-500 hover:bg-gray-50 transition">
          Limpiar
        </button>
        <button
          onClick={save} disabled={saving}
          className={`px-4 py-1.5 rounded-xl text-sm font-semibold text-white transition flex items-center gap-2 ${
            saved ? 'bg-emerald-500' : saving ? 'bg-gray-400 cursor-not-allowed' : 'bg-brand hover:bg-brand-dark'
          }`}
        >
          {saving ? (<><span style={{ width:12,height:12,borderRadius:'50%',border:'2px solid rgba(255,255,255,0.4)',borderTopColor:'white',display:'inline-block',animation:'spin 0.7s linear infinite' }}/> Guardando…</>)
           : saved ? '✓ Guardado'
           : `💾 Guardar ${isEvolucion ? 'evolución' : 'diagnóstico'}`}
        </button>

        {errMsg && (
          <div className="w-full px-3 py-2 rounded-xl bg-red-50 border border-red-200 text-xs text-red-600">⚠ {errMsg}</div>
        )}
      </div>

      {/* Canvas */}
      <div className="relative w-full rounded-2xl overflow-visible border border-gray-200 bg-white select-none">
        <img
          src="/odontograma/diagnostico-base.png"
          alt="Odontograma diagnóstico"
          className="w-full h-auto block rounded-2xl"
          draggable={false}
        />

        {ALL_TEETH.map(tooth => {
          const pos   = TOOTH_POS[tooth]
          const code  = map[tooth] ?? '9'
          const meta  = CODE_MAP[code] ?? CODE_MAP['9']
          const isSet = code !== '9'
          const isChanged = changedTeeth.has(tooth)

          return (
            <button
              key={tooth}
              onClick={e => openPicker(tooth, e)}
              className="absolute -translate-x-1/2 -translate-y-1/2 group focus:outline-none"
              style={{
                left: `${pos.x}%`, top: `${pos.y}%`,
                width: 28, height: 28, borderRadius: '50%', padding: 0,
                border: isChanged ? '2px solid #f59e0b' : isSet ? `2px solid ${meta.color}` : '1.5px solid #d1d5db',
                background: isSet ? meta.bg : 'rgba(255,255,255,0.88)',
                cursor: 'pointer', transition: 'transform 0.12s, box-shadow 0.12s',
                boxShadow: isSet ? `0 2px 8px ${meta.color}30` : '0 1px 3px rgba(0,0,0,0.08)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = 'translate(-50%,-50%) scale(1.4)'; (e.currentTarget as HTMLElement).style.zIndex = '10' }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = 'translate(-50%,-50%) scale(1)'; (e.currentTarget as HTMLElement).style.zIndex = '' }}
              title={`${tooth}: ${meta.label}`}
            >
              <ToothMark code={code} size={14} />
            </button>
          )
        })}

        {picker && (
          <CodePicker
            tooth={picker.tooth} current={map[picker.tooth] ?? '9'}
            anchorX={picker.x} anchorY={picker.y}
            onSelect={code => setCode(picker.tooth, code)}
            onClose={() => setPicker(null)}
          />
        )}
      </div>

      {/* Resumen de hallazgos */}
      {hallazgos.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-200 px-4 py-3">
          <div className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Hallazgos registrados</div>
          <div className="flex flex-wrap gap-1.5">
            {hallazgos
              .sort(([a], [b]) => {
                const n = (s: string) => isNaN(Number(s)) ? 999 : Number(s)
                return n(a) - n(b)
              })
              .map(([tooth, code]) => {
                const meta = CODE_MAP[code] ?? CODE_MAP['9']
                return (
                  <button
                    key={tooth}
                    onClick={() => setPicker({ tooth, x: TOOTH_POS[tooth].x, y: TOOTH_POS[tooth].y })}
                    className="flex items-center gap-1.5 px-2 py-1 rounded-lg transition hover:opacity-80"
                    style={{ background: meta.bg, border: `1px solid ${meta.color}25` }}
                  >
                    <ToothMark code={code} size={11} />
                    <span className="text-xs font-bold" style={{ color: meta.color }}>{tooth}</span>
                    <span className="text-xs text-gray-500">{meta.label}</span>
                  </button>
                )
              })}
          </div>
        </div>
      )}

      {/* Leyenda */}
      <details className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <summary className="px-4 py-2.5 cursor-pointer text-sm font-medium text-gray-500 select-none hover:bg-gray-50 rounded-2xl transition list-none flex items-center gap-2">
          <span className="text-xs">▶</span> Ver leyenda de códigos
        </summary>
        <div className="px-4 pb-4 pt-1 grid grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-1.5">
          {CODES.map(c => (
            <div key={c.value} className="flex items-center gap-2">
              <span className="w-5 h-5 rounded flex items-center justify-center shrink-0" style={{ background: c.bg }}>
                <ToothMark code={c.value} size={12} />
              </span>
              <span className="text-xs text-gray-700">
                <span className="font-semibold" style={{ color: c.color }}>{c.value}.</span> {c.label}
              </span>
            </div>
          ))}
        </div>
      </details>

      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}

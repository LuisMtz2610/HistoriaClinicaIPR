'use client'

import React, { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { publicUrlFor } from '@/lib/odontogram'
import BackButton from '@/components/BackButton'
import OdontogramaDxOverlay from '@/components/OdontogramaDxOverlay'

type Row = {
  id: string
  created_at: string
  kind: 'diagnostico' | 'evolucion'
  image_path: string | null
  notes: string | null
  snapshot: any
}

export default function Page({ params }: { params: { id: string } }) {
  const patientId = params.id
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<string[]>([])
  const [mode, setMode] = useState<'timeline' | 'nueva_evolucion'>('timeline')
  const router = useRouter()

  const load = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('odontograms')
      .select('id, created_at, kind, image_path, notes, snapshot')
      .eq('patient_id', patientId)
      .order('created_at', { ascending: false })
    if (!error) setRows((data ?? []) as Row[])
    setLoading(false)
  }

  useEffect(() => { load() }, [patientId])

  const fmt = useMemo(() =>
    new Intl.DateTimeFormat('es-MX', { dateStyle: 'medium', timeStyle: 'short' }), [])

  function toggleSelected(id: string) {
    setSelected(prev => {
      if (prev.includes(id)) return prev.filter(x => x !== id)
      if (prev.length >= 2) return [prev[1], id]
      return [...prev, id]
    })
  }

  const diagnosticos = rows.filter(r => r.kind === 'diagnostico')
  const evoluciones  = rows.filter(r => r.kind === 'evolucion')
  const lastSnapshotId = rows[0]?.id

  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="flex items-center gap-3 flex-wrap">
        <BackButton />
        <div>
          <h1 className="page-title">Odontogramas</h1>
          <p className="text-xs text-gray-400 mt-0.5">
            {diagnosticos.length} diagnóstico{diagnosticos.length !== 1 ? 's' : ''} · {evoluciones.length} evolución{evoluciones.length !== 1 ? 'es' : ''}
          </p>
        </div>
        <div className="flex gap-2 ml-auto flex-wrap">
          {selected.length === 2 && (
            <button
              onClick={() => router.push(`/patients/${patientId}/odontogramas/compare?a=${selected[0]}&b=${selected[1]}`)}
              className="btn text-sm flex items-center gap-1.5"
            >
              ⚖️ Comparar seleccionados
            </button>
          )}
          <button
            onClick={() => setMode(mode === 'nueva_evolucion' ? 'timeline' : 'nueva_evolucion')}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition border ${
              mode === 'nueva_evolucion'
                ? 'bg-orange-50 border-orange-300 text-orange-700 hover:bg-orange-100'
                : 'bg-brand text-white border-transparent hover:bg-brand-dark'
            }`}
          >
            {mode === 'nueva_evolucion' ? '← Volver al historial' : '+ Nueva evolución'}
          </button>
          <Link href={`/patients/${patientId}`} className="px-4 py-2 rounded-xl text-sm font-medium border border-gray-200 text-gray-600 hover:bg-gray-50 transition">
            Ficha del paciente
          </Link>
        </div>
      </div>

      {/* Panel: nueva evolución */}
      {mode === 'nueva_evolucion' && (
        <div className="card p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-xl bg-orange-100 flex items-center justify-center text-base">🔄</div>
            <div>
              <div className="font-semibold text-gray-800">Nueva evolución</div>
              <div className="text-xs text-gray-400">Cargado desde el último registro. Modifica lo que haya cambiado.</div>
            </div>
          </div>
          <OdontogramaDxOverlay
            patientId={patientId}
            snapshotId={lastSnapshotId}
            mode="evolucion"
            onSaved={async () => {
              await load()
              setMode('timeline')
            }}
          />
        </div>
      )}

      {/* Timeline */}
      {mode === 'timeline' && (
        <div className="space-y-4">

          {loading && (
            <div className="flex items-center justify-center py-16 text-gray-400 gap-2 animate-pulse">
              <span>Cargando historial…</span>
            </div>
          )}

          {!loading && rows.length === 0 && (
            <div className="card p-10 text-center">
              <div className="text-5xl mb-3">🦷</div>
              <div className="font-semibold text-gray-600 mb-1">Sin odontogramas registrados</div>
              <div className="text-sm text-gray-400">Ve a la historia clínica para capturar el diagnóstico inicial.</div>
              <Link href={`/patients/${patientId}/historia`} className="btn mt-4 inline-block text-sm">
                Ir a historia clínica
              </Link>
            </div>
          )}

          {!loading && rows.length > 0 && (
            <>
              {/* Hint comparación */}
              {rows.length >= 2 && selected.length < 2 && (
                <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-sky-50 border border-sky-200 text-xs text-sky-700">
                  <span>💡</span>
                  <span>Selecciona 2 versiones para comparar evolución lado a lado</span>
                </div>
              )}

              {/* Grid de versiones */}
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {rows.map((r, idx) => (
                  <OdontogramCard
                    key={r.id}
                    row={r}
                    idx={idx}
                    total={rows.length}
                    patientId={patientId}
                    isSelected={selected.includes(r.id)}
                    onToggleSelect={() => toggleSelected(r.id)}
                    fmt={fmt}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}

/* ─── Tarjeta de versión ────────────────────────────────────── */
function OdontogramCard({ row, idx, total, patientId, isSelected, onToggleSelect, fmt }: {
  row: Row; idx: number; total: number
  patientId: string; isSelected: boolean
  onToggleSelect: () => void
  fmt: Intl.DateTimeFormat
}) {
  const [imgUrl, setImgUrl] = React.useState<string | null>(null)
  const [imgLoaded, setImgLoaded] = React.useState(false)

  React.useEffect(() => {
    if (row.image_path) setImgUrl(publicUrlFor(row.image_path))
  }, [row.image_path])

  const isLatest = idx === 0
  const isDx = row.kind === 'diagnostico'
  const hallazgos = row.snapshot
    ? Object.entries(row.snapshot as Record<string,string>).filter(([,c]) => c !== '9').length
    : 0

  return (
    <div
      className={`card overflow-hidden transition-all duration-200 ${
        isSelected ? 'ring-2 ring-brand shadow-md' : 'hover:shadow-md'
      }`}
    >
      {/* Thumbnail */}
      <div className="relative aspect-[14/9] bg-gray-50 overflow-hidden">
        {imgUrl ? (
          <>
            {!imgLoaded && <div className="absolute inset-0 bg-gray-100 animate-pulse"/>}
            <img
              src={imgUrl}
              alt="Odontograma"
              className={`w-full h-full object-contain transition-opacity duration-300 ${imgLoaded ? 'opacity-100' : 'opacity-0'}`}
              onLoad={() => setImgLoaded(true)}
            />
          </>
        ) : (
          // Miniatura con puntos coloreados del snapshot
          <SnapshotMiniature snapshot={row.snapshot} />
        )}

        {/* Badges */}
        <div className="absolute top-2 left-2 flex gap-1">
          {isLatest && (
            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-brand text-white shadow-sm">
              Más reciente
            </span>
          )}
          <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold shadow-sm ${
            isDx
              ? 'bg-emerald-100 text-emerald-700'
              : 'bg-orange-100 text-orange-700'
          }`}>
            {isDx ? '🦷 Diagnóstico' : '🔄 Evolución'}
          </span>
          {idx === total - 1 && !isLatest && (
            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-gray-100 text-gray-500 shadow-sm">
              Inicial
            </span>
          )}
        </div>

        {/* Checkbox comparación */}
        <button
          onClick={onToggleSelect}
          className={`absolute top-2 right-2 w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all shadow-sm ${
            isSelected
              ? 'bg-brand border-brand text-white'
              : 'bg-white/80 border-gray-300 hover:border-brand'
          }`}
          title={isSelected ? 'Quitar de comparación' : 'Añadir a comparación'}
        >
          {isSelected && <span className="text-[10px] font-bold">✓</span>}
        </button>
      </div>

      {/* Info */}
      <div className="p-3 space-y-2">
        <div className="text-xs text-gray-500">{fmt.format(new Date(row.created_at))}</div>

        {hallazgos > 0 && (
          <div className="text-xs text-gray-600">
            <span className="font-semibold text-brand">{hallazgos}</span> hallazgo{hallazgos !== 1 ? 's' : ''} registrado{hallazgos !== 1 ? 's' : ''}
          </div>
        )}

        {row.notes && (
          <div className="text-xs text-gray-500 italic line-clamp-2 border-l-2 border-gray-200 pl-2">
            {row.notes}
          </div>
        )}

        <Link
          href={`/patients/${patientId}/odontogramas/${row.id}`}
          className="block w-full text-center py-1.5 rounded-lg text-xs font-semibold text-brand border border-brand/30 hover:bg-brand/5 transition"
        >
          Ver detalle →
        </Link>
      </div>
    </div>
  )
}

/* ─── Miniatura SVG del snapshot ────────────────────────────── */
const COLORS: Record<string, string> = {
  '9': 'transparent', '0': '#22c55e', '1': '#ef4444', '2': '#f97316',
  '3': '#3b82f6', '4': '#374151', '5': '#6b7280', '6': '#8b5cf6',
  '7': '#06b6d4', '8': '#a8a29e', 'T': '#f59e0b', '11': '#f43f5e',
  '12': '#fbbf24', '13': '#7c3aed', '14': '#14b8a6', '15': '#60a5fa',
  '16': '#a855f7', '17': '#fb923c',
}
const TOP    = ['18','17','16','15','14','13','12','11','21','22','23','24','25','26','27','28']
const BOTTOM = ['48','47','46','45','44','43','42','41','31','32','33','34','35','36','37','38']

function SnapshotMiniature({ snapshot }: { snapshot: any }) {
  if (!snapshot) return (
    <div className="w-full h-full flex items-center justify-center text-gray-300 text-3xl">🦷</div>
  )

  const W = 280, H = 80
  const margin = 12
  const step = (W - margin*2) / 16
  const r = 5

  const rows = [TOP, BOTTOM]
  const ys = [22, 58]

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-full" style={{ background: '#fafafa' }}>
      {/* Línea central */}
      <line x1={W/2} y1={4} x2={W/2} y2={H-4} stroke="#e5e7eb" strokeWidth="1"/>
      {rows.map((row, ri) =>
        row.map((tooth, ci) => {
          const code = snapshot[tooth] ?? '9'
          const x = margin + ci * step + step/2
          const y = ys[ri]
          const fill = COLORS[code] ?? '#cbd5e1'
          const isSet = code !== '9'
          return (
            <circle
              key={tooth}
              cx={x} cy={y} r={r}
              fill={isSet ? fill : 'none'}
              stroke={isSet ? fill : '#d1d5db'}
              strokeWidth={isSet ? 0 : 1}
              opacity={isSet ? 0.9 : 0.4}
            />
          )
        })
      )}
    </svg>
  )
}

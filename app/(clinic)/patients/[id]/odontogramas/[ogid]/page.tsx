'use client'

import React, { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { publicUrlFor } from '@/lib/odontogram'
import BackButton from '@/components/BackButton'

const CODES: Record<string, { label: string; color: string; bg: string }> = {
  '9':  { label: 'No registrado',          color: '#94a3b8', bg: '#f8fafc' },
  '0':  { label: 'Sano',                   color: '#16a34a', bg: '#f0fdf4' },
  '1':  { label: 'Con caries',             color: '#dc2626', bg: '#fef2f2' },
  '2':  { label: 'Obturado con caries',    color: '#ea580c', bg: '#fff7ed' },
  '3':  { label: 'Obturado sin caries',    color: '#2563eb', bg: '#eff6ff' },
  '4':  { label: 'Perdido por caries',     color: '#111827', bg: '#f3f4f6' },
  '5':  { label: 'Perdido otra causa',     color: '#4b5563', bg: '#f9fafb' },
  '6':  { label: 'Fisura obturada',        color: '#7c3aed', bg: '#faf5ff' },
  '7':  { label: 'Corona/implante',        color: '#0891b2', bg: '#ecfeff' },
  '8':  { label: 'Sin erupcionar',         color: '#78716c', bg: '#fafaf9' },
  'T':  { label: 'Traumatismo/fractura',   color: '#b45309', bg: '#fffbeb' },
  '11': { label: 'Recesión gingival',      color: '#be123c', bg: '#fff1f2' },
  '12': { label: 'Trat. conductos',        color: '#d97706', bg: '#fffbeb' },
  '13': { label: 'Instrumento separado',   color: '#6d28d9', bg: '#f5f3ff' },
  '14': { label: 'Bolsas periodontales',   color: '#0f766e', bg: '#f0fdfa' },
  '15': { label: 'Fluorosis',              color: '#1d4ed8', bg: '#eff6ff' },
  '16': { label: 'Alt. morfológicas',      color: '#9333ea', bg: '#fdf4ff' },
  '17': { label: 'Lesión endoperiodontal', color: '#c2410c', bg: '#fff7ed' },
}

type Row = {
  id: string
  created_at: string
  kind: 'diagnostico' | 'evolucion'
  image_path: string | null
  notes: string | null
  snapshot: Record<string, string> | null
}

export default function Page({ params }: { params: { id: string; ogid: string } }) {
  const patientId = params.id
  const ogid = params.ogid
  const [row, setRow] = useState<Row | null>(null)
  const [loading, setLoading] = useState(true)
  const [imgUrl, setImgUrl] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    ;(async () => {
      setLoading(true)
      const { data, error } = await supabase
        .from('odontograms')
        .select('id, created_at, kind, image_path, notes, snapshot')
        .eq('id', ogid)
        .maybeSingle()
      if (!error && data) {
        setRow(data as Row)
        if (data.image_path) setImgUrl(publicUrlFor(data.image_path))
      }
      setLoading(false)
    })()
  }, [ogid])

  const fmt = useMemo(() =>
    new Intl.DateTimeFormat('es-MX', { dateStyle: 'full', timeStyle: 'short' }), [])

  if (loading) return (
    <div className="flex items-center justify-center py-20 text-gray-400 gap-2 animate-pulse">
      Cargando odontograma…
    </div>
  )

  if (!row) return (
    <div className="card p-8 text-center">
      <div className="text-4xl mb-3">🔍</div>
      <div className="font-semibold text-gray-600">Registro no encontrado</div>
      <Link href={`/patients/${patientId}/odontogramas`} className="btn mt-4 inline-block text-sm">
        ← Volver al historial
      </Link>
    </div>
  )

  const isDx = row.kind === 'diagnostico'
  const snapshot = row.snapshot ?? {}
  const hallazgos = Object.entries(snapshot).filter(([, c]) => c !== '9')

  // Agrupar hallazgos por código
  const byCode: Record<string, string[]> = {}
  hallazgos.forEach(([tooth, code]) => {
    if (!byCode[code]) byCode[code] = []
    byCode[code].push(tooth)
  })

  return (
    <div className="space-y-5 max-w-4xl mx-auto">

      {/* Header */}
      <div className="flex items-center gap-3 flex-wrap">
        <BackButton />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="page-title">Odontograma</h1>
            <span className={`px-2.5 py-0.5 rounded-lg text-xs font-bold ${
              isDx
                ? 'bg-emerald-100 text-emerald-700'
                : 'bg-orange-100 text-orange-700'
            }`}>
              {isDx ? '🦷 Diagnóstico inicial' : '🔄 Evolución'}
            </span>
          </div>
          <p className="text-sm text-gray-400 mt-0.5 capitalize">{fmt.format(new Date(row.created_at))}</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Link
            href={`/patients/${patientId}/odontogramas`}
            className="px-3 py-2 rounded-xl text-sm border border-gray-200 text-gray-600 hover:bg-gray-50 transition"
          >
            Historial
          </Link>
          <Link
            href={`/patients/${patientId}/odontogramas?compare=${row.id}`}
            className="btn text-sm"
          >
            ⚖️ Comparar
          </Link>
        </div>
      </div>

      {/* Notas */}
      {row.notes && (
        <div className="card px-5 py-4 flex items-start gap-3">
          <span className="text-lg shrink-0 mt-0.5">📝</span>
          <div>
            <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Notas</div>
            <p className="text-sm text-gray-700">{row.notes}</p>
          </div>
        </div>
      )}

      {/* Imagen o miniatura */}
      <div className="card overflow-hidden">
        {imgUrl ? (
          <img src={imgUrl} alt="Odontograma" className="w-full h-auto" />
        ) : (
          <div className="p-6">
            <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">Vista del snapshot</div>
            <SnapshotGrid snapshot={snapshot} />
          </div>
        )}
      </div>

      {/* Hallazgos */}
      {hallazgos.length > 0 ? (
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="font-semibold text-gray-800">Hallazgos clínicos</div>
              <div className="text-xs text-gray-400 mt-0.5">{hallazgos.length} pieza{hallazgos.length !== 1 ? 's' : ''} con diagnóstico</div>
            </div>
          </div>

          {/* Agrupados por código */}
          <div className="space-y-3">
            {Object.entries(byCode)
              .sort(([a], [b]) => {
                const order = ['1','2','4','5','12','T','3','6','7','14','11','13','15','16','17','8','0']
                return order.indexOf(a) - order.indexOf(b)
              })
              .map(([code, teeth]) => {
                const meta = CODES[code] ?? CODES['9']
                return (
                  <div
                    key={code}
                    className="flex items-start gap-3 p-3 rounded-xl"
                    style={{ background: meta.bg, border: `1px solid ${meta.color}20` }}
                  >
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold shrink-0 mt-0.5"
                      style={{ background: meta.color, color: 'white' }}
                    >
                      {code}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold" style={{ color: meta.color }}>{meta.label}</div>
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {teeth.sort((a, b) => Number(a) - Number(b)).map(t => (
                          <span
                            key={t}
                            className="px-2 py-0.5 rounded-md text-xs font-bold bg-white"
                            style={{ border: `1px solid ${meta.color}40`, color: meta.color }}
                          >
                            {t}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="text-xs text-gray-400 shrink-0">
                      {teeth.length} pieza{teeth.length !== 1 ? 's' : ''}
                    </div>
                  </div>
                )
              })}
          </div>
        </div>
      ) : (
        <div className="card p-6 text-center text-gray-400">
          <div className="text-2xl mb-2">✨</div>
          <div className="text-sm">Sin hallazgos registrados — todas las piezas en estado normal</div>
        </div>
      )}

    </div>
  )
}

/* ─── Grid visual del snapshot ──────────────────────────────── */
const TOP    = ['18','17','16','15','14','13','12','11','21','22','23','24','25','26','27','28']
const BOTTOM = ['48','47','46','45','44','43','42','41','31','32','33','34','35','36','37','38']

function SnapshotGrid({ snapshot }: { snapshot: Record<string, string> }) {
  const renderRow = (teeth: string[]) => (
    <div className="flex gap-1 justify-center">
      {teeth.map(tooth => {
        const code = snapshot[tooth] ?? '9'
        const meta = CODES[code] ?? CODES['9']
        const isSet = code !== '9'
        return (
          <div
            key={tooth}
            className="flex flex-col items-center gap-1"
            title={`${tooth}: ${meta.label}`}
          >
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center text-[9px] font-bold"
              style={{
                background: isSet ? meta.bg : '#f9fafb',
                border: `1.5px solid ${isSet ? meta.color : '#e5e7eb'}`,
                color: isSet ? meta.color : '#9ca3af',
              }}
            >
              {isSet ? code : ''}
            </div>
            <div className="text-[9px] text-gray-400 leading-none">{tooth}</div>
          </div>
        )
      })}
    </div>
  )

  return (
    <div className="space-y-3 overflow-x-auto">
      {renderRow(TOP)}
      <div className="h-px bg-gray-100 mx-4"/>
      {renderRow(BOTTOM)}
    </div>
  )
}

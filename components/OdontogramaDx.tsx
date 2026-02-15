'use client'
import * as React from 'react'
import { supabase } from '@/lib/supabase'
import { fdiRows, odontogramaCodes } from '@/lib/teeth'

// --- Iconos SVG simples para cada código (puedes afinarlos cuando quieras)
const Icon = ({ code }: { code: number }) => {
  // colores de fondo por categoría
  const bg =
    code === 0 ? 'bg-green-100 border-green-300' :
    code === 1 ? 'bg-red-100 border-red-300' :
    code === 2 ? 'bg-orange-100 border-orange-300' :
    code === 3 ? 'bg-blue-100 border-blue-300' :
    code === 4 ? 'bg-gray-200 border-gray-300' :
    code === 5 ? 'bg-gray-100 border-gray-300' :
    code === 7 ? 'bg-purple-100 border-purple-300' :
    code === 12 ? 'bg-yellow-100 border-yellow-300' :
    'bg-white border-gray-300';

  // pictogramas mínimos por código
  const mark = (() => {
    switch (code) {
      case 0:  return '✓';
      case 1:  return '●'; // caries
      case 2:  return '◐'; // obt + caries
      case 3:  return '◍'; // obt
      case 4:  return '×'; // perdido por caries
      case 5:  return '—'; // perdido otra causa
      case 6:  return '≡'; // fisura obturada
      case 7:  return '⌂'; // soporte/corona/implante
      case 8:  return '…'; // sin erupcionar
      case 9:  return '∅'; // no registrado
      case 11: return '∪'; // recesión
      case 12: return '⟲'; // endo
      case 13: return '⟂'; // instrumento
      case 14: return '∩'; // bolsas
      case 15: return '✸'; // fluorosis
      case 16: return '≈'; // alteraciones
      case 17: return 'Ø'; // endo-perio
      default: return '';
    }
  })();

  return (
    <div className={`inline-flex items-center justify-center w-8 h-8 rounded-lg border text-xs ${bg}`}>
      {mark}
    </div>
  )
};

type Snapshot = Record<string, number>; // { "11": 0, "12": 1, ... } códigos por diente

export default function OdontogramaDx({ patientId }: { patientId: string }) {
  const [map, setMap] = React.useState<Snapshot>({})
  const [saving, setSaving] = React.useState(false)
  const [loading, setLoading] = React.useState(true)

  // Carga el último snapshot para continuar
  React.useEffect(() => {
    (async () => {
      setLoading(true)
      const { data, error } = await supabase
        .from('odontograms')
        .select('id, snapshot')
        .eq('patient_id', patientId)
        .order('created_at', { ascending: false })
        .limit(1)
      if (!error && data && data[0]) {
        setMap(data[0].snapshot || {})
      }
      setLoading(false)
    })()
  }, [patientId])

  // Acciones
  const cycle = (tooth: string) => {
    // rota por lista (0 -> 1 -> 2 ... -> 0)
    const list = odontogramaCodes.map(c => c.value)
    const current = map[tooth] ?? 9 // por defecto "no registrado"
    const idx = list.indexOf(current)
    const next = list[(idx + 1) % list.length]
    setMap(prev => ({ ...prev, [tooth]: next }))
  }

  const setCode = (tooth: string, val: number) => {
    setMap(prev => ({ ...prev, [tooth]: val }))
  }

  const save = async () => {
    setSaving(true)
    try {
      const { error } = await supabase.from('odontograms').insert({
        patient_id: patientId,
        kind: 'diagnostico',
        snapshot: map,
      })
      if (error) throw error
      alert('Odontograma guardado')
    } catch (e: any) {
      alert(e.message || String(e))
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="card p-4">Cargando odontograma…</div>

  return (
    <div className="space-y-4">
      <div className="card p-4">
        <div className="flex items-center justify-between">
          <div className="font-semibold">Odontograma diagnóstico</div>
          <button className="btn" onClick={save} disabled={saving}>
            {saving ? 'Guardando…' : 'Guardar'}
          </button>
        </div>

        {/* Odontograma en dos filas (como en el PDF) */}
        <div className="mt-3 space-y-3">
          {fdiRows.map((row, i) => (
            <div key={i} className="grid grid-cols-16 gap-1 overflow-x-auto">
              {row.map((t) => (
                <div key={t} className="flex flex-col items-center gap-1">
                  <div className="text-[10px] text-gray-500">{t}</div>

                  {/* Casilla grande clickeable */}
                  <button
                    type="button"
                    onClick={() => cycle(t)}
                    className="w-12 h-12 rounded-2xl border flex items-center justify-center"
                    title={`${t}: ${odontogramaCodes.find(c => c.value === (map[t] ?? 9))?.label || ''}`}
                  >
                    <Icon code={map[t] ?? 9} />
                  </button>

                  {/* Selector de código */}
                  <select
                    className="input w-20 text-[11px]"
                    value={(map[t] ?? 9)}
                    onChange={(e) => setCode(t, Number(e.target.value))}
                  >
                    {odontogramaCodes.map(c => (
                      <option key={c.value} value={c.value}>{c.value} · {c.label}</option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Leyenda (con iconitos) */}
      <div className="card p-4">
        <div className="font-semibold mb-2">Leyenda</div>
        <div className="grid md:grid-cols-3 gap-x-6 gap-y-2 text-sm">
          {odontogramaCodes.map(c => (
            <div key={c.value} className="flex items-center gap-2">
              <Icon code={c.value} />
              <div className="text-gray-800">
                <span className="font-medium mr-1">{c.value}.</span>{c.label}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

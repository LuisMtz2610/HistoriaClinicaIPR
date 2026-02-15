'use client'
import * as React from 'react'
import { supabase } from '@/lib/supabase'

/** Orden FDI por filas como en la lámina */
const rowTop  = ['18','17','16','15','14','13','12','11','21','22','23','24','25','26','27','28']
const rowBottom = ['48','47','46','45','44','43','42','41','31','32','33','34','35','36','37','38']
const ALL_TEETH = [...rowTop, ...rowBottom]

/** Opciones de código (todas string para incluir 'T') */
export type Code = string
export const CODE_OPTIONS: { value: Code; label: string }[] = [
  { value: '0',  label: '0. Sano' },
  { value: '1',  label: '1. Con caries' },
  { value: '2',  label: '2. Obturado con caries' },
  { value: '3',  label: '3. Obturado sin caries' },
  { value: '4',  label: '4. Perdido por caries' },
  { value: '5',  label: '5. Perdido otra causa' },
  { value: '6',  label: '6. Fisura obturada' },
  { value: '7',  label: '7. Soporte/corona/implante' },
  { value: '8',  label: '8. Diente sin erupcionar' },
  { value: 'T',  label: 'T. Traumatismo (fractura)' },
  { value: '9',  label: '9. No registrado' },
  { value: '11', label: '11. Recesión gingival' },
  { value: '12', label: '12. Tratamiento de conductos' },
  { value: '13', label: '13. Instrumento separado' },
  { value: '14', label: '14. Bolsas periodontales' },
  { value: '15', label: '15. Fluorosis' },
  { value: '16', label: '16. Alteraciones morfológicas' },
  { value: '17', label: '17. Lesión endoperiodontal' },
]

type Snapshot = Record<string, Code>

export default function OdontogramaDxSelects({ patientId }: { patientId: string }) {
  const [map, setMap] = React.useState<Snapshot>(() =>
    Object.fromEntries(ALL_TEETH.map(t => [t, '9'])) as Snapshot // por defecto “No registrado”
  )
  const [loading, setLoading] = React.useState(true)
  const [saving, setSaving] = React.useState(false)

  // Carga último snapshot (usa columna 'state' que es la real en la tabla)
  React.useEffect(() => {
    (async () => {
      setLoading(true)
      const { data, error } = await supabase
        .from('odontograms')
        .select('state')
        .eq('patient_id', patientId)
        .order('created_at', { ascending: false })
        .limit(1)
      if (!error && data && data[0]?.state) {
        const snap = data[0].state as Snapshot
        setMap(prev => ({ ...prev, ...snap })) // completa faltantes con '9'
      }
      setLoading(false)
    })()
  }, [patientId])

  const setTooth = (tooth: string, code: Code) =>
    setMap(m => ({ ...m, [tooth]: code }))

  const clearAll = () =>
    setMap(Object.fromEntries(ALL_TEETH.map(t => [t, '9'])) as Snapshot)

  const save = async () => {
    setSaving(true)
    try {
      const { error } = await supabase.from('odontograms').insert({
        patient_id: patientId,
        state: map,          // columna real: state jsonb
        note: null,
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
      {/* Acciones */}
      <div className="flex flex-wrap gap-2">
        <button className="btn" onClick={save} disabled={saving}>
          {saving ? 'Guardando…' : 'Guardar'}
        </button>
        <button className="btn border" onClick={clearAll}>Limpiar todo (9)</button>
        <div className="text-sm text-gray-600 ml-auto">
          Selecciona el código para cada pieza dental.
        </div>
      </div>

      {/* Fila superior */}
      <div className="overflow-x-auto">
        <div className="text-sm font-medium mb-1">Arcada superior</div>
        <div className="grid gap-2"
             style={{ display: 'grid', gridTemplateColumns: 'repeat(16, minmax(120px, 1fr))' }}>
          {rowTop.map(t => (
            <div key={t} className="flex flex-col">
              <label className="text-xs text-gray-600 mb-1 text-center">{t}</label>
              <select
                className="input w-full"
                value={map[t] ?? '9'}
                onChange={(e) => setTooth(t, e.target.value)}
              >
                {CODE_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
          ))}
        </div>
      </div>

      {/* Fila inferior */}
      <div className="overflow-x-auto">
        <div className="text-sm font-medium mb-1">Arcada inferior</div>
        <div className="grid gap-2"
             style={{ display: 'grid', gridTemplateColumns: 'repeat(16, minmax(120px, 1fr))' }}>
          {rowBottom.map(t => (
            <div key={t} className="flex flex-col">
              <label className="text-xs text-gray-600 mb-1 text-center">{t}</label>
              <select
                className="input w-full"
                value={map[t] ?? '9'}
                onChange={(e) => setTooth(t, e.target.value)}
              >
                {CODE_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
          ))}
        </div>
      </div>

      {/* Leyenda compacta */}
      <div className="card p-3">
        <div className="font-semibold mb-2">Leyenda de códigos</div>
        <div className="grid md:grid-cols-2 gap-y-1 gap-x-6 text-sm">
          {CODE_OPTIONS.map(opt => (
            <div key={opt.value} className="text-gray-800">{opt.label}</div>
          ))}
        </div>
      </div>

      {/* Estilos de impresión */}
      <style jsx global>{`
        @media print {
          @page { size: A4 portrait; margin: 14mm; }
          .btn, a[href] { display: none !important; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          select { border: 1px solid #444 !important; }
        }
      `}</style>
    </div>
  )
}

'use client'
import { adultTeeth } from '@/lib/teeth'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function OdontogramaBasic({ patientId }:{ patientId: string }){
  const [map,setMap] = useState<Record<string,string>>({})
  const [saving,setSaving] = useState(false)

  const toggle = (t: string) => {
    setMap(prev => {
      const curr = prev[t]
      const next = !curr ? 'caries' : (curr === 'caries' ? 'sano' : 'caries')
      return { ...prev, [t]: next }
    })
  }

  const save = async () => {
    setSaving(true)
    try{
      const { data: u } = await supabase.auth.getUser()
      const { error } = await supabase.from('odontograms').insert({
        patient_id: patientId,
        author_id: u?.user?.id || null,
        kind: 'diagnostico',
        snapshot: map
      })
      if (error) throw error
      alert('Odontograma guardado')
      window.dispatchEvent(new Event('odontograma:changed'))
    }catch(e:any){
      alert(e.message || String(e))
    }finally{
      setSaving(false)
    }
  }

  return (
    <div className="card p-4">
      <div className="font-semibold mb-3">Odontograma diagnóstico (demo)</div>
      <div className="grid grid-cols-8 gap-2">
        {adultTeeth.map(t => (
          <button
            key={t}
            type="button"
            onClick={()=>toggle(t)}
            className={`rounded-xl border px-3 py-2 text-sm ${map[t]==='caries' ? 'bg-red-100 border-red-300' : map[t]==='sano' ? 'bg-green-100 border-green-300' : 'bg-white border-gray-300'}`}
            title={map[t] || '—'}
          >
            {t}
          </button>
        ))}
      </div>
      <div className="mt-3">
        <button className="btn" onClick={save} disabled={saving}>
          {saving ? 'Guardando…' : 'Guardar'}
        </button>
      </div>
    </div>
  )
}

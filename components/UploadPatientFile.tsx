'use client'
import { supabase } from '@/lib/supabase'
import { useState } from 'react'

export default function UploadPatientFile({ clinicId, patientId }:{clinicId:string, patientId:string}) {
  const [uploading, setUploading] = useState(false)
  const [kind, setKind] = useState('photo')

  const pickFile = () => document.getElementById('fileIn')?.click()

  const onChange = async (e:React.ChangeEvent<HTMLInputElement>)=>{
    const file = e.target.files?.[0]; if (!file) return
    setUploading(true)
    try{
      const path = `clinic_${clinicId}/patients/${patientId}/${Date.now()}_${file.name}`
      const up = await supabase.storage.from('clinical-files').upload(path,file,{ upsert:false })
      if (up.error) throw up.error
      const { data: u } = await supabase.auth.getUser()
      const ins = await supabase.from('files').insert({
        clinic_id: null,
        patient_id: patientId,
        uploaded_by: u?.user?.id || null,
        path,
        kind
      })
      if (ins.error) throw ins.error
      // Notifica a la lista para refrescar
      window.dispatchEvent(new Event('files:changed'))
    }catch(err:any){
      alert(err.message || String(err))
    }finally{
      setUploading(false)
      // Limpia el input
      const el = document.getElementById('fileIn') as HTMLInputElement | null
      if (el) el.value = ''
    }
  }
  return (
    <div className="flex items-center gap-3">
      <select className="input max-w-[200px]" value={kind} onChange={e=>setKind(e.target.value)}>
        <option value="photo">Foto</option>
        <option value="xray">Radiografía</option>
        <option value="consent">Consentimiento</option>
        <option value="doc">Documento</option>
      </select>
      <input id="fileIn" type="file" className="hidden" onChange={onChange} />
      <button type="button" className="btn" onClick={pickFile} disabled={uploading}>
        {uploading ? 'Subiendo...' : 'Subir'}
      </button>
    </div>
  )
}

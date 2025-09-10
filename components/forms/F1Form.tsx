'use client'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { supabase } from '@/lib/supabase'
import { useEffect, useState } from 'react'

const Schema = z.object({
  identificacion: z.object({
    nombre: z.string().min(2),
    apellidos: z.string().min(2),
    nacimiento: z.string().optional(),
    genero: z.enum(['M','F']).optional(),
    telefono: z.string().optional(),
  }),
  antecedentes: z.object({
    heredofamiliares: z.string().optional(),
    personalesPatologicos: z.string().optional(),
    personalesNoPatologicos: z.string().optional(),
    alergias: z.string().optional(),
  }),
  exploracion: z.object({
    signosVitales: z.object({
      fc: z.coerce.number().optional(),
      ta: z.string().optional(),
      fr: z.coerce.number().optional(),
      temp: z.coerce.number().optional(),
    })
  }),
  diagnostico: z.string().optional(),
  plan: z.string().optional(),
})

type SchemaType = z.infer<typeof Schema>

export default function F1Form({ patient }:{ patient: any }){
  const [saving, setSaving] = useState(false)

  const { register, handleSubmit, formState:{ errors }, reset, setValue } = useForm<SchemaType>({
    resolver: zodResolver(Schema),
    // Valores iniciales tomados de la ficha del paciente
    defaultValues: {
      identificacion: {
        nombre: patient?.first_name || '',
        apellidos: patient?.last_name || '',
        nacimiento: patient?.birth_date || undefined,
        genero: (patient?.gender as 'M'|'F'|undefined) || undefined,
        telefono: patient?.phone || undefined,
      },
      antecedentes: {
        alergias: patient?.allergies_summary || patient?.allergies || undefined
      },
      exploracion: { signosVitales: {} },
    }
  })

  // Si el paciente cambia (navegación rápida), refresca defaults
  useEffect(()=>{
    reset({
      identificacion: {
        nombre: patient?.first_name || '',
        apellidos: patient?.last_name || '',
        nacimiento: patient?.birth_date || undefined,
        genero: (patient?.gender as 'M'|'F'|undefined) || undefined,
        telefono: patient?.phone || undefined,
      },
      antecedentes: {
        alergias: patient?.allergies_summary || patient?.allergies || undefined
      },
      exploracion: { signosVitales: {} },
      diagnostico: undefined,
      plan: undefined,
    })
  }, [patient, reset])

  // Permite re-cargar manualmente (por si editaste la ficha y dejaste abierto el F-1)
  const cargarDesdeFicha = () => {
    // Rellena solo si están vacíos
    const apply = (path: any, value: any) => {
      if (value == null || value === '') return
      setValue(path, value, { shouldDirty: true })
    }
    apply('identificacion.nombre' as any, patient?.first_name)
    apply('identificacion.apellidos' as any, patient?.last_name)
    apply('identificacion.nacimiento' as any, patient?.birth_date)
    apply('identificacion.genero' as any, patient?.gender)
    apply('identificacion.telefono' as any, patient?.phone)
    apply('antecedentes.alergias' as any, patient?.allergies_summary || patient?.allergies)
    alert('Datos cargados desde la ficha del paciente.')
  }

  const onSubmit = async (values: SchemaType) => {
    setSaving(true)
    try{
      const { data: u } = await supabase.auth.getUser()
      const payload = {
        patient_id: patient.id,
        author_id: u?.user?.id || null,
        form_type: 'estomatologica_f1',
        data: values
      }
      const { error } = await supabase.from('clinical_forms').insert(payload)
      if (error) throw error
      alert('Historia F-1 guardada')
      window.dispatchEvent(new Event('forms:changed'))
    }catch(e:any){
      alert(e.message || String(e))
    }finally{
      setSaving(false)
    }
  }

  const FE = (msg?:string) => msg && <div className="text-xs text-red-600">{msg}</div>

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="flex items-center gap-2">
        <button type="button" onClick={cargarDesdeFicha} className="btn border">
          Cargar desde ficha
        </button>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="card p-4">
          <div className="font-semibold mb-2">Identificación</div>
          <div className="grid gap-2">
            <div>
              <label>Nombre</label>
              <input className="input" {...register('identificacion.nombre')}/>
              {FE(errors.identificacion?.nombre?.message)}
            </div>
            <div>
              <label>Apellidos</label>
              <input className="input" {...register('identificacion.apellidos')}/>
              {FE(errors.identificacion?.apellidos?.message)}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label>Nacimiento</label>
                <input type="date" className="input" {...register('identificacion.nacimiento')}/>
              </div>
              <div>
                <label>Género</label>
                <select className="input" {...register('identificacion.genero')}>
                  <option value="">—</option>
                  <option value="M">M</option>
                  <option value="F">F</option>
                </select>
              </div>
            </div>
            <div>
              <label>Teléfono</label>
              <input className="input" {...register('identificacion.telefono')}/>
            </div>
          </div>
        </div>

        <div className="card p-4">
          <div className="font-semibold mb-2">Antecedentes</div>
          <div className="grid gap-2">
            <div><label>Heredofamiliares</label><textarea className="textarea" {...register('antecedentes.heredofamiliares')}/></div>
            <div><label>Personales Patológicos</label><textarea className="textarea" {...register('antecedentes.personalesPatologicos')}/></div>
            <div><label>Personales No Patológicos</label><textarea className="textarea" {...register('antecedentes.personalesNoPatologicos')}/></div>
            <div><label>Alergias</label><textarea className="textarea" {...register('antecedentes.alergias')}/></div>
          </div>
        </div>
      </div>

      <div className="card p-4">
        <div className="font-semibold mb-2">Exploración — Signos Vitales</div>
        <div className="grid md:grid-cols-4 gap-2">
          <div><label>FC</label><input className="input" {...register('exploracion.signosVitales.fc')} placeholder="lpm"/></div>
          <div><label>TA</label><input className="input" {...register('exploracion.signosVitales.ta')} placeholder="mmHg"/></div>
          <div><label>FR</label><input className="input" {...register('exploracion.signosVitales.fr')} placeholder="rpm"/></div>
          <div><label>Temp</label><input className="input" {...register('exploracion.signosVitales.temp')} placeholder="°C"/></div>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="card p-4">
          <div className="font-semibold mb-2">Diagnóstico</div>
          <textarea className="textarea" {...register('diagnostico')}/>
        </div>
        <div className="card p-4">
          <div className="font-semibold mb-2">Plan</div>
          <textarea className="textarea" {...register('plan')}/>
        </div>
      </div>

      <button className="btn" disabled={saving}>{saving ? 'Guardando…' : 'Guardar F-1'}</button>
    </form>
  )
}

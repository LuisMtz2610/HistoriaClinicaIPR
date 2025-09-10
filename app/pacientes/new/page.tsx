'use client'
import * as React from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useForm } from 'react-hook-form'

type FormData = {
  first_name: string
  last_name: string
  gender?: 'M'|'F'|''
  birth_date?: string
  birth_state?: string
  birth_city?: string
  occupation?: string
  schooling?: string
  marital_status?: string

  address_street?: string
  address_ext_no?: string
  address_int_no?: string
  address_colony?: string
  address_municipality?: string
  address_state?: string

  phone?: string
  office_phone?: string
  email?: string

  family_doctor_name?: string
  family_doctor_phone?: string
  last_visit_date?: string
  last_visit_reason?: string

  allergies_summary?: string
  blood_type?: string
  rh_factor?: string
}

export default function NewPatientPage(){
  const { register, handleSubmit } = useForm<FormData>()
  const [saving, setSaving] = React.useState(false)
  const router = useRouter()

  const onSubmit = async (values: FormData) => {
    setSaving(true)
    try {
      const payload = {
        ...values,
        gender: values.gender || null,
        birth_date: values.birth_date || null,
        last_visit_date: values.last_visit_date || null,
      }
      const { data, error } = await supabase.from('patients').insert(payload).select('id').single()
      if (error) throw error
      alert('Paciente registrado')
      router.push(`/pacientes/${data.id}`)
    } catch (e:any) {
      alert(e.message || String(e))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      <h1 className="page-title">Nuevo paciente</h1>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Identificación */}
        <div className="card p-4">
          <div className="font-semibold mb-3">Identificación</div>
          <div className="grid md:grid-cols-2 gap-3">
            <div>
              <label>Nombre(s)</label>
              <input className="input" {...register('first_name', { required: true })}/>
            </div>
            <div>
              <label>Apellidos</label>
              <input className="input" {...register('last_name', { required: true })}/>
            </div>
            <div>
              <label>Género</label>
              <select className="input" defaultValue="" {...register('gender')}>
                <option value="">—</option>
                <option value="M">Masculino</option>
                <option value="F">Femenino</option>
              </select>
            </div>
            <div>
              <label>Fecha de nacimiento</label>
              <input type="date" className="input" {...register('birth_date')}/>
            </div>
            <div>
              <label>Lugar de nacimiento — Estado</label>
              <input className="input" {...register('birth_state')}/>
            </div>
            <div>
              <label>Lugar de nacimiento — Ciudad</label>
              <input className="input" {...register('birth_city')}/>
            </div>
            <div>
              <label>Ocupación</label>
              <input className="input" {...register('occupation')}/>
            </div>
            <div>
              <label>Escolaridad</label>
              <input className="input" {...register('schooling')}/>
            </div>
            <div>
              <label>Estado civil</label>
              <input className="input" {...register('marital_status')}/>
            </div>
          </div>
        </div>

        {/* Domicilio */}
        <div className="card p-4">
          <div className="font-semibold mb-3">Domicilio</div>
          <div className="grid md:grid-cols-3 gap-3">
            <div>
              <label>Calle</label>
              <input className="input" {...register('address_street')}/>
            </div>
            <div>
              <label>Núm. exterior</label>
              <input className="input" {...register('address_ext_no')}/>
            </div>
            <div>
              <label>Núm. interior</label>
              <input className="input" {...register('address_int_no')}/>
            </div>
            <div>
              <label>Colonia</label>
              <input className="input" {...register('address_colony')}/>
            </div>
            <div>
              <label>Municipio / Delegación</label>
              <input className="input" {...register('address_municipality')}/>
            </div>
            <div>
              <label>Estado</label>
              <input className="input" {...register('address_state')}/>
            </div>
          </div>
        </div>

        {/* Contacto */}
        <div className="card p-4">
          <div className="font-semibold mb-3">Contacto</div>
          <div className="grid md:grid-cols-3 gap-3">
            <div>
              <label>Teléfono</label>
              <input className="input" {...register('phone')}/>
            </div>
            <div>
              <label>Teléfono de oficina</label>
              <input className="input" {...register('office_phone')}/>
            </div>
            <div>
              <label>Email</label>
              <input className="input" type="email" {...register('email')}/>
            </div>
          </div>
        </div>

        {/* Médico familiar / Última consulta */}
        <div className="card p-4">
          <div className="font-semibold mb-3">Médico familiar y última consulta</div>
          <div className="grid md:grid-cols-2 gap-3">
            <div>
              <label>Nombre del médico familiar</label>
              <input className="input" {...register('family_doctor_name')}/>
            </div>
            <div>
              <label>Teléfono del médico familiar</label>
              <input className="input" {...register('family_doctor_phone')}/>
            </div>
            <div>
              <label>Fecha de la última consulta (médica u odontológica)</label>
              <input type="date" className="input" {...register('last_visit_date')}/>
            </div>
            <div>
              <label>Motivo de la última consulta</label>
              <input className="input" {...register('last_visit_reason')}/>
            </div>
          </div>
        </div>

        {/* Banderas clínicas resumidas (detalle se llena en F-1) */}
        <div className="card p-4">
          <div className="font-semibold mb-3">Datos clínicos resumidos</div>
          <div className="grid md:grid-cols-3 gap-3">
            <div>
              <label>Alergias (resumen)</label>
              <input className="input" placeholder="p. ej., penicilina" {...register('allergies_summary')}/>
            </div>
            <div>
              <label>Grupo sanguíneo</label>
              <input className="input" placeholder="p. ej., O" {...register('blood_type')}/>
            </div>
            <div>
              <label>Factor RH</label>
              <input className="input" placeholder="p. ej., +" {...register('rh_factor')}/>
            </div>
          </div>
          <div className="text-xs text-gray-500 mt-2">
            * El detalle de antecedentes, hábitos, interrogatorio por sistemas y signos vitales se captura en la Historia F-1.
          </div>
        </div>

        <button className="btn" disabled={saving}>
          {saving ? 'Guardando…' : 'Guardar paciente'}
        </button>
      </form>
    </div>
  )
}

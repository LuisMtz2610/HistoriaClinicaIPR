// components/patients/EditPatientModal.tsx
'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'

type Patient = {
  id: string
  first_name: string
  last_name: string
  birth_date: string | null // YYYY-MM-DD (DATE)
  sex: string | null
  phone: string | null
  email: string | null
  occupation: string | null
  schooling: string | null
  marital_status: string | null
  address_street: string | null
  address_ext_no: string | null
  address_int_no: string | null
  address_colony: string | null
  address_municipality: string | null
  address_state: string | null
  last_visit_date?: string | null
  // ¡NO incluir name_norm!
}

export default function EditPatientModal({
  patient,
  onClose,
  onSaved,
}: {
  patient: Patient
  onClose?: () => void
  onSaved?: () => void
}) {
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState<Patient>(patient)

  function set<K extends keyof Patient>(k: K, v: Patient[K]) {
    setForm((prev) => ({ ...prev, [k]: v }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)

    // Excluir columnas generadas/no editables como name_norm
    // y garantizar birth_date como string YYYY-MM-DD (o null)
    const {
      // @ts-expect-error: por si el objeto trae name_norm desde fuera
      name_norm,
      ...payload
    } = form

    if (payload.birth_date === '') (payload as any).birth_date = null
    if (payload.last_visit_date === '') (payload as any).last_visit_date = null

    const { error } = await supabase
      .from('patients')
      .update(payload) // 👈 Solo campos editables
      .eq('id', patient.id)

    setSaving(false)
    if (error) {
      alert(error.message)
      return
    }
    onSaved?.()
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/20 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-3xl rounded-2xl shadow-lg">
        <div className="flex items-center justify-between border-b p-4">
          <h2 className="font-semibold">Editar paciente</h2>
          <button onClick={onClose} className="px-3 py-1 rounded-xl bg-gray-100">Cerrar</button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* Identificación */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <label className="block">
              <span className="text-sm text-gray-600">Nombre(s)</span>
              <input
                className="mt-1 w-full border rounded-xl px-3 py-2"
                value={form.first_name || ''}
                onChange={(e) => set('first_name', e.target.value)}
              />
            </label>
            <label className="block">
              <span className="text-sm text-gray-600">Apellidos</span>
              <input
                className="mt-1 w-full border rounded-xl px-3 py-2"
                value={form.last_name || ''}
                onChange={(e) => set('last_name', e.target.value)}
              />
            </label>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <label className="block">
              <span className="text-sm text-gray-600">Fecha de nacimiento</span>
              <input
                type="date"
                className="mt-1 w-full border rounded-xl px-3 py-2"
                value={form.birth_date ?? ''}
                onChange={(e) => set('birth_date', e.target.value || null)} // string YYYY-MM-DD
              />
            </label>
            <label className="block">
              <span className="text-sm text-gray-600">Género</span>
              <select
                className="mt-1 w-full border rounded-xl px-3 py-2"
                value={form.sex ?? ''}
                onChange={(e) => set('sex', e.target.value || null)}
              >
                <option value="">—</option>
                <option value="M">Masculino</option>
                <option value="F">Femenino</option>
                <option value="X">Otro</option>
              </select>
            </label>
            <label className="block">
              <span className="text-sm text-gray-600">Estado civil</span>
              <input
                className="mt-1 w-full border rounded-xl px-3 py-2"
                value={form.marital_status ?? ''}
                onChange={(e) => set('marital_status', e.target.value || null)}
              />
            </label>
          </div>

          {/* Contacto */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <label className="block">
              <span className="text-sm text-gray-600">Teléfono</span>
              <input
                className="mt-1 w-full border rounded-xl px-3 py-2"
                value={form.phone ?? ''}
                onChange={(e) => set('phone', e.target.value || null)}
              />
            </label>
            <label className="block">
              <span className="text-sm text-gray-600">Email</span>
              <input
                type="email"
                className="mt-1 w-full border rounded-xl px-3 py-2"
                value={form.email ?? ''}
                onChange={(e) => set('email', e.target.value || null)}
              />
            </label>
          </div>

          {/* Domicilio */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <label className="block">
              <span className="text-sm text-gray-600">Calle</span>
              <input
                className="mt-1 w-full border rounded-xl px-3 py-2"
                value={form.address_street ?? ''}
                onChange={(e) => set('address_street', e.target.value || null)}
              />
            </label>
            <label className="block">
              <span className="text-sm text-gray-600">Núm. exterior</span>
              <input
                className="mt-1 w-full border rounded-xl px-3 py-2"
                value={form.address_ext_no ?? ''}
                onChange={(e) => set('address_ext_no', e.target.value || null)}
              />
            </label>
            <label className="block">
              <span className="text-sm text-gray-600">Núm. interior</span>
              <input
                className="mt-1 w-full border rounded-xl px-3 py-2"
                value={form.address_int_no ?? ''}
                onChange={(e) => set('address_int_no', e.target.value || null)}
              />
            </label>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <label className="block">
              <span className="text-sm text-gray-600">Colonia</span>
              <input
                className="mt-1 w-full border rounded-xl px-3 py-2"
                value={form.address_colony ?? ''}
                onChange={(e) => set('address_colony', e.target.value || null)}
              />
            </label>
            <label className="block">
              <span className="text-sm text-gray-600">Municipio / Delegación</span>
              <input
                className="mt-1 w-full border rounded-xl px-3 py-2"
                value={form.address_municipality ?? ''}
                onChange={(e) => set('address_municipality', e.target.value || null)}
              />
            </label>
            <label className="block">
              <span className="text-sm text-gray-600">Estado</span>
              <input
                className="mt-1 w-full border rounded-xl px-3 py-2"
                value={form.address_state ?? ''}
                onChange={(e) => set('address_state', e.target.value || null)}
              />
            </label>
          </div>

          {/* Otros */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <label className="block">
              <span className="text-sm text-gray-600">Escolaridad</span>
              <input
                className="mt-1 w-full border rounded-xl px-3 py-2"
                value={form.schooling ?? ''}
                onChange={(e) => set('schooling', e.target.value || null)}
              />
            </label>
            <label className="block">
              <span className="text-sm text-gray-600">Ocupación</span>
              <input
                className="mt-1 w-full border rounded-xl px-3 py-2"
                value={form.occupation ?? ''}
                onChange={(e) => set('occupation', e.target.value || null)}
              />
            </label>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button type="button" className="px-3 py-2 rounded-xl bg-gray-100" onClick={onClose}>
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 rounded-xl bg-emerald-600 text-white disabled:opacity-60"
            >
              {saving ? 'Guardando…' : 'Guardar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

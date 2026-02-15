'use client'

import useSWR from 'swr'
import { supabase } from '@/lib/supabase'
import AppointmentWhatsAppReminder from '@/components/AppointmentWhatsAppReminder'

type Props = { appointmentId: string }

export default function AppointmentWaReminderById({ appointmentId }: Props) {
  const { data, error, isLoading } = useSWR(['appt', appointmentId], async () => {
    const { data, error } = await supabase
      .from('appointments')
      .select('id, starts_at, patients:patient_id (first_name, last_name, phone)')
      .eq('id', appointmentId)
      .maybeSingle()
    if (error) throw error
    return data as any
  })

  if (isLoading) return <div className="text-sm text-gray-500">Cargando recordatorio…</div>
  if (error || !data) return <div className="text-sm text-red-600">No se pudo cargar la cita.</div>

  const p = data.patients
  const name = p ? `${p.first_name} ${p.last_name}` : 'Paciente'
  const phone = p?.phone || ''

  return (
    <AppointmentWhatsAppReminder
      patientName={name}
      patientPhone={phone}
      whenISO={data.starts_at}
      showCloudButton={true}
    />
  )
}

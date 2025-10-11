'use client'

import { useEffect, useState } from 'react'
import { buildWaLink } from '@/components/wa/build-wa-link'
import { normalizeMxPhone } from '@/components/wa/phone-utils'

type Props = {
  patientName: string
  patientPhone: string
  whenISO: string // fecha/hora de la cita en ISO (ej. '2025-10-09T18:00:00-06:00')
  clinicName?: string
  className?: string
  messageOverride?: string
}

/**
 * Componente iOS-friendly para enviar recordatorio por WhatsApp.
 * Preconstruye el wa.me link y renderiza un <a href> clicable
 * para que Safari no bloquee la apertura.
 */
export default function AppointmentWhatsAppReminder({
  patientName,
  patientPhone,
  whenISO,
  clinicName = 'Clínica Odontológica Integral',
  className,
  messageOverride,
}: Props) {
  const [waUrl, setWaUrl] = useState('')
  const [ready, setReady] = useState(false)

  useEffect(() => {
    try {
      const dt = new Date(whenISO)
      const fecha = dt.toLocaleDateString()
      const hora = dt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      const msg = messageOverride || 
        `Hola ${patientName}, te recordamos tu cita el ${fecha} a las ${hora} en ${clinicName}. ` +
        `Por favor confirma con un 👍 o responde para reprogramar.`
      const { intl } = normalizeMxPhone(patientPhone)
      const link = buildWaLink({ phone: intl, text: msg })
      setWaUrl(link)
      setReady(true)
    } catch {
      setWaUrl('')
      setReady(false)
    }
  }, [patientName, patientPhone, whenISO, clinicName, messageOverride])

  return (
    <a
      href={ready ? waUrl : '#'}
      target="_blank"
      rel="noopener noreferrer"
      className={`px-3 py-2 rounded-xl text-white ${ready ? 'bg-emerald-600' : 'bg-emerald-600/50 cursor-not-allowed'} ${className || ''}`}
      onClick={(e) => { if (!ready) e.preventDefault() }}
      title={ready ? 'Enviar recordatorio por WhatsApp' : 'Teléfono o fecha inválidos'}
    >
      Recordatorio WhatsApp
    </a>
  )
}

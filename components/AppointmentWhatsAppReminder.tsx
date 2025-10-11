'use client'

import { useEffect, useState, useTransition } from 'react'
import { normalizeMxPhone } from '@/components/wa/phone-utils'
import { buildWaLink } from '@/components/wa/build-wa-link'

type CloudArgs = {
  endpoint?: string // default: /api/whatsapp/send
  payload: any
}

async function sendViaCloud({ endpoint = '/api/whatsapp/send', payload }: CloudArgs) {
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) throw new Error(`Cloud send failed: ${res.status}`)
  return res.json().catch(() => ({}))
}

type Props = {
  patientName: string
  patientPhone: string
  whenISO: string
  clinicName?: string
  className?: string
  messageOverride?: string
  showCloudButton?: boolean
  cloudEndpoint?: string
}

/**
 * Botón iOS‑friendly que abre WhatsApp con <a href> (modo link)
 * y opcionalmente permite enviar por API Cloud (modo cloud).
 */
export default function AppointmentWhatsAppReminder({
  patientName,
  patientPhone,
  whenISO,
  clinicName = 'Clínica Odontológica Integral',
  className,
  messageOverride,
  showCloudButton = true,
  cloudEndpoint = '/api/whatsapp/send',
}: Props) {
  const [waUrl, setWaUrl] = useState('')
  const [ready, setReady] = useState(false)
  const [pending, start] = useTransition()
  const [status, setStatus] = useState<string | null>(null)

  useEffect(() => {
    try {
      const dt = new Date(whenISO)
      const fecha = dt.toLocaleDateString()
      const hora = dt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      const text =
        messageOverride ||
        `Hola ${patientName}, te recordamos tu cita el ${fecha} a las ${hora} en ${clinicName}. ` +
        `Por favor confirma con un 👍 o responde para reprogramar.`

      const { intl } = normalizeMxPhone(patientPhone)
      setWaUrl(buildWaLink({ phone: intl, text }))
      setReady(true)
    } catch {
      setWaUrl('')
      setReady(false)
    }
  }, [patientName, patientPhone, whenISO, clinicName, messageOverride])

  return (
    <div className={className}>
      <div className="flex gap-2 items-center">
        <a
          href={ready ? waUrl : '#'}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => { if (!ready) e.preventDefault() }}
          className={`px-3 py-2 rounded-xl text-white ${ready ? 'bg-emerald-600' : 'bg-emerald-600/50 cursor-not-allowed'}`}
          title={ready ? 'Abrir WhatsApp' : 'Falta teléfono o fecha'}
        >
          Recordatorio WhatsApp
        </a>

        {showCloudButton && (
          <button
            className="px-3 py-2 rounded-xl bg-gray-800 text-white disabled:opacity-60"
            disabled={pending}
            onClick={() => {
              start(async () => {
                try {
                  const payload = { to: patientPhone, whenISO, patientName, clinicName, kind: 'appointment-reminder' }
                  const r = await sendViaCloud({ endpoint: cloudEndpoint, payload })
                  setStatus(r?.status ? String(r.status) : 'enviado')
                } catch (e: any) {
                  setStatus('error: ' + (e?.message || ''))
                }
              })
            }}
          >
            {pending ? 'Enviando…' : 'Enviar (Cloud)'}
          </button>
        )}
      </div>
      {status && <div className="text-xs text-gray-500 mt-1">Estado: {status}</div>}
    </div>
  )
}

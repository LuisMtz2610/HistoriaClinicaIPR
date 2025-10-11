// iOS/PWA-robust version: tries whatsapp:// first (app), then falls back to wa.me
'use client'

import { useEffect, useMemo, useState, useTransition } from 'react'

function onlyDigits(s: string = '') {
  return (s || '').replace(/\D+/g, '')
}
function normalizeMxPhone(phone: string = '') {
  const d = onlyDigits(phone)
  const last10 = d.slice(-10)
  return { national10: last10, intl: `52${last10}` }
}
function buildWaWebLink({ phone, text }: { phone: string; text: string }) {
  const digits = (phone || '').replace(/\D+/g, '')
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`
}
function buildWaDirect({ phone, text }: { phone: string; text: string }) {
  // whatsapp://send?phone=5255...&text=...
  const digits = (phone || '').replace(/\D+/g, '')
  return `whatsapp://send?phone=${digits}&text=${encodeURIComponent(text)}`
}
function isIOS() {
  if (typeof navigator === 'undefined') return false
  return /iPad|iPhone|iPod/.test(navigator.userAgent) || 
         (navigator.platform === 'MacIntel' && (navigator.maxTouchPoints || 0) > 1)
}
function isStandalone() {
  if (typeof window === 'undefined') return false
  return (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) || (window.navigator as any).standalone
}

async function sendViaCloud({ endpoint = '/api/whatsapp/send', payload }: { endpoint?: string; payload: any }) {
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
  const [waWeb, setWaWeb] = useState('')
  const [waDirect, setWaDirect] = useState('')
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
      setWaWeb(buildWaWebLink({ phone: intl, text }))
      setWaDirect(buildWaDirect({ phone: intl, text }))
      setReady(true)
    } catch {
      setWaWeb('')
      setWaDirect('')
      setReady(false)
    }
  }, [patientName, patientPhone, whenISO, clinicName, messageOverride])

  const handleClick = (e: React.MouseEvent) => {
    if (!ready) { e.preventDefault(); return }
    // iOS + PWA standalone: prefer direct scheme, then fallback to wa.me
    const useDirect = isIOS() || isStandalone()
    try {
      if (useDirect) {
        // Navegación inmediata en el gesto del usuario
        window.location.href = waDirect
        // Fallback a wa.me por si el esquema no responde (timeout corto)
        setTimeout(() => {
          try { window.location.href = waWeb } catch {}
        }, 700)
        e.preventDefault()
      } else {
        // En navegadores normales, usa wa.me en la misma pestaña
        window.location.href = waWeb
        e.preventDefault()
      }
      setStatus('abierto')
    } catch {
      setStatus('error al abrir')
    }
  }

  return (
    <div className={className}>
      <div className="flex gap-2 items-center">
        <button
          onClick={handleClick}
          className={`px-3 py-2 rounded-xl text-white ${ready ? 'bg-emerald-600' : 'bg-emerald-600/50 cursor-not-allowed'}`}
          disabled={!ready}
          title={ready ? 'Abrir WhatsApp' : 'Falta teléfono o fecha'}
        >
          Recordatorio WhatsApp
        </button>

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
      {/* Para depuración opcional:
      <div className="text-[10px] text-gray-400 mt-1 break-all">web: {waWeb}</div>
      <div className="text-[10px] text-gray-400 break-all">direct: {waDirect}</div>
      */}
    </div>
  )
}

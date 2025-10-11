// iOS/PWA robust + props restored (showCloudButton, cloudEndpoint)
'use client'

import { useEffect, useState, useTransition } from 'react'

function onlyDigits(s: string = '') { return (s || '').replace(/\D+/g, '') }
function normalizeMxPhone(phone: string = '') {
  const d = onlyDigits(phone); const last10 = d.slice(-10)
  return { national10: last10, intl: `52${last10}` }
}
function waWebLink(digits: string, text: string) {
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`
}
function waApiLink(digits: string, text: string) {
  return `https://api.whatsapp.com/send?phone=${digits}&text=${encodeURIComponent(text)}`
}
function waDirectLink(digits: string, text: string) {
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
  debug?: boolean
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
  debug = false,
  showCloudButton = true,
  cloudEndpoint = '/api/whatsapp/send',
}: Props) {
  const [primaryHref, setPrimaryHref] = useState<string>('')
  const [fallback1, setFallback1] = useState<string>('')
  const [fallback2, setFallback2] = useState<string>('')
  const [ready, setReady] = useState(false)
  const [pending, start] = useTransition()
  const [status, setStatus] = useState<string | null>(null)

  useEffect(() => {
    try {
      const dt = new Date(whenISO)
      const fecha = dt.toLocaleDateString()
      const hora = dt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      const text = messageOverride || `Hola ${patientName}, te recordamos tu cita el ${fecha} a las ${hora} en ${clinicName}. Por favor confirma con un 👍 o responde para reprogramar.`
      const { intl } = normalizeMxPhone(patientPhone)
      const direct = waDirectLink(intl, text)
      const web = waWebLink(intl, text)
      const api = waApiLink(intl, text)
      const preferDirect = isIOS() || isStandalone()

      setPrimaryHref(preferDirect ? direct : web)
      setFallback1(preferDirect ? web : api)
      setFallback2(api)
      setReady(true)
    } catch {
      setPrimaryHref(''); setFallback1(''); setFallback2(''); setReady(false)
    }
  }, [patientName, patientPhone, whenISO, clinicName, messageOverride])

  const onAnchorClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (!ready) { e.preventDefault(); return }
    const isDirect = primaryHref.startsWith('whatsapp://')
    if (isDirect) {
      const t1 = setTimeout(() => { try { window.location.href = fallback1 } catch {} }, 800)
      const t2 = setTimeout(() => { try { window.location.href = fallback2 } catch {} }, 1800)
      const onHidden = () => { clearTimeout(t1); clearTimeout(t2); document.removeEventListener('visibilitychange', onHidden) }
      document.addEventListener('visibilitychange', onHidden)
    }
  }

  return (
    <div className={className}>
      <a
        href={ready ? primaryHref : '#'}
        onClick={onAnchorClick}
        target="_self"
        rel="external"
        className={`px-3 py-2 rounded-xl text-white ${ready ? 'bg-emerald-600' : 'bg-emerald-600/50 cursor-not-allowed'}`}
        aria-disabled={!ready}
      >
        Recordatorio WhatsApp
      </a>
      {showCloudButton && (
        <button
          className="ml-2 px-3 py-2 rounded-xl bg-gray-800 text-white disabled:opacity-60"
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
      { (debug || status) && (
        <div className="text-[10px] text-gray-500 mt-1 break-all">
          {status ? `Estado: ${status}` : null}
          {debug ? (<>
            <div>primary: {primaryHref}</div>
            <div>fallback1: {fallback1}</div>
            <div>fallback2: {fallback2}</div>
          </>) : null}
        </div>
      )}
    </div>
  )
}

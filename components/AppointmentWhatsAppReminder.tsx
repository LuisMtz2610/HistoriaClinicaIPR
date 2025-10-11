// iOS/PWA robust (anchor-based): whatsapp:// primary on iOS/PWA, fallback to wa.me then api.whatsapp.com
'use client'

import { useEffect, useState } from 'react'

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

type Props = {
  patientName: string
  patientPhone: string
  whenISO: string
  clinicName?: string
  className?: string
  messageOverride?: string
  debug?: boolean
}

export default function AppointmentWhatsAppReminder({
  patientName,
  patientPhone,
  whenISO,
  clinicName = 'Clínica Odontológica Integral',
  className,
  messageOverride,
  debug = false,
}: Props) {
  const [primaryHref, setPrimaryHref] = useState<string>('')
  const [fallback1, setFallback1] = useState<string>('')
  const [fallback2, setFallback2] = useState<string>('')
  const [ready, setReady] = useState(false)

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

  // Anchor-based open + JS fallbacks
  const onAnchorClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (!ready) { e.preventDefault(); return }
    // If primary is direct scheme, schedule fallbacks in case scheme doesn't resolve
    const isDirect = primaryHref.startsWith('whatsapp://')
    if (isDirect) {
      // allow default navigation to whatsapp:// (do NOT preventDefault)
      // schedule fallback to wa.me after 800ms if nothing happened
      const t1 = setTimeout(() => {
        try { window.location.href = fallback1 } catch {}
      }, 800)
      // schedule second fallback to api.whatsapp.com after 1800ms
      const t2 = setTimeout(() => {
        try { window.location.href = fallback2 } catch {}
      }, 1800)
      // Clean up timers if page is hidden (navigation succeeded)
      const onHidden = () => { clearTimeout(t1); clearTimeout(t2); document.removeEventListener('visibilitychange', onHidden) }
      document.addEventListener('visibilitychange', onHidden)
    } else {
      // Primary is web link; no need to prevent default or schedule
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
      {debug && ready && (
        <div className="mt-2 text-[10px] text-gray-500 break-all">
          primary: {primaryHref}<br/>
          fallback1: {fallback1}<br/>
          fallback2: {fallback2}
        </div>
      )}
    </div>
  )
}

'use client'

import { useEffect, useMemo, useState, useTransition } from 'react'
import { buildQuotePrintUrlKit, buildWaLinkKit, sendWhatsAppCloudKit } from '@/app/quotes/[id]/kit-wa-actions'

type Props = {
  quoteId: string
  patientPhone?: string
  mode?: 'link' | 'cloud'
  defaultMessage?: string
  className?: string
}

/**
 * FIX iOS/Safari:
 * - En iPhone/iPad, abrir WhatsApp DEBE suceder directamente en el gesto del usuario.
 * - Si llamamos window.open DESPUÉS de await/async, Safari lo bloquea.
 * - Solución: preconstruimos el waUrl con useEffect y renderizamos un <a href={waUrl} target="_blank">.
 *   El usuario hace click directamente en el <a>, evitando el bloqueo.
 */
export default function ShareWhatsAppButtonKit({
  quoteId,
  patientPhone = '',
  mode = 'link',
  defaultMessage = 'Te comparto tu presupuesto',
  className,
}: Props) {
  const [phone, setPhone] = useState(patientPhone)
  const [pending, start] = useTransition()
  const [status, setStatus] = useState<string | null>(null)

  // waUrl preconstruido para el modo 'link'
  const [waUrl, setWaUrl] = useState<string>('')

  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        const url = await buildQuotePrintUrlKit(quoteId)
        const wa = await buildWaLinkKit({ phone, message: defaultMessage, url })
        if (alive) setWaUrl(wa || '')
      } catch (e) {
        if (alive) setWaUrl('')
      }
    })()
    return () => { alive = false }
  }, [quoteId, phone, defaultMessage])

  // Render
  return (
    <div className={className}>
      <div className="flex items-center gap-2">
        <input
          className="border rounded px-2 py-1 w-44"
          placeholder="Teléfono (10 dígitos)"
          value={phone}
          onChange={e => setPhone(e.target.value)}
        />

        {mode === 'cloud' ? (
          <button
            onClick={() => {
              start(async () => {
                const url = await buildQuotePrintUrlKit(quoteId)
                const res = await sendWhatsAppCloudKit({ toPhone: phone, text: defaultMessage, linkUrl: url })
                setStatus(JSON.stringify(res))
              })
            }}
            disabled={pending || !phone}
            className="px-3 py-2 rounded-xl shadow text-white bg-emerald-600 disabled:opacity-50"
          >
            {pending ? 'Enviando…' : 'Enviar por WhatsApp'}
          </button>
        ) : (
          // LINK MODE -> <a href> para que el navegador abra WhatsApp directamente en el gesto
          <a
            href={waUrl || '#'}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => {
              if (!waUrl || !phone) {
                e.preventDefault()
              } else {
                setStatus('opened')
              }
            }}
            className={`px-3 py-2 rounded-xl shadow text-white ${(!waUrl || !phone) ? 'bg-emerald-600/50 cursor-not-allowed' : 'bg-emerald-600'}`}
          >
            Enviar por WhatsApp
          </a>
        )}
      </div>

      {status && <p className="text-xs text-gray-500 mt-1">Estado: {status}</p>}
    </div>
  )
}

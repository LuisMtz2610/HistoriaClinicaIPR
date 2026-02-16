'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

function toE164(raw: string, cc = '52') {
  const d = (raw || '').replace(/\D/g, '')
  if (!d) return ''
  return d.startsWith(cc) ? d : cc + d
}

function buildWAMsg(folio: string, patientName: string, total: string, clinicName: string) {
  return (
    `🦷 *${clinicName}*\n` +
    `Dra. Isabel Paván Romero\n\n` +
    `Hola ${patientName}, adjuntamos su presupuesto:\n\n` +
    `📋 *Folio:* ${folio}\n` +
    `💰 *Total:* ${total}\n\n` +
    `Para aceptarlo o cualquier duda, contáctenos.\n` +
    `Puede imprimir o guardar su presupuesto desde el enlace que le compartimos.`
  )
}

interface Props {
  quoteId: string
  folio?: string
  patientName?: string
  patientPhone?: string
  total?: string
}

export default function PrintActions({
  quoteId,
  folio = '',
  patientName = 'Paciente',
  patientPhone = '',
  total = '',
}: Props) {
  const router = useRouter()
  const [waState, setWaState] = useState<'idle' | 'sending' | 'ok' | 'error'>('idle')

  const clinic = 'Clínica Odontológica Integral'
  const CC = process.env.NEXT_PUBLIC_COUNTRY_PREFIX || '52'

  async function sendWhatsApp() {
    if (!patientPhone) {
      alert('El paciente no tiene teléfono registrado.\nAgrégalo desde su ficha y vuelve a intentar.')
      return
    }
    setWaState('sending')
    const phone = toE164(patientPhone, CC)
    const text  = buildWAMsg(folio || quoteId.slice(0, 8), patientName, total, clinic)

    try {
      // Intentar API interna primero
      const res  = await fetch('/api/whatsapp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneE164: phone, text }),
      })
      const json = await res.json()
      if (json.ok || json.fallback_url) {
        if (json.fallback_url) window.open(json.fallback_url, '_blank', 'noopener,noreferrer')
        setWaState('ok')
        return
      }
    } catch {}

    // Fallback directo wa.me
    const url = `https://wa.me/${phone}?text=${encodeURIComponent(text)}`
    window.open(url, '_blank', 'noopener,noreferrer')
    setWaState('ok')
  }

  function downloadPDF() {
    // En navegadores modernos window.print() con destino PDF es el estándar
    // También podemos usar media=print para forzar diálogo de guardado
    window.print()
  }

  return (
    <div className="flex flex-wrap gap-2 items-center no-print">
      {/* Regresar */}
      <button
        type="button"
        onClick={() => router.push(`/quotes/${quoteId}`)}
        className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 text-sm font-medium transition"
      >
        ← Regresar
      </button>

      {/* WhatsApp */}
      <button
        type="button"
        onClick={sendWhatsApp}
        disabled={waState === 'sending'}
        className={[
          'flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold transition',
          waState === 'ok'
            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
            : waState === 'error'
            ? 'bg-rose-50 text-rose-600 border border-rose-200'
            : 'bg-green-600 text-white hover:bg-green-700 shadow-sm',
        ].join(' ')}
      >
        {waState === 'sending' ? (
          <><span className="animate-spin text-base">⏳</span> Enviando…</>
        ) : waState === 'ok' ? (
          <>✅ ¡Enviado!</>
        ) : (
          <>💬 Enviar por WhatsApp</>
        )}
      </button>

      {/* Descargar PDF */}
      <button
        type="button"
        onClick={downloadPDF}
        className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-brand text-white text-sm font-semibold hover:bg-brand-dark transition shadow-sm"
      >
        📄 Descargar PDF
      </button>

      {/* Imprimir */}
      <button
        type="button"
        onClick={() => window.print()}
        className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-gray-300 text-gray-700 text-sm font-semibold hover:bg-gray-50 transition"
      >
        🖨️ Imprimir
      </button>

      {!patientPhone && (
        <span className="text-xs text-amber-600 font-medium">
          ⚠ Sin teléfono — no se puede enviar por WhatsApp
        </span>
      )}

      <style>{`@media print { .no-print { display: none !important; } }`}</style>
    </div>
  )
}

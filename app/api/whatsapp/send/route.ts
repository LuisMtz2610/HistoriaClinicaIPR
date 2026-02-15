// app/api/whatsapp/send/route.ts
// Proxy hacia la Edge Function wa-reminders (modo manual/confirmacion)
// con fallback a wa.me si la Cloud API no está configurada.

import { NextResponse } from 'next/server'

function toE164(raw: string, cc = '52'): string {
  const d = (raw || '').replace(/\D/g, '')
  if (!d) return ''
  if (d.length >= 12) return d
  if (d.startsWith(cc)) return d
  return cc + d
}

function buildMsg(patientName: string, whenISO: string, clinicName: string) {
  const d     = new Date(whenISO)
  const fecha = d.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' })
  const hora  = d.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })
  return (
    `🔔 *Recordatorio de cita*\n\n` +
    `Hola ${patientName}, le recordamos su cita en *${clinicName}*:\n\n` +
    `📅 ${fecha}\n🕐 ${hora}\n\n` +
    `Si necesita reprogramar, por favor avísenos.`
  )
}

export async function POST(req: Request) {
  const body = await req.json()
  const TOKEN    = process.env.WHATSAPP_TOKEN
  const PHONE_ID = process.env.WHATSAPP_PHONE_ID
  const CC       = process.env.COUNTRY_PREFIX || process.env.NEXT_PUBLIC_COUNTRY_PREFIX || '52'

  // ── Normalizar payload ──────────────────────────────────
  // Formato A: { phoneE164, text }               (legacy)
  // Formato B: { to, whenISO, patientName, clinicName, kind }
  // Formato C: { appointmentId, mode }            (delega a Edge Function)
  let phoneE164 = ''
  let text      = ''

  if (body.phoneE164) {
    phoneE164 = toE164(body.phoneE164, CC)
    text      = body.text || ''
  } else if (body.to) {
    phoneE164 = toE164(body.to, CC)
    text      = buildMsg(body.patientName || 'Paciente', body.whenISO, body.clinicName || 'Clínica')
  } else {
    return NextResponse.json({ ok: false, reason: 'bad_payload' }, { status: 400 })
  }

  if (!phoneE164) {
    return NextResponse.json({ ok: false, reason: 'invalid_phone' }, { status: 400 })
  }

  // ── Sin token → devolver wa.me URL para que el cliente abra ──
  if (!TOKEN || !PHONE_ID) {
    const encoded = encodeURIComponent(text)
    return NextResponse.json({
      ok: false,
      reason: 'no_token',
      fallback_url: `https://wa.me/${phoneE164}?text=${encoded}`,
    }, { status: 501 })
  }

  // ── Enviar vía WhatsApp Cloud API ─────────────────────
  try {
    const resp = await fetch(`https://graph.facebook.com/v20.0/${PHONE_ID}/messages`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: phoneE164,
        type: 'text',
        text: { body: text },
      }),
    })
    const data = await resp.json()
    if (!resp.ok) {
      console.error('WA Cloud API error', data)
      return NextResponse.json({ ok: false, error: data }, { status: 502 })
    }
    return NextResponse.json({ ok: true, via: 'api', data })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message }, { status: 500 })
  }
}

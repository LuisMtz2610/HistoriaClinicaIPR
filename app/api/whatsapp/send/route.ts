import { NextResponse } from 'next/server'

/** Formatea un número de teléfono a E.164 (sin el '+') */
function toE164(raw: string, cc = '52'): string {
  const digits = (raw || '').replace(/\D/g, '')
  if (!digits) return ''
  // Si ya incluye el country code completo (≥ 12 dígitos para MX)
  if (digits.length >= 12) return digits
  if (digits.startsWith(cc)) return digits
  return cc + digits
}

export async function POST(req: Request) {
  const body = await req.json()

  const TOKEN    = process.env.WHATSAPP_TOKEN
  const PHONE_ID = process.env.WHATSAPP_PHONE_ID
  const CC       = process.env.COUNTRY_PREFIX || process.env.NEXT_PUBLIC_COUNTRY_PREFIX || '52'

  if (!TOKEN || !PHONE_ID) {
    // No está configurado: el cliente usa wa.me como fallback.
    return NextResponse.json({ ok: false, reason: 'no_token' }, { status: 501 })
  }

  // ----- Normalización de payload -----
  // Formato A (legacy, desde citas/[id]/page.tsx):  { phoneE164, text }
  // Formato B (nuevo, desde AppointmentWhatsAppReminder):
  //   { to, whenISO, patientName, clinicName, kind }
  let phoneE164: string
  let text: string

  if (body.phoneE164) {
    // Formato A – usar tal cual
    phoneE164 = toE164(body.phoneE164, CC)
    text = body.text || ''
  } else if (body.to) {
    // Formato B – construir el mensaje aquí
    phoneE164 = toE164(body.to, CC)
    const dt     = body.whenISO ? new Date(body.whenISO) : null
    const fecha  = dt ? dt.toLocaleDateString('es-MX') : '—'
    const hora   = dt ? dt.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }) : '—'
    const clinic = body.clinicName || 'Clínica Odontológica Integral'
    const name   = body.patientName || 'Paciente'
    text = `Hola ${name}, te recordamos tu cita el ${fecha} a las ${hora} en ${clinic}. Por favor confirma con un 👍 o responde para reprogramar.`
  } else {
    return NextResponse.json({ ok: false, reason: 'bad_payload' }, { status: 400 })
  }

  if (!phoneE164) {
    return NextResponse.json({ ok: false, reason: 'invalid_phone' }, { status: 400 })
  }

  try {
    const resp = await fetch(`https://graph.facebook.com/v19.0/${PHONE_ID}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: phoneE164,
        type: 'text',
        text: { body: text },
      }),
    })

    const data = await resp.json()
    if (!resp.ok) {
      console.error('WA error', data)
      return NextResponse.json({ ok: false, error: data }, { status: 500 })
    }

    return NextResponse.json({ ok: true, status: 'enviado', data })
  } catch (e: any) {
    console.error(e)
    return NextResponse.json({ ok: false, error: e?.message }, { status: 500 })
  }
}

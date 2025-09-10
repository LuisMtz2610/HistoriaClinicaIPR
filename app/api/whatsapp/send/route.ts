import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  const { phoneE164, text } = await req.json() as { phoneE164: string; text: string }

  const TOKEN = process.env.WHATSAPP_TOKEN
  const PHONE_ID = process.env.WHATSAPP_PHONE_ID

  if (!TOKEN || !PHONE_ID) {
    // No está configurado: el cliente debe usar wa.me fallback.
    return NextResponse.json({ ok: false, reason: 'no_token' }, { status: 501 })
  }

  try {
    const resp = await fetch(`https://graph.facebook.com/v19.0/${PHONE_ID}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: phoneE164,            // E.164, ej. 5212291234567
        type: 'text',
        text: { body: text }
      })
    })

    const data = await resp.json()
    if (!resp.ok) {
      console.error('WA error', data)
      return NextResponse.json({ ok: false, error: data }, { status: 500 })
    }

    return NextResponse.json({ ok: true, data })
  } catch (e: any) {
    console.error(e)
    return NextResponse.json({ ok: false, error: e?.message }, { status: 500 })
  }
}

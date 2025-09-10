'use server';
import 'server-only'
import { headers } from 'next/headers'
const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN;
const WHATSAPP_PHONE_ID = process.env.WHATSAPP_PHONE_ID;
const COUNTRY_PREFIX = process.env.COUNTRY_PREFIX || '52';
export async function buildQuotePrintUrlKit(id: string) {
  const h = headers();
  const host = h.get('x-forwarded-host') || h.get('host') || '';
  const proto = h.get('x-forwarded-proto') || 'https';
  const base = `${proto}://${host}`;
  return `${base}/quotes/${id}/print`;
}
export async function buildWaLinkKit({ phone, message, url }: { phone: string, message?: string, url?: string }) {
  const ms = new URLSearchParams();
  if (message) ms.set('text', url ? `${message}\n${url}` : message);
  const digits = phone.replace(/\D/g, '');
  const e164 = digits.startsWith(COUNTRY_PREFIX) ? digits : COUNTRY_PREFIX + digits;
  const qs = ms.toString();
  return `https://wa.me/${e164}${qs ? `?${qs}` : ''}`;
}
export async function sendWhatsAppCloudKit({ toPhone, text, linkUrl }: { toPhone: string, text?: string, linkUrl?: string }) {
  if (!WHATSAPP_TOKEN || !WHATSAPP_PHONE_ID) return { ok: false, reason: 'missing_token' };
  const digits = toPhone.replace(/\D/g, '');
  const to = digits.startsWith(COUNTRY_PREFIX) ? digits : COUNTRY_PREFIX + digits;
  const res = await fetch(`https://graph.facebook.com/v21.0/${WHATSAPP_PHONE_ID}/messages`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${WHATSAPP_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ messaging_product: 'whatsapp', to, type: 'text', text: { body: text ? `${text}\n${linkUrl || ''}` : (linkUrl || '') } })
  });
  return await res.json();
}

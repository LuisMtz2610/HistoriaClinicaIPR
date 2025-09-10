'use client';
import { useState, useTransition } from 'react';
import { buildQuotePrintUrlKit, buildWaLinkKit, sendWhatsAppCloudKit } from '@/app/quotes/[id]/kit-wa-actions';
type Props = { quoteId: string; patientPhone?: string; mode?: 'link' | 'cloud'; defaultMessage?: string; className?: string; }
export default function ShareWhatsAppButtonKit({ quoteId, patientPhone = '', mode = 'link', defaultMessage = 'Te comparto tu presupuesto', className }: Props) {
  const [phone, setPhone] = useState(patientPhone);
  const [pending, start] = useTransition();
  const [status, setStatus] = useState<string | null>(null);
  const onClick = () => {
    start(async () => {
      const url = await buildQuotePrintUrlKit(quoteId);
      if (mode === 'cloud') {
        const res = await sendWhatsAppCloudKit({ toPhone: phone, text: defaultMessage, linkUrl: url });
        setStatus(JSON.stringify(res));
      } else {
        const wa = await buildWaLinkKit({ phone, message: defaultMessage, url });
        window.open(wa, '_blank'); setStatus('opened');
      }
    });
  };
  return (
    <div className={className}>
      <div className="flex items-center gap-2">
        <input className="border rounded px-2 py-1 w-44" placeholder="Teléfono (10 dígitos)" value={phone} onChange={e => setPhone(e.target.value)} />
        <button onClick={onClick} disabled={pending || !phone} className="px-3 py-2 rounded-xl shadow text-white bg-emerald-600 disabled:opacity-50">
          {pending ? 'Enviando…' : 'Enviar por WhatsApp'}
        </button>
      </div>
      {status && <p className="text-xs text-gray-500 mt-1">Estado: {status}</p>}
    </div>
  );
}

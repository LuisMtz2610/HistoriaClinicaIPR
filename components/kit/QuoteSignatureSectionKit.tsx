
'use client';
import SignaturePadKit from '@/components/kit/SignaturePadKit';
export default function QuoteSignatureSectionKit({ patientId, quoteId }: { patientId: string, quoteId: string }) {
  return (
    <div className="mt-6 border rounded-2xl p-4">
      <h3 className="text-sm font-semibold mb-2">Firma de conformidad del paciente</h3>
      <SignaturePadKit patientId={patientId} consentId={`quote-${quoteId}`} />
    </div>
  );
}

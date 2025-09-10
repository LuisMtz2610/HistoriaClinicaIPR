'use client';
import SignaturePadKit from '@/components/kit/SignaturePadKit';

export default function ConsentSignatureSectionKit({
  patientId,
  consentId,
  onSaved,
}: {
  patientId: string;
  consentId: string;
  onSaved?: (path: string) => void | Promise<void>;
}) {
  return (
    <div className="mt-2">
      <SignaturePadKit
        patientId={patientId}
        consentId={consentId}
        onSaved={onSaved}
      />
    </div>
  );
}

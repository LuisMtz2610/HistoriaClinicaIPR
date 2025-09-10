'use client';
import MobileCaptureKit from '@/components/kit/MobileCaptureKit';
import { useState } from 'react';
export default function PatientFilesPanelKit({ patientId }: { patientId: string }) {
  const [last, setLast] = useState<string | null>(null);
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Archivos</h3>
      <MobileCaptureKit patientId={patientId} onUploaded={(p)=>setLast(p)} />
      {last && <div className="text-xs text-gray-500">Último archivo: {last}</div>}
    </div>
  );
}

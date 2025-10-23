'use client';
import Link from 'next/link';

type Props = {
  patientId: string;
  aId?: string | null;
  bId?: string | null;
  labelList?: string;
  labelCompare?: string;
};

export default function PatientOdontogramActions({
  patientId,
  aId = null,
  bId = null,
  labelList = 'Odontogramas',
  labelCompare = 'Comparar odontogramas',
}: Props) {
  if (!patientId) return null;
  const compareHref = (aId && bId)
    ? `/pacientes/${patientId}/odontogramas/compare?a=${aId}&b=${bId}`
    : null;
  return (
    <div className="flex items-center gap-2">
      <Link href={`/pacientes/${patientId}/odontogramas`} className="btn">{labelList}</Link>
      {compareHref && <Link href={compareHref} className="btn">{labelCompare}</Link>}
    </div>
  );
}

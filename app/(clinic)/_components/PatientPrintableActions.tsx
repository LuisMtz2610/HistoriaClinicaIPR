"use client";
import Link from "next/link";

export default function PatientPrintableActions({ patientId }: { patientId: string }) {
  const q = `?patient_id=${patientId}`;
  return (
    <div className="flex flex-wrap gap-2">
      <Link className="px-3 py-2 rounded bg-emerald-600 text-white" href={`/prescriptions/new${q}`}>Nueva Receta</Link>
      <Link className="px-3 py-2 rounded bg-sky-600 text-white" href={`/radiology-orders/new${q}`}>Solicitud RX</Link>
      <Link className="px-3 py-2 rounded bg-indigo-600 text-white" href={`/lab-orders/new${q}`}>Solicitud Lab</Link>
      <Link className="px-3 py-2 rounded bg-amber-600 text-white" href={`/consents/new${q}`}>Consentimiento</Link>
      <Link className="px-3 py-2 rounded border" href={`/pacientes/${patientId}/printables`}>Historial de impresos</Link>
    </div>
  );
}

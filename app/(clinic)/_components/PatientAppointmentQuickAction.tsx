"use client";
import Link from "next/link";

export default function PatientAppointmentQuickAction({ patientId }: { patientId: string }){
  const q = `?patient_id=${patientId}`;
  return (
    <div className="flex gap-2">
      <Link className="px-3 py-2 rounded bg-pink-600 text-white" href={`/citas/new${q}`}>
        Agendar cita
      </Link>
    </div>
  );
}

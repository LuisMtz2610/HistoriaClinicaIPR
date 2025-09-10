'use client';
export default function AddToCalendarButtonKit({ appointmentId, className }: { appointmentId: string, className?: string }) {
  const url = `/api/ics-kit/${appointmentId}`;
  return (
    <a href={url} className={`px-3 py-2 rounded-xl shadow bg-indigo-600 text-white ${className||''}`}>
      Añadir al calendario (.ics)
    </a>
  );
}

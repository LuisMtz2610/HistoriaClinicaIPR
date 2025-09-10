export default function SignatureBlock({
  patientName,
  doctorName,
}: {
  patientName?: string | null;
  doctorName?: string | null;
}) {
  return (
    <div className="grid grid-cols-2 gap-8 mt-12">
      <div>
        <div className="border-t pt-2 text-center">
          {patientName || "Paciente / Tutor"}
        </div>
      </div>
      <div>
        <div className="border-t pt-2 text-center">
          {doctorName || "Cirujano Dentista"}
        </div>
      </div>
    </div>
  );
}

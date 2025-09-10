import Image from "next/image";
import Link from "next/link";

export default function Page() {
  return (
    <div className="grid gap-6 md:grid-cols-2">
      <div className="card p-6">
        <h1 className="page-title mb-2">Bienvenida</h1>
        <p className="text-gray-700">
          Sistema básico para gestionar pacientes, historias clínicas y archivos.
        </p>
        <div className="mt-6 flex gap-3">
          <Link href="/pacientes" className="btn">Ver Pacientes</Link>
          <Link href="/pacientes/new" className="btn bg-brand-light">Agregar Paciente</Link>
        </div>
      </div>
      <div className="card p-0 overflow-hidden">
        <Image src="/banner.png" alt="Banner" width={2000} height={800}/>
      </div>
    </div>
  )
}

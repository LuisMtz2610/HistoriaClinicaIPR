export default function ClinicLetterhead() {
  return (
    <header className="mb-4">
      <div className="flex items-center gap-3">
        <img src="/logo.png" alt="Clínica Odontológica Integral" className="h-12 w-12 rounded-full" />
        <div>
          <div className="font-semibold text-lg">Clínica Odontológica Integral</div>
          <div className="text-sm leading-tight">
            Dra. Isabel Paván Romero — Cirujano Dentista (Céd. Prof. 5454329)<br/>
            Especialidad en Rehabilitación Bucal — Maestría en Rehabilitación Oral (Céd. Prof. 9319256)<br/>
            Universidad Veracruzana
          </div>
        </div>
      </div>
      <hr className="mt-3"/>
      <style jsx global>{`
        @media print { @page { size: A4 portrait; margin: 14mm; } }
      `}</style>
    </header>
  )
}

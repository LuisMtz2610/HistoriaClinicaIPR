'use client'

export default function PrintActions() {
  return (
    <button
      onClick={() => window.print()}
      className="px-4 py-2 rounded-xl bg-teal-600 text-white hover:bg-teal-700"
    >
      Imprimir / Guardar PDF
    </button>
  )
}

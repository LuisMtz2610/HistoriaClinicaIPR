'use client'

import { useRouter } from 'next/navigation'

export default function PrintActions({ quoteId }: { quoteId: string }) {
  const router = useRouter()

  return (
    <div className="flex gap-2">
      <button
        type="button"
        onClick={() => router.push(`/quotes/${quoteId}`)}
        className="px-4 py-2 rounded-xl bg-gray-200 text-gray-900 hover:bg-gray-300"
      >
        Regresar
      </button>

      <button
        type="button"
        onClick={() => window.print()}
        className="px-4 py-2 rounded-xl bg-teal-600 text-white hover:bg-teal-700"
      >
        Imprimir / Guardar PDF
      </button>
    </div>
  )
}

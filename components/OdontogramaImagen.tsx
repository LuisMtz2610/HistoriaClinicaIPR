'use client'
import * as React from 'react'
import Image from 'next/image'

/**
 * Muestra la lámina base del odontograma desde /public.
 * Por defecto busca: /odontograma/diagnostico-base.png
 */
export default function OdontogramaImagen({
  src = '/odontograma/diagnostico-base.png',
  width = 1400,
  height = 800,
}: {
  src?: string
  width?: number
  height?: number
}) {
  return (
    <figure className="w-full overflow-hidden rounded-xl border bg-white">
      <Image
        src={src}
        alt="Odontograma diagnóstico (lámina)"
        width={width}
        height={height}
        className="w-full h-auto"
        priority
      />
      <figcaption className="sr-only">Odontograma diagnóstico</figcaption>

      <style jsx global>{`
        @media print {
          img { max-width: 100% !important; height: auto !important; }
          @page { size: A4 portrait; margin: 14mm; }
        }
      `}</style>
    </figure>
  )
}

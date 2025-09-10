'use client'
import * as React from 'react'

const LEFT = [
  [0, 'Sano'],
  [1, 'Con caries'],
  [2, 'Obturado con caries'],
  [3, 'Obturado sin caries'],
  [4, 'Perdido como resultado por caries'],
  [5, 'Perdido por cualquier otro motivo'],
  [6, 'Fisura obturada'],
  [7, 'Soporte de puente, corona, funda o implante'],
  [8, 'Diente sin erupcionar'],
] as const

const RIGHT = [
  ['T', 'Traumatismo (fractura)'],
  [9, 'No registrado'],
  [11, 'Recesión gingival'],
  [12, 'Tratamiento de conductos'],
  [13, 'Instrumento separado en un conducto'],
  [14, 'Bolsas periodontales'],
  [15, 'Fluorosis'],
  [16, 'Alteraciones de forma, número, tamaño, textura, posición'],
  [17, 'Lesión endoperiodontal'],
] as const

export default function OdontoLegend() {
  return (
    <div className="grid md:grid-cols-2 gap-6 text-sm mt-4">
      <div className="space-y-1">
        {LEFT.map(([k, txt]) => (
          <div key={String(k)} className="flex gap-2">
            <span className="w-6 text-right font-medium">{String(k)}.</span>
            <span className="text-gray-800">{txt}</span>
          </div>
        ))}
      </div>
      <div className="space-y-1">
        {RIGHT.map(([k, txt]) => (
          <div key={String(k)} className="flex gap-2">
            <span className="w-6 text-right font-medium">{String(k)}.</span>
            <span className="text-gray-800">{txt}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

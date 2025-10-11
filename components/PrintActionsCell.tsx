'use client'

import Link from 'next/link'

export default function PrintActionsCell({
  module,
  id,
  label = 'Imprimir',
  className = 'text-emerald-700 hover:underline',
}: {
  module: string
  id: string
  label?: string
  className?: string
}) {
  const href = `/${module}/${id}/print`
  return <Link href={href} className={className}>{label}</Link>
}

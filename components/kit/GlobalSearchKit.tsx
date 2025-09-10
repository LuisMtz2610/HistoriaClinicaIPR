'use client'
import { useState, useTransition } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { searchGlobal, type Hit } from '@/lib/search-kit'

export default function GlobalSearchKit() {
  const [q, setQ] = useState('')
  const [hits, setHits] = useState<Hit[]>([])
  const [isPending, startTransition] = useTransition()

  async function onSearch(term: string) {
    // evita llamadas vacías o muy cortas
    if (!term || term.trim().length < 2) {
      setHits([])
      return
    }
    const res = await searchGlobal(supabase, term.trim())
    setHits(res)
  }

  return (
    <div className="relative w-full max-w-xl">
      <input
        value={q}
        onChange={(e) => {
          const v = e.target.value
          setQ(v)
          startTransition(() => onSearch(v))
        }}
        placeholder="Buscar paciente, presupuesto, cita o nota…"
        className="w-full input"
      />

      {/* resultados */}
      {(isPending || hits.length > 0) && (
        <div className="absolute z-50 mt-2 w-full rounded-xl border bg-white shadow">
          {isPending && (
            <div className="p-3 text-sm text-neutral-500">Buscando…</div>
          )}
          {!isPending && hits.length === 0 && q.trim().length >= 2 && (
            <div className="p-3 text-sm text-neutral-500">Sin resultados</div>
          )}
          {!isPending &&
            hits.length > 0 &&
            hits.map((h) => (
              <Link
                key={`${h.type}:${h.id}`}
                href={h.href}
                className="block px-3 py-2 hover:bg-neutral-50"
              >
                <div className="text-sm font-medium">
                  {h.title}
                  <span className="ml-2 inline-block rounded bg-neutral-100 px-1.5 py-0.5 text-[11px] text-neutral-600">
                    {h.type}
                  </span>
                </div>
                {h.subtitle && (
                  <div className="text-xs text-neutral-500">{h.subtitle}</div>
                )}
              </Link>
            ))}
        </div>
      )}
    </div>
  )
}

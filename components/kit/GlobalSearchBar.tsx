'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

type Patient = {
  id: string
  first_name: string
  last_name: string
  email: string | null
  phone: string | null
}

function sanitizeForOr(val: string) {
  // Quitar comas y paréntesis que rompen el or() de PostgREST
  return val.replace(/[(),]/g, '').trim()
}

export default function GlobalSearchBar() {
  const [q, setQ] = useState('')
  const [results, setResults] = useState<Patient[]>([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const abortRef = useRef<AbortController | null>(null)

  const term = useMemo(() => q.trim(), [q])

  useEffect(() => {
    if (!term || term.length < 2) {
      setResults([])
      setOpen(!!term)
      return
    }

    const timer = setTimeout(async () => {
      setLoading(true)
      setOpen(true)

      // Cancelar petición previa si sigue en vuelo
      if (abortRef.current) abortRef.current.abort()
      const controller = new AbortController()
      abortRef.current = controller

      const safe = sanitizeForOr(term)

      // 1) Búsqueda básica: first_name/last_name/email con OR
      const { data, error } = await supabase
        .from('patients')
        .select('id, first_name, last_name, email, phone')
        .or(`first_name.ilike.*${safe}*,last_name.ilike.*${safe}*,email.ilike.*${safe}*`)
        .order('last_name', { ascending: true })
        .limit(12)

      if (!error && data && data.length > 0) {
        setResults(data as Patient[])
        setLoading(false)
        return
      }

      // 2) Fallback cuando el término tiene dos palabras: nombre + apellido (AND)
      const parts = safe.split(/\s+/).filter(Boolean)
      if (parts.length >= 2) {
        const [a, b] = parts
        const second = await supabase
          .from('patients')
          .select('id, first_name, last_name, email, phone')
          .ilike('first_name', `%${a}%`)
          .ilike('last_name', `%${b}%`)
          .order('last_name', { ascending: true })
          .limit(12)

        if (!second.error && second.data) {
          setResults(second.data as Patient[])
        } else {
          setResults([])
        }
      } else {
        setResults([])
      }

      setLoading(false)
    }, 220)

    return () => clearTimeout(timer)
  }, [term])

  return (
    <div className="relative w-[420px] max-w-full">
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onFocus={() => setOpen(true)}
        placeholder="Buscar paciente, folio, diagnóstico…"
        className="w-full border rounded-xl px-3 py-2 focus:outline-none"
      />

      {open && term.length >= 2 && (
        <div
          className="absolute z-50 mt-1 w-full bg-white rounded-xl shadow border max-h-80 overflow-auto"
          onMouseDown={(e) => e.preventDefault()} // evita blur al hacer click
        >
          {loading && (
            <div className="p-3 text-sm text-gray-500">Buscando…</div>
          )}

          {!loading && results.length === 0 && (
            <div className="p-3 text-sm text-gray-500">Sin resultados</div>
          )}

          {!loading &&
            results.map((p) => (
              <Link
                key={p.id}
                href={`/pacientes/${p.id}`}
                className="block px-3 py-2 hover:bg-gray-50"
                onClick={() => setOpen(false)}
              >
                <div className="font-medium">
                  {p.last_name}, {p.first_name}
                </div>
                <div className="text-xs text-gray-500">
                  {p.phone ?? '—'} {p.email ? `· ${p.email}` : ''}
                </div>
              </Link>
            ))}
        </div>
      )}
    </div>
  )
}

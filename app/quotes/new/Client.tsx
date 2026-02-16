'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

type Patient = { id: string; first_name: string; last_name: string; phone?: string | null; email?: string | null }

async function createQuote(patientId: string) {
  const { data, error } = await supabase.from('quotes')
    .insert({ patient_id: patientId, discount: 0, tax: 0, subtotal: 0, total: 0, terms: '' })
    .select('id').single()
  if (error) throw error
  return data!.id as string
}

export default function NewQuotePage() {
  const router         = useRouter()
  const sp             = useSearchParams()
  const patientIdFromUrl = sp.get('patientId')

  const [loading,  setLoading]  = useState<boolean>(!!patientIdFromUrl)
  const [error,    setError]    = useState<string | null>(null)
  const [q,        setQ]        = useState('')
  const [results,  setResults]  = useState<Patient[]>([])
  const [selected, setSelected] = useState<Patient | null>(null)
  const [focused,  setFocused]  = useState(false)
  const [creating, setCreating] = useState(false)

  // Si viene patientId — crea directo y redirige
  useEffect(() => {
    if (!patientIdFromUrl) return
    ;(async () => {
      setLoading(true); setError(null)
      try {
        const id = await createQuote(patientIdFromUrl)
        router.replace(`/quotes/${id}`)
      } catch (e: any) {
        setError(e.message); setLoading(false)
      }
    })()
  }, [patientIdFromUrl, router])

  async function searchPatients(term: string) {
    setQ(term)
    if (!term.trim()) { setResults([]); return }
    const { data } = await supabase.from('patients')
      .select('id, first_name, last_name, phone, email')
      .or(`first_name.ilike.%${term}%,last_name.ilike.%${term}%,phone.ilike.%${term}%,email.ilike.%${term}%`)
      .order('last_name').limit(12)
    setResults((data as any) || [])
  }

  async function handleCreate() {
    if (!selected) return
    setCreating(true); setError(null)
    try {
      const id = await createQuote(selected.id)
      router.replace(`/quotes/${id}`)
    } catch (e: any) {
      setError(e.message); setCreating(false)
    }
  }

  // Pantalla de carga cuando viene patientId
  if (loading) return (
    <div className="flex items-center justify-center h-60 gap-3 text-gray-400">
      <div style={{ width: 20, height: 20, borderRadius: '50%', border: '2.5px solid #2B9C93', borderTopColor: 'transparent', animation: 'spin 0.7s linear infinite' }}/>
      Creando presupuesto…
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  return (
    <div className="max-w-xl mx-auto space-y-5">

      {/* Header */}
      <div className="flex items-center gap-3">
        <div>
          <h1 className="page-title">Nuevo presupuesto</h1>
          <p className="text-xs text-gray-400 mt-0.5">Selecciona el paciente para comenzar</p>
        </div>
        <Link href="/quotes" className="btn ml-auto text-sm">← Volver</Link>
      </div>

      {/* Error */}
      {error && (
        <div className="px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700">⚠ {error}</div>
      )}

      {/* Buscador */}
      <div className="card p-5 space-y-4">
        <div className="text-sm font-bold text-gray-700">¿Para qué paciente?</div>

        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
          <input
            className="input pl-9 text-sm w-full"
            placeholder="Buscar por nombre, teléfono o email…"
            value={q}
            onChange={e => searchPatients(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setTimeout(() => setFocused(false), 150)}
            autoComplete="off"
          />
          {q && (
            <button onClick={() => { setQ(''); setResults([]); setSelected(null) }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-lg">×</button>
          )}
        </div>

        {/* Resultados */}
        {focused && results.length > 0 && (
          <div className="border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
            {results.map(p => (
              <button key={p.id} type="button" onClick={() => { setSelected(p); setQ(`${p.last_name}, ${p.first_name}`); setResults([]) }}
                className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-brand/5 transition border-b border-gray-50 last:border-0 text-left ${selected?.id === p.id ? 'bg-brand/5' : ''}`}>
                <div className="w-9 h-9 rounded-xl bg-brand/10 flex items-center justify-center font-bold text-brand text-sm shrink-0">
                  {p.first_name[0]}{p.last_name[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-gray-800">{p.last_name}, {p.first_name}</div>
                  <div className="flex gap-3 text-xs text-gray-400 mt-0.5">
                    {p.phone && <span>📞 {p.phone}</span>}
                    {p.email && <span className="truncate">✉️ {p.email}</span>}
                  </div>
                </div>
                {selected?.id === p.id && <span className="text-brand text-sm shrink-0">✓</span>}
              </button>
            ))}
          </div>
        )}

        {focused && q.trim() && results.length === 0 && (
          <div className="text-center py-6 text-gray-400">
            <div className="text-3xl mb-2">🔍</div>
            <div className="text-sm">Sin resultados para "{q}"</div>
          </div>
        )}

        {/* Paciente seleccionado */}
        {selected && (
          <div className="flex items-center gap-3 p-3 rounded-xl bg-brand/5 border border-brand/20">
            <div className="w-10 h-10 rounded-xl bg-brand/20 flex items-center justify-center font-bold text-brand text-sm shrink-0">
              {selected.first_name[0]}{selected.last_name[0]}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-gray-800">{selected.last_name}, {selected.first_name}</div>
              {selected.phone && <div className="text-xs text-gray-400">{selected.phone}</div>}
            </div>
            <button onClick={() => { setSelected(null); setQ('') }} className="text-gray-400 hover:text-gray-600 text-lg">×</button>
          </div>
        )}

        <button
          onClick={handleCreate}
          disabled={!selected || creating}
          className={`btn w-full text-sm ${!selected || creating ? 'opacity-60 cursor-not-allowed' : ''}`}>
          {creating ? 'Creando…' : selected ? `Crear presupuesto para ${selected.first_name}` : 'Selecciona un paciente primero'}
        </button>
      </div>

      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}

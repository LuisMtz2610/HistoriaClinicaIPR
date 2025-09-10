'use client';

// app/quotes/new/page.tsx

'use client'
import { useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'

type Patient = {
  id: string
  first_name: string
  last_name: string
  phone?: string | null
  email?: string | null
}

export default function NewQuotePage() {
  const router = useRouter()
  const sp = useSearchParams()
  const patientIdFromUrl = sp.get('patientId')

  const [loading, setLoading] = useState<boolean>(!!patientIdFromUrl)
  const [error, setError] = useState<string | null>(null)

  // Estado para selector de paciente (cuando no viene patientId)
  const [q, setQ] = useState('')
  const [results, setResults] = useState<Patient[]>([])
  const [selected, setSelected] = useState<Patient | null>(null)
  const canCreate = useMemo(() => !!selected, [selected])

  // Si hay patientId en la URL, crea directamente y redirige
  useEffect(() => {
    if (!patientIdFromUrl) return
    ;(async () => {
      setLoading(true)
      setError(null)
      const { data, error } = await supabase
        .from('quotes')
        .insert({
          patient_id: patientIdFromUrl,
          discount: 0,
          tax: 0,
          subtotal: 0,
          total: 0,
          terms: '',
        })
        .select('id')
        .single()
      if (error) {
        setError(error.message)
        setLoading(false)
        return
      }
      router.replace(`/quotes/${data!.id}`)
    })()
  }, [patientIdFromUrl, router])

  // Búsqueda de pacientes cuando NO viene patientId
  async function searchPatients(term: string) {
    setQ(term)
    if (!term.trim()) {
      setResults([])
      return
    }
    // Busca por nombre, apellido, teléfono o email
    const { data, error } = await supabase
      .from('patients')
      .select('id, first_name, last_name, phone, email')
      .or(
        `first_name.ilike.%${term}%,last_name.ilike.%${term}%,phone.ilike.%${term}%,email.ilike.%${term}%`
      )
      .order('last_name', { ascending: true })
      .limit(20)

    if (error) {
      setError(error.message)
      return
    }
    setResults((data as any) || [])
  }

  async function createForSelected() {
    if (!selected) return
    setLoading(true)
    const { data, error } = await supabase
      .from('quotes')
      .insert({
        patient_id: selected.id,
        discount: 0,
        tax: 0,
        subtotal: 0,
        total: 0,
        terms: '',
      })
      .select('id')
      .single()
    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }
    router.replace(`/quotes/${data!.id}`)
  }

  if (loading) return <div className="p-4">Creando presupuesto…</div>

  // Modo selector (cuando no se envió patientId)
  return (
    <main className="container mx-auto px-4 py-6 space-y-4">
      <h1 className="text-xl font-semibold">Nuevo presupuesto</h1>

      {error && <div className="p-3 rounded-md bg-red-50 text-red-700">{error}</div>}

      <p className="text-sm text-gray-600">
        No se proporcionó <code>patientId</code>. Selecciona un paciente para crear el presupuesto.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
        <input
          className="md:col-span-8 border rounded-xl px-3 py-2"
          placeholder="Buscar paciente por nombre, teléfono o email…"
          value={q}
          onChange={(e) => searchPatients(e.target.value)}
        />
      </div>

      <div className="rounded-xl border">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left border-b bg-gray-50">
              <th className="p-2">Paciente</th>
              <th className="p-2">Teléfono</th>
              <th className="p-2">Email</th>
              <th className="p-2">Seleccionar</th>
            </tr>
          </thead>
          <tbody>
            {results.map((p) => (
              <tr key={p.id} className="border-b">
                <td className="p-2">{p.last_name}, {p.first_name}</td>
                <td className="p-2">{p.phone || '—'}</td>
                <td className="p-2">{p.email || '—'}</td>
                <td className="p-2">
                  <button
                    className={`px-3 py-1 rounded-xl ${
                      selected?.id === p.id ? 'bg-emerald-700 text-white' : 'bg-emerald-600 text-white'
                    }`}
                    onClick={() => setSelected(p)}
                  >
                    {selected?.id === p.id ? 'Seleccionado' : 'Seleccionar'}
                  </button>
                </td>
              </tr>
            ))}
            {results.length === 0 && (
              <tr><td className="p-3 text-gray-500" colSpan={4}>Sin resultados</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex gap-2">
        <button
          disabled={!canCreate}
          onClick={createForSelected}
          className={`px-4 py-2 rounded-xl text-white ${canCreate ? 'bg-emerald-600' : 'bg-gray-400 cursor-not-allowed'}`}
        >
          Crear presupuesto
        </button>
      </div>
    </main>
  )
}

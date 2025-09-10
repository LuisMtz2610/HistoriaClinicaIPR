'use client'
import { useEffect, useState } from 'react'

export default function ConnectivityDebugPage() {
  const [restStatus, setRestStatus] = useState<any>(null)
  const [apiStatus, setApiStatus] = useState<any>(null)
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const rest = `${url}/rest/v1/patients?select=id&limit=1`

  useEffect(() => {
    // Browser → PostgREST
    fetch(rest, { headers: { apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!}` } })
      .then(async r => setRestStatus({ ok: r.ok, status: r.status, text: await r.text() }))
      .catch(e => setRestStatus({ ok: false, error: String(e) }))

    // Browser → Next API → Supabase (server)
    fetch('/api/ping-supabase')
      .then(async r => setApiStatus({ ok: r.ok, status: r.status, json: await r.json() }))
      .catch(e => setApiStatus({ ok: false, error: String(e) }))
  }, [])

  return (
    <main className="container mx-auto p-6 space-y-6">
      <h1 className="text-xl font-semibold">Conectividad Supabase — Diagnóstico</h1>

      <section className="p-4 rounded-xl bg-white shadow">
        <h2 className="font-medium">Browser → PostgREST</h2>
        <p className="text-xs text-gray-500">GET {rest}</p>
        <pre className="text-xs bg-gray-50 p-3 rounded">{JSON.stringify(restStatus, null, 2)}</pre>
      </section>

      <section className="p-4 rounded-xl bg-white shadow">
        <h2 className="font-medium">Browser → /api/ping-supabase → Server → Supabase</h2>
        <pre className="text-xs bg-gray-50 p-3 rounded">{JSON.stringify(apiStatus, null, 2)}</pre>
      </section>

      <p className="text-xs text-gray-500">Si la primera falla y la segunda funciona, el bloqueo es en el navegador/red. Si ambas fallan, revisa env o estado del proyecto.</p>
    </main>
  )
}

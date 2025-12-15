'use client'

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'

type ServiceRow = {
  id: string
  name: string
  unit_price: number
}

function money(n: any) {
  const v = Number(n || 0)
  return v.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' })
}

export default function ServicesCatalogPage() {
  const [rows, setRows] = useState<ServiceRow[]>([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)

  const [name, setName] = useState('')
  const [price, setPrice] = useState<number>(0)

  async function load() {
    setLoading(true)
    setErr(null)
    const { data, error } = await supabase
      .from('services_catalog')
      .select('id,name,unit_price')
      .order('name', { ascending: true })
    if (error) {
      setErr(error.message)
      setRows([])
    } else {
      setRows((data as any) || [])
    }
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  const totalServices = useMemo(() => rows.length, [rows])

  async function addService(e: React.FormEvent) {
    e.preventDefault()
    const n = name.trim()
    if (!n) return

    // Upsert por nombre (requiere unique index en name)
    const { error } = await supabase
      .from('services_catalog')
      .upsert({ name: n, unit_price: Number(price || 0) }, { onConflict: 'name' })

    if (error) {
      alert(error.message)
      return
    }
    setName('')
    setPrice(0)
    await load()
  }

  async function updateRow(id: string, patch: Partial<ServiceRow>) {
    const { error } = await supabase.from('services_catalog').update(patch).eq('id', id)
    if (error) {
      alert(error.message)
      return
    }
    await load()
  }

  async function removeRow(id: string) {
    if (!confirm('¿Eliminar este servicio del catálogo?')) return
    const { error } = await supabase.from('services_catalog').delete().eq('id', id)
    if (error) {
      alert(error.message)
      return
    }
    await load()
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Catálogo de servicios</h1>
        <div className="text-sm text-gray-600">{totalServices} servicios</div>
      </div>

      <form onSubmit={addService} className="bg-white rounded-2xl shadow p-4 grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
        <div className="md:col-span-8">
          <label className="block text-sm text-gray-600">Nombre</label>
          <input
            className="w-full border rounded-xl px-3 py-2"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ej. Corona de Zirconia"
          />
        </div>
        <div className="md:col-span-3">
          <label className="block text-sm text-gray-600">Precio unitario (MXN)</label>
          <input
            type="number"
            step="0.01"
            className="w-full border rounded-xl px-3 py-2"
            value={price}
            onChange={(e) => setPrice(Number(e.target.value || 0))}
          />
        </div>
        <div className="md:col-span-1">
          <button className="w-full px-3 py-2 rounded-xl bg-emerald-600 text-white">Agregar</button>
        </div>
      </form>

      <div className="bg-white rounded-2xl shadow p-4">
        {loading ? (
          <div>Cargando…</div>
        ) : err ? (
          <div className="text-red-600">Error: {err}</div>
        ) : rows.length === 0 ? (
          <div className="text-gray-600">Aún no hay servicios en el catálogo.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left border-b">
                  <th className="py-2">Servicio</th>
                  <th className="py-2">Unitario</th>
                  <th className="py-2 w-40">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-b last:border-b-0">
                    <td className="py-2 pr-2">
                      <input
                        className="w-full border rounded-lg px-2 py-1"
                        defaultValue={r.name}
                        onBlur={(e) => {
                          const v = e.target.value.trim()
                          if (v && v !== r.name) updateRow(r.id, { name: v } as any)
                        }}
                      />
                    </td>
                    <td className="py-2 pr-2">
                      <input
                        type="number"
                        step="0.01"
                        className="w-full border rounded-lg px-2 py-1"
                        defaultValue={Number(r.unit_price || 0)}
                        onBlur={(e) => {
                          const v = Number(e.target.value || 0)
                          if (v !== Number(r.unit_price || 0)) updateRow(r.id, { unit_price: v } as any)
                        }}
                      />
                      <div className="text-xs text-gray-500 mt-1">{money(r.unit_price)}</div>
                    </td>
                    <td className="py-2">
                      <button
                        className="px-3 py-1 rounded-lg bg-red-50 text-red-700 hover:bg-red-100"
                        onClick={() => removeRow(r.id)}
                        type="button"
                      >
                        Eliminar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="text-xs text-gray-500">
        Nota: este módulo requiere la tabla <code>services_catalog</code> (ver SQL en <code>sql/patch_services_catalog.sql</code>).
      </div>
    </div>
  )
}

'use client'

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'

type ServiceRow = { id: string; name: string; unit_price: number }

export default function ServicesCatalogPage() {
  const [rows,     setRows]     = useState<ServiceRow[]>([])
  const [loading,  setLoading]  = useState(true)
  const [search,   setSearch]   = useState('')
  const [name,     setName]     = useState('')
  const [price,    setPrice]    = useState<number>(0)
  const [editId,   setEditId]   = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editPrice,setEditPrice]= useState<number>(0)

  const money = useMemo(() => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }), [])

  async function load() {
    setLoading(true)
    const { data } = await supabase.from('services_catalog').select('id,name,unit_price').order('name')
    setRows((data as any) || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function addService(e: React.FormEvent) {
    e.preventDefault()
    const n = name.trim()
    if (!n) return
    const { error } = await supabase.from('services_catalog').upsert({ name: n, unit_price: Number(price || 0) }, { onConflict: 'name' })
    if (error) { alert(error.message); return }
    setName(''); setPrice(0)
    load()
  }

  function startEdit(r: ServiceRow) {
    setEditId(r.id); setEditName(r.name); setEditPrice(Number(r.unit_price || 0))
  }

  async function saveEdit() {
    if (!editId) return
    const n = editName.trim()
    if (!n) return
    const { error } = await supabase.from('services_catalog').update({ name: n, unit_price: editPrice }).eq('id', editId)
    if (error) { alert(error.message); return }
    setEditId(null)
    load()
  }

  async function removeRow(id: string, name: string) {
    if (!confirm(`¿Eliminar "${name}" del catálogo?`)) return
    const { error } = await supabase.from('services_catalog').delete().eq('id', id)
    if (error) { alert(error.message); return }
    load()
  }

  const norm = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
  const filtered = rows.filter(r => !search.trim() || norm(r.name).includes(norm(search)))
  const avgPrice = rows.length > 0 ? rows.reduce((s, r) => s + Number(r.unit_price || 0), 0) / rows.length : 0

  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="flex items-center gap-3 flex-wrap">
        <div>
          <h1 className="page-title">Catálogo de servicios</h1>
          {!loading && (
            <p className="text-xs text-gray-400 mt-0.5">
              {rows.length} servicio{rows.length !== 1 ? 's' : ''} · Precio promedio: {money.format(avgPrice)}
            </p>
          )}
        </div>
      </div>

      {/* Formulario agregar */}
      <form onSubmit={addService} className="card p-5">
        <div className="text-sm font-bold text-gray-700 mb-4 flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-brand text-white text-xs flex items-center justify-center">+</span>
          Agregar servicio
        </div>
        <div className="grid md:grid-cols-12 gap-3">
          <div className="md:col-span-7">
            <label className="text-xs font-medium text-gray-500 mb-1 block">Nombre del servicio</label>
            <input className="input text-sm w-full" value={name} onChange={e => setName(e.target.value)}
              placeholder="Ej. Corona de zirconia, Implante dental…" />
          </div>
          <div className="md:col-span-3">
            <label className="text-xs font-medium text-gray-500 mb-1 block">Precio unitario</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
              <input type="number" step="0.01" className="input text-sm w-full pl-7" value={price || ''}
                onChange={e => setPrice(Number(e.target.value || 0))} placeholder="0.00" />
            </div>
          </div>
          <div className="md:col-span-2 flex items-end">
            <button type="submit" className="btn text-sm w-full">Agregar</button>
          </div>
        </div>
      </form>

      {/* Buscador */}
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
        <input className="input pl-9 text-sm" placeholder="Buscar servicio…" value={search} onChange={e => setSearch(e.target.value)} />
        {search && <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-lg">×</button>}
      </div>

      {/* Lista */}
      <div className="card overflow-hidden">
        {loading && (
          <div className="p-5 space-y-2 animate-pulse">
            {[1, 2, 3, 4, 5].map(i => <div key={i} className="h-14 rounded-xl bg-gray-100" />)}
          </div>
        )}

        {!loading && filtered.length === 0 && (
          <div className="p-12 text-center text-gray-400">
            <div className="text-5xl mb-3">🏷️</div>
            <div className="font-semibold text-gray-500">{search ? 'Sin resultados' : 'Sin servicios'}</div>
            <div className="text-sm mt-1">{search ? `No hay coincidencias para "${search}"` : 'Agrega el primer servicio arriba.'}</div>
          </div>
        )}

        {!loading && filtered.length > 0 && (
          <>
            {/* Cabecera */}
            <div className="grid grid-cols-12 gap-3 px-5 py-2.5 bg-gray-50 border-b border-gray-100 text-xs font-bold text-gray-400 uppercase tracking-wider">
              <div className="col-span-7">Servicio</div>
              <div className="col-span-3 text-right">Precio unitario</div>
              <div className="col-span-2"/>
            </div>

            {/* Filas */}
            <div className="divide-y divide-gray-50">
              {filtered.map(r => {
                const isEd = editId === r.id
                return (
                  <div key={r.id} className={`grid grid-cols-12 gap-3 px-5 py-3 items-center group hover:bg-gray-50/60 transition ${isEd ? 'bg-brand/5' : ''}`}>

                    {/* Nombre */}
                    <div className="col-span-7">
                      {isEd ? (
                        <input value={editName} onChange={e => setEditName(e.target.value)}
                          className="input text-sm w-full" autoFocus />
                      ) : (
                        <div className="text-sm font-semibold text-gray-800">{r.name}</div>
                      )}
                    </div>

                    {/* Precio */}
                    <div className="col-span-3 text-right">
                      {isEd ? (
                        <div className="relative ml-auto" style={{ maxWidth: 140 }}>
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                          <input type="number" step="0.01" value={editPrice || ''} onChange={e => setEditPrice(Number(e.target.value || 0))}
                            className="input text-sm w-full pl-7 text-right" />
                        </div>
                      ) : (
                        <div className="text-sm font-semibold text-gray-700">{money.format(Number(r.unit_price || 0))}</div>
                      )}
                    </div>

                    {/* Acciones */}
                    <div className="col-span-2 flex items-center justify-end gap-1">
                      {isEd ? (
                        <>
                          <button onClick={saveEdit}
                            className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 hover:bg-emerald-200 flex items-center justify-center text-xs transition">
                            ✓
                          </button>
                          <button onClick={() => setEditId(null)}
                            className="w-7 h-7 rounded-lg bg-gray-100 text-gray-500 hover:bg-gray-200 flex items-center justify-center text-xs transition">
                            ✕
                          </button>
                        </>
                      ) : (
                        <>
                          <button onClick={() => startEdit(r)}
                            className="w-7 h-7 rounded-lg text-brand hover:bg-brand/10 flex items-center justify-center text-xs transition opacity-0 group-hover:opacity-100">
                            ✏️
                          </button>
                          <button onClick={() => removeRow(r.id, r.name)}
                            className="w-7 h-7 rounded-lg text-rose-500 hover:bg-rose-50 border border-rose-200 flex items-center justify-center text-xs transition opacity-0 group-hover:opacity-100">
                            🗑️
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

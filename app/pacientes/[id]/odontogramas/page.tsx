'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { saveOdontogramVersion, publicUrlFor } from '@/lib/odontogram';
import BackButton from '@/components/BackButton';

type Row = { id: string; created_at: string; image_path: string | null; notes: string | null; };

export default function Page({ params }: { params: { id: string } }) {
  const patientId = params.id;
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [stateText, setStateText] = useState<string>('{}');
  const [svgText, setSvgText] = useState<string>('<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800"><rect width="100%" height="100%" fill="#fff"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-size="32">Odontograma</text></svg>');
  const [note, setNote] = useState<string>('');
  const router = useRouter();

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('odontograms')
        .select('id, created_at, image_path, notes')
        .eq('patient_id', patientId)
        .order('created_at', { ascending: false });
      if (!error) setRows((data ?? []) as any);
      setLoading(false);
    })();
  }, [patientId]);

  const fmt = useMemo(() => new Intl.DateTimeFormat(undefined, { dateStyle: 'short', timeStyle: 'short' }), []);

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const snapshot = JSON.parse(stateText || '{}');
      await saveOdontogramVersion({ patientId, snapshot, kind: 'initial', svg: svgText, notes: note });
      const { data } = await supabase
        .from('odontograms')
        .select('id, created_at, image_path, notes')
        .eq('patient_id', patientId)
        .order('created_at', { ascending: false });
      setRows((data ?? []) as any);
      setStateText('{}'); setNote('');
    } catch (err: any) {
      alert(err.message || String(err));
    } finally {
      setSaving(false);
    }
  }

  function toggleSelected(id: string) {
    setSelected(prev => {
      if (prev.includes(id)) return prev.filter(x => x !== id);
      if (prev.length >= 2) return [prev[1], id];
      return [...prev, id];
    });
  }

  function goCompare() {
    if (selected.length === 2) {
      const [a, b] = selected;
      router.push(`/pacientes/${patientId}/odontogramas/compare?a=${a}&b=${b}`);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <BackButton />
        <h1 className="page-title">Odontogramas</h1>
        <Link href={`/pacientes/${patientId}`} className="btn ml-auto">Ficha del paciente</Link>
      </div>

      <div className="card p-4 space-y-3">
        <div className="font-semibold">Nueva versión</div>
        <form onSubmit={onCreate} className="grid md:grid-cols-2 gap-3">
          <div className="space-y-2">
            <label className="block text-sm">Estado (JSON)</label>
            <textarea className="input w-full h-40" value={stateText} onChange={(e)=>setStateText(e.target.value)} />
            <label className="block text-sm">Nota (opcional)</label>
            <input className="input w-full" value={note} onChange={(e)=>setNote(e.target.value)} placeholder="Observaciones" />
          </div>
          <div className="space-y-2">
            <label className="block text-sm">SVG (opcional, para snapshot)</label>
            <textarea className="input w-full h-40" value={svgText} onChange={(e)=>setSvgText(e.target.value)} />
            <button className="btn mt-2" disabled={saving}>{saving ? 'Guardando…' : 'Guardar versión'}</button>
          </div>
        </form>
      </div>

      <div className="card p-4">
        <div className="flex items-center gap-3 mb-3">
          <div className="font-semibold">Historial</div>
          <button className="btn ml-auto" disabled={selected.length!==2} onClick={goCompare}>Comparar (2)</button>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {rows.map(r => (
            <div key={r.id} className={"border rounded overflow-hidden " + (selected.includes(r.id) ? "ring-2 ring-emerald-500" : "")}>
              <Thumb path={r.image_path} />
              <div className="p-3 space-y-1 text-sm">
                <div className="font-medium">{fmt.format(new Date(r.created_at))}</div>
                {r.notes ? <div className="text-neutral-600">{r.notes}</div> : null}
                <div className="flex items-center gap-2 pt-1">
                  <Link href={`/pacientes/${patientId}/odontogramas/${r.id}`} className="text-blue-600 mr-3">Ver</Link>
                  <button className="text-emerald-700 underline" onClick={()=>toggleSelected(r.id)}>
                    {selected.includes(r.id) ? 'Quitar de comparación' : 'Añadir a comparación'}
                  </button>
                </div>
              </div>
            </div>
          ))}
          {!loading && rows.length === 0 && (
            <div className="text-neutral-500">Sin versiones todavía.</div>
          )}
        </div>
      </div>
    </div>
  );
}

function Thumb({ path }: { path: string | null }) {
  const [url, setUrl] = React.useState<string | null>(null);
  React.useEffect(() => {
    if (!path) { setUrl(null); return; }
    const u = publicUrlFor(path);
    setUrl(u);
  }, [path]);
  if (!path) return <div className="aspect-[14/9] bg-neutral-100 flex items-center justify-center text-neutral-400">Sin imagen</div>;
  if (!url) return <div className="aspect-[14/9] bg-neutral-100 animate-pulse" />;
  return <img src={url} className="w-full aspect-[14/9] object-contain bg-white" alt="odontograma" />;
}

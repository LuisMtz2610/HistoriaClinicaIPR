'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { publicUrlFor } from '@/lib/odontogram';
import BackButton from '@/components/BackButton';

type Row = { id: string; created_at: string; image_path: string | null; note: string | null; svg: string | null; state: any; };

export default function Page({ params }: { params: { id: string } }) {
  const patientId = params.id;
  const sp = useSearchParams();
  const a = sp.get('a');
  const b = sp.get('b');

  const [A, setA] = useState<Row | null>(null);
  const [B, setB] = useState<Row | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      if (!a || !b) return;
      setLoading(true);
      const [{ data: da }, { data: db }] = await Promise.all([
        supabase.from('odontograms').select('*').eq('id', a).maybeSingle(),
        supabase.from('odontograms').select('*').eq('id', b).maybeSingle(),
      ]);
      setA(da as any); setB(db as any);
      setLoading(false);
    })();
  }, [a, b]);

  const fmt = useMemo(() => new Intl.DateTimeFormat(undefined, { dateStyle: 'short', timeStyle: 'short' }), []);
  const diffs = React.useMemo(() => diffStates(A?.state, B?.state), [A?.state, B?.state]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <BackButton />
        <h1 className="page-title">Comparar odontogramas</h1>
        <Link href={`/patients/${patientId}/odontogramas`} className="btn ml-auto">Historial</Link>
      </div>

      {(A && B) ? (
        <div className="space-y-6">
          <div className="grid md:grid-cols-2 gap-4">
            <Card title={"Versión A — " + fmt.format(new Date(A.created_at))} note={A.note} svg={A.svg} image_path={A.image_path} />
            <Card title={"Versión B — " + fmt.format(new Date(B.created_at))} note={B.note} svg={B.svg} image_path={B.image_path} />
          </div>

          <div className="card p-4">
            <div className="font-semibold mb-2">Cambios por diente</div>
            {diffs.length ? (
              <ul className="list-disc pl-6 space-y-1 text-sm">
                {diffs.map((d, i) => <li key={i}>{d}</li>)}
              </ul>
            ) : (
              <div className="text-sm text-neutral-500">Sin diferencias detectables en el estado.</div>
            )}
          </div>
        </div>
      ) : (!loading ? <div className="card p-4">Selecciona dos versiones válidas.</div> : null)}
    </div>
  );
}

function Card({ title, note, svg, image_path }: { title: string; note: string|null; svg: string|null; image_path: string|null }) {
  const url = image_path ? publicUrlFor(image_path) : null;
  return (
    <div className="card p-4 space-y-2">
      <div className="font-semibold">{title}</div>
      {note ? <div className="text-sm text-neutral-600">{note}</div> : null}
      {url ? <img src={url} className="w-full aspect-[14/9] object-contain bg-white border" /> : <div className="aspect-[14/9] bg-neutral-100" />}
      {svg ? <div className="border rounded bg-white overflow-auto p-2" dangerouslySetInnerHTML={{ __html: svg }} /> : null}
    </div>
  );
}

function diffStates(A: any, B: any): string[] {
  const diffs: string[] = [];
  if (!A && !B) return diffs;
  const teeth = new Set<string>([...Object.keys(A||{}), ...Object.keys(B||{})]);
  teeth.forEach(tooth => {
    const a = A?.[tooth] || {};
    const b = B?.[tooth] || {};
    const keys = new Set<string>([...Object.keys(a), ...Object.keys(b)]);
    keys.forEach(k => {
      const va = JSON.stringify(a[k] ?? null);
      const vb = JSON.stringify(b[k] ?? null);
      if (va !== vb) {
        diffs.push(`Diente ${tooth} – ${k}: ${va} → ${vb}`);
      }
    });
  });
  return diffs;
}

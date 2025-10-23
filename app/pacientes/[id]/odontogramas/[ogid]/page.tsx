'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { publicUrlFor } from '@/lib/odontogram';
import BackButton from '@/components/BackButton';

type Row = { id: string; created_at: string; image_path: string | null; note: string | null; svg: string | null; state: any; };

export default function Page({ params }: { params: { id: string, ogid: string } }) {
  const patientId = params.id;
  const ogid = params.ogid;
  const [row, setRow] = useState<Row | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('odontograms')
        .select('id, created_at, image_path, note, svg, state')
        .eq('id', ogid)
        .maybeSingle();
      if (!error) setRow(data as any);
      setLoading(false);
    })();
  }, [ogid]);

  const fmt = useMemo(() => new Intl.DateTimeFormat(undefined, { dateStyle: 'short', timeStyle: 'short' }), []);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <BackButton />
        <h1 className="page-title">Odontograma</h1>
        <Link href={`/pacientes/${patientId}/odontogramas`} className="btn ml-auto">Historial</Link>
      </div>

      {!row && !loading && <div className="card p-4">No encontrado.</div>}

      {row && (
        <div className="space-y-4">
          <div className="card p-4 space-y-2">
            <div className="text-sm text-neutral-600">{fmt.format(new Date(row.created_at))}</div>
            {row.note ? <div><b>Nota:</b> {row.note}</div> : null}
            <Preview path={row.image_path} />
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="card p-4">
              <div className="font-semibold mb-2">SVG</div>
              {row.svg ? (
                <div className="border rounded bg-white overflow-auto p-2" dangerouslySetInnerHTML={{ __html: row.svg }} />
              ) : (
                <div className="text-sm text-neutral-500">Sin SVG guardado.</div>
              )}
            </div>
            <div className="card p-4">
              <div className="font-semibold mb-2">Estado (JSON)</div>
              <pre className="text-xs whitespace-pre-wrap">{JSON.stringify(row.state, null, 2)}</pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Preview({ path }: { path: string | null }) {
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

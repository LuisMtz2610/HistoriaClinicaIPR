
'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

type Pat = { first_name: string; last_name: string } | null;
type Row = { id: string; dt: string; folio?: string|null; };
type Group = { patient_id: string|null; patient: Pat; rows: Row[]; };

export default function Page() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('radiology_orders')
        .select("id, created_at, patient_id, folio_code, patients(first_name,last_name)")
        .order('created_at', { ascending: false });
      if (error) { console.error(error); setLoading(false); return; }

      const by = new Map<string|null, Group>();
      (data ?? []).forEach((r:any) => {
        const pid = r.patient_id ?? null;
        const pat = r.patients ?? null;
        const row: Row = { id: r.id, dt: r.created_at, folio: r.folio_code ?? null };
        if (!by.has(pid)) by.set(pid, { patient_id: pid, patient: pat, rows: [] });
        by.get(pid)!.rows.push(row);
      });

      const gs = Array.from(by.values()).sort((a,b) => {
        const an = a.patient ? `${a.patient.last_name} ${a.patient.first_name}` : 'ZZZ';
        const bn = b.patient ? `${b.patient.last_name} ${b.patient.first_name}` : 'ZZZ';
        return an.localeCompare(bn, undefined, { sensitivity:'base' });
      });

      setGroups(gs);
      setLoading(false);
    })();
  }, []);

  const fmt = useMemo(() => new Intl.DateTimeFormat(undefined, { dateStyle: 'short', timeStyle: 'short' }), []);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <h1 className="page-title">Solicitudes RX</h1>
        <Link href="/radiology_orders/new" className="btn ml-auto">Nueva</Link>
      </div>

      <div className="space-y-6">
        {groups.map(g => (
          <div key={g.patient_id ?? 'sin-paciente'} className="card p-4 space-y-3">
            <div className="font-semibold text-lg">
              {g.patient && g.patient_id ? (
                <Link href={`/pacientes/${g.patient_id}`} className="text-blue-600 hover:underline">
                  {g.patient.last_name}, {g.patient.first_name}
                </Link>
              ) : 'Sin paciente'}
              <span className="ml-2 text-sm text-neutral-500">({g.rows.length})</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full border text-sm">
                <thead>
                  <tr className="bg-neutral-100">
                    <th className="border px-2 py-1">Folio</th>
                    <th className="border px-2 py-1">Fecha</th>
                    <th className="border px-2 py-1">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {g.rows.map(r => (
                    <tr key={r.id}>
                      <td className="border px-2 py-1">{r.folio ?? ('RX-' + r.id.slice(0,8))}</td>
                      <td className="border px-2 py-1">{fmt.format(new Date(r.dt))}</td>
                      <td className="border px-2 py-1"><Link href={`/radiology_orders/${r.id}/print`} className="text-blue-600">Imprimir</Link></td>
                    </tr>
                  ))}
                  {!loading && g.rows.length === 0 && (
                    <tr><td className="border px-2 py-3 text-gray-500" colSpan={3}>Sin documentos.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

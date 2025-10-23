
'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

type Pat = { first_name: string; last_name: string } | null;

type Row = {
  id: string;
  dt: string;
  folio?: string | null;
  total: number;
  paid: number;
  balance: number;
};

type Group = {
  patient_id: string | null;
  patient: Pat;
  rows: Row[];
  totals: { total: number; paid: number; balance: number };
};

export default function Page() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('quotes')
        .select("id, created_at, total, patient_id, folio_code, quote_payments(amount), patients(first_name,last_name)")
        .order('created_at', { ascending: false });

      if (error) { console.error(error); setLoading(false); return; }

      const byPatient = new Map<string|null, Group>();

      (data ?? []).forEach((r: any) => {
        const pid: string | null = r.patient_id ?? null;
        const pat: Pat = r.patients ?? null;
        const total = Number(r.total) || 0;
        const paid = (r.quote_payments ?? []).reduce((a:number,p:any)=>a+(Number(p.amount)||0),0);
        const balance = total - paid;

        const row: Row = {
          id: r.id,
          dt: r.created_at ?? new Date().toISOString(),
          folio: r.folio_code ?? null,
          total, paid, balance
        };

        if (!byPatient.has(pid)) {
          byPatient.set(pid, {
            patient_id: pid,
            patient: pat,
            rows: [],
            totals: { total: 0, paid: 0, balance: 0 },
          });
        }
        const g = byPatient.get(pid)!;
        g.rows.push(row);
        g.totals.total += total;
        g.totals.paid += paid;
        g.totals.balance += balance;
      });

      const gs = Array.from(byPatient.values()).sort((a, b) => {
        const an = a.patient ? `${a.patient.last_name} ${a.patient.first_name}` : 'ZZZ';
        const bn = b.patient ? `${b.patient.last_name} ${b.patient.first_name}` : 'ZZZ';
        return an.localeCompare(bn, undefined, { sensitivity: 'base' });
      });

      setGroups(gs);
      setLoading(false);
    })();
  }, []);

  const fmt = useMemo(() => new Intl.DateTimeFormat(undefined, { dateStyle: 'short', timeStyle: 'short' }), []);
  const money = useMemo(()=>new Intl.NumberFormat('es-MX',{style:'currency',currency:'MXN'}),[]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <h1 className="page-title">Presupuestos</h1>
        <Link href="/quotes/new" className="btn ml-auto">Nueva</Link>
      </div>

      <div className="space-y-6">
        {groups.map(g => (
          <div key={g.patient_id ?? 'sin-paciente'} className="card p-4 space-y-3">
            <div className="flex items-baseline gap-3">
              <div className="font-semibold text-lg">
                {g.patient && g.patient_id ? (
                  <Link href={`/pacientes/${g.patient_id}`} className="text-blue-600 hover:underline">
                    {g.patient.last_name}, {g.patient.first_name}
                  </Link>
                ) : (
                  'Sin paciente'
                )}
                <span className="ml-2 text-sm text-neutral-500">({g.rows.length})</span>
              </div>
              <div className="ml-auto text-sm">
                <span className="mr-4">Total: <b>{money.format(g.totals.total)}</b></span>
                <span className="mr-4">Pagado: <b>{money.format(g.totals.paid)}</b></span>
                <span>Saldo: <b className={g.totals.balance>0?'text-rose-600':'text-emerald-600'}>{money.format(g.totals.balance)}</b></span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full border text-sm">
                <thead>
                  <tr className="bg-neutral-100">
                    <th className="border px-2 py-1">Folio</th>
                    <th className="border px-2 py-1">Fecha</th>
                    <th className="border px-2 py-1 text-right">Total</th>
                    <th className="border px-2 py-1 text-right">Pagado</th>
                    <th className="border px-2 py-1 text-right">Saldo</th>
                    <th className="border px-2 py-1">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {g.rows.map(r => (
                    <tr key={r.id}>
                      <td className="border px-2 py-1">{r.folio ?? ('QUO-' + r.id.slice(0,8))}</td>
                      <td className="border px-2 py-1">{fmt.format(new Date(r.dt))}</td>
                      <td className="border px-2 py-1 text-right">{money.format(r.total)}</td>
                      <td className="border px-2 py-1 text-right">{money.format(r.paid)}</td>
                      <td className="border px-2 py-1 text-right"><span className={r.balance>0?'text-rose-600':'text-emerald-600'}>{money.format(r.balance)}</span></td>
                      <td className="border px-2 py-1 whitespace-nowrap">
                        <Link href={`/quotes/${r.id}`} className="mr-3 text-blue-600">Abrir</Link>
                        <Link href={`/quotes/${r.id}/print`} className="text-blue-600">Imprimir</Link>
                      </td>
                    </tr>
                  ))}
                  {!loading && g.rows.length === 0 && (
                    <tr>
                      <td className="border px-2 py-3 text-gray-500" colSpan={6}>Sin documentos.</td>
                    </tr>
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

'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

type PatientLite = { first_name: string; last_name: string } | null;

type Row = {
  id: string;
  created_at: string;
  total: number | null;
  total_paid: number;
  balance: number;
  patient: PatientLite;
  patient_id?: string | null; // ← importante para el Link
};

export default function QuotesPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('quotes')
        .select(
          "id, created_at, total, patient_id, quote_payments(amount), patients(first_name,last_name)"
        )
        .order('created_at', { ascending: false });

      setLoading(false);
      if (error) {
        console.error(error);
        return;
      }

      const mapped: Row[] = (data ?? []).map((q: any) => {
        const paid = (q.quote_payments ?? []).reduce(
          (acc: number, p: any) => acc + (Number(p.amount) || 0),
          0
        );
        const tot = Number(q.total) || 0;
        return {
          id: q.id,
          created_at: q.created_at,
          total: tot,
          total_paid: paid,
          balance: tot - paid,
          patient: q.patients ?? null,
          patient_id: q.patient_id ?? null,
        };
      });

      setRows(mapped);
    })();
  }, []);

  const fmt = useMemo(
    () =>
      new Intl.NumberFormat('es-MX', {
        style: 'currency',
        currency: 'MXN',
      }),
    []
  );

  const fmtDate = (s: string) =>
    new Date(s).toLocaleString(undefined, {
      dateStyle: 'short',
      timeStyle: 'medium',
    });

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <h1 className="page-title">Presupuestos</h1>
        <Link href="/quotes/new" className="btn ml-auto">
          Nueva
        </Link>
      </div>

      <div className="card p-4 overflow-x-auto">
        <table className="w-full border text-sm">
          <thead>
            <tr className="bg-neutral-100">
              <th className="border px-2 py-1 text-left">Paciente</th>
              <th className="border px-2 py-1 text-right">Total</th>
              <th className="border px-2 py-1 text-right">Pagado</th>
              <th className="border px-2 py-1 text-right">Saldo pendiente</th>
              <th className="border px-2 py-1">Fecha</th>
              <th className="border px-2 py-1">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td className="border px-2 py-1">
                  {r.patient && r.patient_id ? (
                    <Link
                      href={`/pacientes/${r.patient_id}`}
                      className="text-blue-600 hover:underline"
                    >
                      {`${r.patient.last_name}, ${r.patient.first_name}`}
                    </Link>
                  ) : r.patient ? (
                    `${r.patient.last_name}, ${r.patient.first_name}`
                  ) : (
                    '—'
                  )}
                </td>
                <td className="border px-2 py-1 text-right">
                  {fmt.format(r.total || 0)}
                </td>
                <td className="border px-2 py-1 text-right">
                  {fmt.format(r.total_paid)}
                </td>
                <td
                  className={`border px-2 py-1 text-right ${
                    (r.balance || 0) > 0 ? 'text-rose-600' : 'text-emerald-600'
                  }`}
                >
                  {fmt.format(r.balance || 0)}
                </td>
                <td className="border px-2 py-1">{fmtDate(r.created_at)}</td>
                <td className="border px-2 py-1 whitespace-nowrap">
                  <Link href={`/quotes/${r.id}`} className="text-blue-600">
                    Abrir
                  </Link>{' '}
                  <Link
                    href={`/quotes/${r.id}/print`}
                    className="text-blue-600"
                  >
                    Imprimir
                  </Link>
                </td>
              </tr>
            ))}
            {!loading && rows.length === 0 && (
              <tr>
                <td className="border px-2 py-3 text-gray-500" colSpan={6}>
                  Sin presupuestos todavía.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

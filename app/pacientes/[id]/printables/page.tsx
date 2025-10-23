'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

type Item = {
  id: string;
  created_at: string; // fecha normalizada para mostrar
};

const tableToRoute: Record<string, string> = {
  lab_orders: 'lab-orders',
  radiology_orders: 'radiology-orders',
  prescriptions: 'prescriptions',
  consents: 'consents',
  quotes: 'quotes',
};

const SECTIONS = [
  { key: 'prescriptions',    title: 'Receta',                 route: 'prescriptions' },
  { key: 'radiology_orders', title: 'Solicitud RX',           route: 'radiology-orders' },
  { key: 'lab_orders',       title: 'Solicitud de Laboratorio', route: 'lab-orders' },
  { key: 'consents',         title: 'Consentimiento',         route: 'consents' },
  { key: 'quotes',           title: 'Presupuesto',            route: 'quotes' },
] as const;

type SectionsMap = {
  prescriptions: Item[];
  radiology_orders: Item[];
  lab_orders: Item[];
  consents: Item[];
  quotes: Item[];
};

export default function Page({ params }: { params: { id: string } }) {
  const patientId = params.id;
  const [rows, setRows] = useState<SectionsMap>({
    prescriptions: [], radiology_orders: [], lab_orders: [], consents: [], quotes: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);

      // 1) Queries que ya usan created_at
      const [presc, rx, labs, quotes] = await Promise.all([
        supabase.from('prescriptions').select('id, created_at').eq('patient_id', patientId).order('created_at', { ascending: false }),
        supabase.from('radiology_orders').select('id, created_at').eq('patient_id', patientId).order('created_at', { ascending: false }),
        supabase.from('lab_orders').select('id, created_at').eq('patient_id', patientId).order('created_at', { ascending: false }),
        supabase.from('quotes').select('id, created_at').eq('patient_id', patientId).order('created_at', { ascending: false }),
      ]);

      // 2) Consentimientos: usar signed_at como fecha
      const cons = await supabase
        .from('consents')
        .select('id, signed_at')
        .eq('patient_id', patientId)
        .order('signed_at', { ascending: false });

      setRows({
        prescriptions:    ((presc.data  ?? []) as any[]).map(r => ({ id: r.id, created_at: r.created_at })),
        radiology_orders: ((rx.data     ?? []) as any[]).map(r => ({ id: r.id, created_at: r.created_at })),
        lab_orders:       ((labs.data   ?? []) as any[]).map(r => ({ id: r.id, created_at: r.created_at })),
        consents:         ((cons.data   ?? []) as any[]).map(r => ({ id: r.id, created_at: r.signed_at ?? r.created_at ?? new Date().toISOString() })),
        quotes:           ((quotes.data ?? []) as any[]).map(r => ({ id: r.id, created_at: r.created_at })),
      });

      setLoading(false);
    })();
  }, [patientId]);

  const fmt = useMemo(
    () => new Intl.DateTimeFormat(undefined, { dateStyle: 'short', timeStyle: 'short' }),
    []
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <h1 className="page-title">Historial de imprimibles</h1>
      </div>

      <div className="card p-4 space-y-6">
        {SECTIONS.map(({key, title, route}) => {
          const list = rows[key];
          return (
            <div key={key}>
              <div className="font-semibold mb-2">
                {title} {list.length ? <span className="text-xs text-neutral-500">({list.length})</span> : null}
              </div>
              <div className="overflow-x-auto">
                <table className="w-full border text-sm">
                  <thead>
                    <tr className="bg-neutral-100">
                      <th className="border px-2 py-1">Fecha</th>
                      <th className="border px-2 py-1">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {list.map(row => (
                      <tr key={`${key}-${row.id}`}>
                        <td className="border px-2 py-1 text-center">{fmt.format(new Date(row.created_at))}</td>
                        <td className="border px-2 py-1 text-center">
                          <Link href={`/${route}/${row.id}/print`} className="text-blue-600 hover:underline">
                            Imprimir
                          </Link>
                        </td>
                      </tr>
                    ))}
                    {!loading && list.length === 0 && (
                      <tr>
                        <td className="border px-2 py-3 text-gray-500 text-center" colSpan={2}>
                          No hay documentos.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

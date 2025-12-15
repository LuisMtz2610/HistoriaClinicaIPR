'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';

type Props = {
  patientId: string;
  targetSelector: string;        // p.ej. '#odontograma-print-area'
  buttonClassName?: string;      // p.ej. 'btn ml-auto'
};

export default function OdontoPrintAndSave({
  patientId,
  targetSelector,
  buttonClassName = 'btn ml-auto',
}: Props) {
  const [saving, setSaving] = useState(false);
  const [compareWith, setCompareWith] = useState<string | null>(null);
  const [newId, setNewId] = useState<string | null>(null);

  async function svgStringToWebP(svgString: string, w: number, h: number): Promise<Blob> {
    const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);
    try {
      const img = new Image();
      img.decoding = 'sync';
      await new Promise<void>((res, rej) => {
        img.onload = () => res();
        img.onerror = (e) => rej(e);
        img.src = url;
      });
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, w);
      canvas.height = Math.max(1, h);
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      return await new Promise<Blob>((resolve) => {
        canvas.toBlob((b) => resolve(b!), 'image/webp', 0.95);
      });
    } finally {
      URL.revokeObjectURL(url);
    }
  }

  async function imgElToWebP(imgEl: HTMLImageElement): Promise<Blob> {
    const canvas = document.createElement('canvas');
    const w = imgEl.naturalWidth || imgEl.width || 1400;
    const h = imgEl.naturalHeight || imgEl.height || 900;
    canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, w, h);
    ctx.drawImage(imgEl, 0, 0, w, h);
    return await new Promise<Blob>((resolve) => {
      canvas.toBlob((b) => resolve(b!), 'image/webp', 0.95);
    });
  }

  async function htmlToWebP(root: HTMLElement): Promise<Blob> {
    try {
      const html2canvas = (await import('html2canvas')).default;
      const canvas = await html2canvas(root, { backgroundColor: '#ffffff', scale: 2 });
      return await new Promise<Blob>((resolve) => {
        canvas.toBlob((b) => resolve(b!), 'image/webp', 0.95);
      });
    } catch {
      throw new Error(
        'No se pudo capturar el odontograma (no es SVG ni IMG). Instala "html2canvas" o usa un <svg>/<img>.'
      );
    }
  }

  async function captureBlob(): Promise<Blob> {
    const el = document.querySelector(targetSelector) as HTMLElement | null;
    if (!el) throw new Error('No encuentro el elemento del odontograma. Revisa targetSelector.');

    const svg = el.querySelector('svg');
    if (svg) {
      const rect = (svg as any).getBoundingClientRect?.() || { width: 1400, height: 900 };
      const svgStr = new XMLSerializer().serializeToString(svg);
      return await svgStringToWebP(svgStr, Math.ceil(rect.width || 1400), Math.ceil(rect.height || 900));
    }

    const img = el.querySelector('img') as HTMLImageElement | null;
    if (img) return await imgElToWebP(img);

    return await htmlToWebP(el);
  }

  async function onClick() {
    try {
      setSaving(true);

      const prev = await supabase
        .from('odontograms')
        .select('id')
        .eq('patient_id', patientId)
        .order('created_at', { ascending: false })
        .limit(1);

      if (!prev.error && prev.data?.length) setCompareWith(prev.data[0].id);
      else setCompareWith(null);

      const blob = await captureBlob();

      const fileName = `snapshot-${Date.now()}.webp`;
      const storagePath = `odontograms/${patientId}/${fileName}`;
      const up = await supabase.storage.from('odontograms').upload(storagePath, blob, {
        contentType: 'image/webp',
        upsert: false,
      });
      if (up.error) throw up.error;

      const ins = await supabase
        .from('odontograms')
        .insert({
          patient_id: patientId,
          image_path: storagePath,
          state: {},
          note: 'Versión creada desde Historia → Imprimir',
        })
        .select('id')
        .single();
      if (ins.error) throw ins.error;

      setNewId(ins.data.id);
      window.print();
    } catch (e: any) {
      alert(e.message || String(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <button className={buttonClassName} onClick={onClick} disabled={saving}>
        {saving ? 'Guardando…' : 'Imprimir odontograma'}
      </button>
      {newId && compareWith && (
        <a className="btn" href={`/pacientes/${patientId}/odontogramas/compare?a=${compareWith}&b=${newId}`}>
          Comparar con el anterior
        </a>
      )}
    </div>
  );
}

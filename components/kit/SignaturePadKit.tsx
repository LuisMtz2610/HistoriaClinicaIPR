'use client';
import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
type Props = { width?: number; height?: number; strokeStyle?: string; patientId: string; consentId?: string; bucket?: string; onSaved?: (path: string) => void | Promise<void>; }
export default function SignaturePadKit({ width = 600, height = 220, strokeStyle = '#111', patientId, consentId, bucket = 'clinical-files', onSaved }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [drawing, setDrawing] = useState(false);
  useEffect(() => { const c = canvasRef.current; if (!c) return; const ctx = c.getContext('2d')!; ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height); }, []);
  function pos(e: any) { const c = canvasRef.current!, r = c.getBoundingClientRect(); const x = (e.touches ? e.touches[0].clientX : e.clientX) - r.left; const y = (e.touches ? e.touches[0].clientY : e.clientY) - r.top; return { x, y }; }
  function start(e: any) { setDrawing(true); draw(e); }
  function end() { setDrawing(false); }
  function draw(e: any) { if (!drawing) return; const c = canvasRef.current!, ctx = c.getContext('2d')!; ctx.strokeStyle = strokeStyle; ctx.lineWidth = 2; ctx.lineCap = 'round'; const { x, y } = pos(e); ctx.lineTo(x, y); ctx.stroke(); ctx.beginPath(); ctx.moveTo(x, y); }
  function clear() { const c = canvasRef.current!, ctx = c.getContext('2d')!; ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height); ctx.beginPath(); }
  async function save() { const c = canvasRef.current!; const ts = new Date().toISOString().replace(/[:.]/g, '-'); const path = `patients/${patientId}/signatures/${consentId || 'general'}-${ts}.png`; const blob: Blob = await new Promise((resolve) => c.toBlob(b => resolve(b!), 'image/png')); const { error } = await supabase.storage.from(bucket).upload(path, blob, { contentType: 'image/png' }); if (error) return alert(error.message); if (onSaved) { try { await onSaved(path); } catch(e) {} } alert('Firma guardada en ' + path); }
  return (
    <div className="space-y-2">
      <canvas ref={canvasRef} width={width} height={height} className="border rounded-2xl shadow w-full touch-none bg-white" onMouseDown={start} onMouseUp={end} onMouseOut={end} onMouseMove={draw} onTouchStart={start} onTouchEnd={end} onTouchMove={draw} />
      <div className="flex gap-2">
        <button onClick={clear} className="px-3 py-2 rounded-xl bg-gray-600 text-white">Limpiar</button>
        <button onClick={save} className="px-3 py-2 rounded-xl bg-emerald-600 text-white">Guardar firma</button>
      </div>
    </div>
  );
}

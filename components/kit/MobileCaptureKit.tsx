'use client';
import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
export default function MobileCaptureKit({ patientId, bucket = 'clinical-files', onUploaded }: { patientId: string; bucket?: string; onUploaded?: (path: string) => void; }) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [streaming, setStreaming] = useState(false);
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  useEffect(() => () => { const v = videoRef.current; if (v?.srcObject) (v.srcObject as MediaStream).getTracks().forEach(t=>t.stop()); }, []);
  async function start() { const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false }); if (videoRef.current) { videoRef.current.srcObject = s; await videoRef.current.play(); setStreaming(true); } }
  function stop() { const v = videoRef.current; if (v?.srcObject) { (v.srcObject as MediaStream).getTracks().forEach(t=>t.stop()); v.srcObject = null; } setStreaming(false); }
  function snap() { const v = videoRef.current, c = canvasRef.current; if (!v || !c) return; c.width = v.videoWidth; c.height = v.videoHeight; const ctx = c.getContext('2d')!; ctx.drawImage(v,0,0); c.toBlob(b=>{ if (b) setPreview(URL.createObjectURL(b)); }, 'image/jpeg', 0.9); }
  async function upload() { if (!canvasRef.current) return; setSaving(true); await new Promise<void>((resolve)=>{ canvasRef.current!.toBlob(async (blob)=>{ if (!blob) return resolve(); const ts = new Date().toISOString().replace(/[:.]/g,'-'); const path = `patients/${patientId}/${ts}.jpg`; const { error } = await supabase.storage.from(bucket).upload(path, blob, { contentType: 'image/jpeg' }); setSaving(false); if (!error) { onUploaded?.(path); alert('Guardado en '+path); setPreview(null);} else { alert(error.message);} resolve(); }, 'image/jpeg', 0.92); }); }
  return (<div className="space-y-3">
    <div className="flex gap-2">
      {!streaming ? <button onClick={start} className="px-3 py-2 rounded-xl bg-blue-600 text-white shadow">Abrir cámara</button>
                  : <button onClick={stop} className="px-3 py-2 rounded-xl bg-gray-700 text-white shadow">Cerrar cámara</button>}
      <button onClick={snap} disabled={!streaming} className="px-3 py-2 rounded-xl bg-amber-600 text-white shadow disabled:opacity-50">Tomar foto</button>
      <button onClick={upload} disabled={!preview} className="px-3 py-2 rounded-xl bg-emerald-600 text-white shadow disabled:opacity-50">{saving ? 'Subiendo…' : 'Guardar'}</button>
    </div>
    <video ref={videoRef} className="w-full rounded-2xl shadow" playsInline muted />
    <canvas ref={canvasRef} className="hidden" />
    {preview && <img src={preview} alt="preview" className="w-full rounded-xl border" />}
  </div>);
}
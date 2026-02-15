import { supabase } from '@/lib/supabase';

export async function svgToWebP(svgString: string, width = 1400, height = 900): Promise<Blob> {
  const svgBlob = new Blob([svgString], { type: 'image/svg+xml' });
  const url = URL.createObjectURL(svgBlob);
  try {
    const img = new Image();
    await new Promise<void>((res, rej) => { img.onload = () => res(); img.onerror = rej; img.src = url; });
    const canvas = document.createElement('canvas');
    canvas.width = width; canvas.height = height;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#fff';
    ctx.fillRect(0,0,width,height);
    ctx.drawImage(img, 0, 0, width, height);
    const blob = await new Promise<Blob>((resolve) => {
      if (canvas.toBlob) {
        canvas.toBlob((b) => resolve(b!), 'image/webp', 0.92);
      } else {
        const dataUrl = canvas.toDataURL('image/webp', 0.92);
        const bin = atob(dataUrl.split(',')[1]);
        const arr = new Uint8Array(bin.length);
        for (let i=0; i<bin.length; i++) arr[i] = bin.charCodeAt(i);
        resolve(new Blob([arr], { type: 'image/webp' }));
      }
    });
    return blob;
  } finally {
    URL.revokeObjectURL(url);
  }
}

export async function saveOdontogramVersion(opts: {
  patientId: string;
  snapshot: any;          // jsonb — estado del odontograma
  kind?: string;          // odontogram_kind: 'initial' | 'followup' | 'final'
  svg?: string | null;    // opcional, sólo para generar la imagen
  notes?: string | null;
  makeSnapshot?: boolean;
  snapshotSize?: { width: number; height: number };
  storageBucket?: string;
}) {
  const {
    patientId, snapshot, kind = 'initial', svg = null, notes = null,
    makeSnapshot = (svg ? true : false),
    snapshotSize = { width: 1400, height: 900 },
    storageBucket = 'odontograms',
  } = opts;

  let image_path: string | null = null;
  if (makeSnapshot && svg) {
    const blob = await svgToWebP(svg, snapshotSize.width, snapshotSize.height);
    const fileName = `${crypto.randomUUID()}.webp`;
    const storagePath = `odontograms/${patientId}/${fileName}`;
    const up = await supabase.storage.from(storageBucket).upload(storagePath, blob, {
      contentType: 'image/webp', upsert: false,
    });
    if (up.error) throw up.error;
    image_path = storagePath;
  }

  const { data, error } = await supabase.from('odontograms')
    .insert({ patient_id: patientId, kind, snapshot, image_path, notes })
    .select('id')
    .single();
  if (error) throw error;
  return data!.id as string;
}

export function publicUrlFor(path: string, bucket = 'odontograms'): string | null {
  try {
    const { data } = supabase.storage.from(bucket).getPublicUrl(path);
    return data?.publicUrl ?? null;
  } catch { return null; }
}

export async function signedUrlFor(path: string, expiresInSeconds = 3600, bucket = 'odontograms'): Promise<string | null> {
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, expiresInSeconds);
  if (error) return null;
  return data.signedUrl;
}

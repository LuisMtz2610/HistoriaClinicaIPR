'use server';
import 'server-only'
import { createClient } from '@supabase/supabase-js'

export async function saveConsentSignaturePathKit(id: string, signature_path: string) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const sb = createClient(url, key);
  try {
    const { data, error } = await sb.from('consents').update({ signature_path }).eq('id', id).select('id').single();
    if (error) {
      // La columna puede no existir; devolvemos un mensaje pero no rompemos el flujo.
      return { ok: false, reason: error.message };
    }
    return { ok: true, id: data.id, signature_path };
  } catch (e: any) {
    return { ok: false, reason: e?.message || 'unknown_error' };
  }
}

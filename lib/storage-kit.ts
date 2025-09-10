'use server';
import { createClient } from '@supabase/supabase-js'
const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
export async function createSignedUrlKit(bucket: string, path: string, expiresInSec: number = 60*30) {
  const supabase = createClient(url, key);
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, expiresInSec);
  if (error) throw new Error(error.message);
  return data.signedUrl;
}

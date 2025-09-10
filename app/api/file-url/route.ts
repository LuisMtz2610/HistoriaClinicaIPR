import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const id = url.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'missing id'}, { status: 400 })

  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
  const { data, error } = await supabase.from('files').select('*').eq('id', id).single()
  if (error || !data) return NextResponse.json({ error: error?.message || 'not found' }, { status: 404 })
  const { data: signed, error: e2 } = await supabase.storage.from('clinical-files').createSignedUrl(data.path, 60*5)
  if (e2 || !signed) return NextResponse.json({ error: e2?.message || 'no url' }, { status: 500 })
  return NextResponse.redirect(signed.signedUrl, 302)
}

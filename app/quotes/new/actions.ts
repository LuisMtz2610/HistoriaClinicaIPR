'use server'
import { redirect } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'

export async function createQuoteAction(formData: FormData) {
  const patient_id = String(formData.get('patient_id') || '')
  const total = Number(formData.get('total') || 0)
  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
  const { data, error } = await sb.from('quotes').insert({ patient_id, total }).select('id').single()
  if (error) throw new Error(error.message)
  redirect(`/quotes/${data.id}`)
}

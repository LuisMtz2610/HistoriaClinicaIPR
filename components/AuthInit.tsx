'use client'
import { useEffect } from 'react'
import { supabase } from '@/lib/supabase'

export default function AuthInit() {
  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession()
      if (!data.session) {
        await supabase.auth.signInAnonymously()
      }
    })()
  }, [])
  return null
}

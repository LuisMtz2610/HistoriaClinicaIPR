import { SupabaseClient } from '@supabase/supabase-js'

type Hit =
  | { type: 'patient'; id: string; title: string; subtitle: string; href: string }
  | { type: 'quote'; id: string; title: string; subtitle: string; href: string }
  | { type: 'appointment'; id: string; title: string; subtitle: string; href: string }
  | { type: 'note'; id: string; title: string; subtitle: string; href: string }

type PatientMini = { name?: string | null; first_name?: string | null; last_name?: string | null; phone?: string | null }
type PatientRel = PatientMini | PatientMini[] | null | undefined

function normalizePatientName(p: PatientRel): string {
  if (!p) return ''
  if (Array.isArray(p)) {
    const it = p[0]
    if (!it) return ''
    const byParts = `${it.first_name ?? ''} ${it.last_name ?? ''}`.trim()
    return it.name ?? byParts
  }
  const byParts = `${p.first_name ?? ''} ${p.last_name ?? ''}`.trim()
  return p.name ?? byParts
}

function normalizePatientPhone(p: PatientRel): string {
  if (!p) return ''
  if (Array.isArray(p)) return (p[0]?.phone ?? '') || ''
  return p.phone ?? ''
}

// Escapa % y _ para LIKE/ILIKE
function escapeLike(s: string) {
  return s.replace(/[%_]/g, (m) => '\\' + m)
}

export async function searchGlobal(sb: SupabaseClient, term: string) {
  const hits: Hit[] = []
  const t = (term || '').trim()
  if (!t) return hits

  const like = `%${escapeLike(t)}%`

  // --- Pacientes
  // Tip: si tu columna "name" no existe, usamos first_name/last_name
  {
    const { data: patients } = await sb
      .from('patients')
      .select('id, first_name, last_name, phone')
      .or(`first_name.ilike.${like},last_name.ilike.${like}`)
      .limit(5)

    patients?.forEach((p: any) => {
      const title = `${p.last_name ?? ''}, ${p.first_name ?? ''}`.trim().replace(/^, /, '')
      hits.push({
        type: 'patient',
        id: p.id,
        title: title || 'Paciente',
        subtitle: p.phone || '',
        href: `/pacientes/${p.id}`,
      })
    })
  }

  // --- Presupuestos (quotes)
  {
    const { data: quotes } = await sb
      .from('quotes')
      .select('id, folio, patient_id, patients(first_name,last_name,phone)')
      .or(`folio.ilike.${like},id.ilike.${like}`)
      .limit(5)

    quotes?.forEach((qt: any) => {
      hits.push({
        type: 'quote',
        id: qt.id,
        title: `Presupuesto ${qt.folio || qt.id}`,
        subtitle: normalizePatientName(qt.patients) || '',
        href: `/quotes/${qt.id}`,
      })
    })
  }

  // --- Citas (appointments)
  // Nota: en tu esquema real usas starts_at/ends_at (no "date")
  {
    const { data: apps } = await sb
      .from('appointments')
      .select('id, starts_at, patients(first_name,last_name,phone)')
      .or(`id.ilike.${like}`)
      .order('starts_at', { ascending: false })
      .limit(5)

    apps?.forEach((a: any) => {
      const when = a.starts_at ? new Date(a.starts_at) : null
      const whenText = when
        ? `${when.toLocaleDateString()} ${when.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
        : ''
      hits.push({
        type: 'appointment',
        id: a.id,
        title: `Cita ${a.id}`,
        subtitle: `${whenText}${whenText && normalizePatientName(a.patients) ? ' · ' : ''}${normalizePatientName(a.patients)}`,
        href: `/citas/${a.id}`,
      })
    })
  }

  // --- Notas / Observaciones (visit_observations)
  // Tu tabla tiene "note" (no "diagnosis"). Buscamos el texto.
  {
    const { data: notes } = await sb
      .from('visit_observations')
      .select('id, patient_id, note, patients(first_name,last_name)')
      .ilike('note', like)
      .order('taken_at', { ascending: false })
      .limit(5)

    notes?.forEach((n: any) => {
      hits.push({
        type: 'note',
        id: n.id,
        title: n.note ? String(n.note).slice(0, 80) : 'Nota',
        subtitle: normalizePatientName(n.patients) || '',
        href: `/pacientes/${n.patient_id}`, // puedes linkear a detalle de la nota si tienes ruta
      })
    })
  }

  return hits
}

export type { Hit }

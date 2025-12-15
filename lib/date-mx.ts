export function fmtDateOnlyMX(ymd?: string | null) {
  if (!ymd) return '—'
  const ymd10 = String(ymd).slice(0,10)
  const [y, m, d] = ymd10.split('-')
  if (!y || !m || !d) return '—'
  return `${d}/${m}/${y}`
}

export function fmtDateTimeMX(iso?: string | null) {
  if (!iso) return '—'
  try {
    return new Intl.DateTimeFormat('es-MX', {
      timeZone: 'America/Mexico_City',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(iso))
  } catch {
    return String(iso)
  }
}

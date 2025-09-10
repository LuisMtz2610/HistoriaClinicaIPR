// lib/date.ts
/** Recibe un DATE de Postgres como 'YYYY-MM-DD' y lo muestra 'DD/MM/YYYY' sin timezone. */
export function fmtDateDDMMYYYY(ymd?: string | null) {
  if (!ymd) return '—'
  const [y, m, d] = ymd.split('-')
  if (!y || !m || !d) return ymd
  return `${d}/${m}/${y}`
}

/** Para <input type="date" /> usa SIEMPRE el string 'YYYY-MM-DD' o ''. */
export function toDateInputValue(ymd?: string | null) {
  return ymd ?? ''
}

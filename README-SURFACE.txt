Surfacing de funcionalidades — 20250909-0525

Incluye:
- Navbar: añade enlaces a /quotes (Presupuestos) y /consents (Consentimientos).
  *Archivo:* PATCHES/layout.tsx.patch.txt (aplica manualmente buscar/reemplazar si tu <nav> difiere).
- Página de lista: app/quotes/page.tsx con tabla, link a Ver/Imprimir y botón WhatsApp por fila.
- Fallback de detalle: app/quotes/[id]/page.fallback.tsx por si tu detalle actual es muy distinto y no muestra la firma/WA.

Pasos:
1) Agrega los enlaces al menú en tu layout usando el patch de texto (o pega las dos <a> en tu <nav>).
2) Añade la página de lista `app/quotes/page.tsx`.
3) Si tu detalle ya está bien, no uses el fallback. Si no ves la firma ni el botón, renombra temporalmente tu page.tsx a page.bak.tsx y usa este fallback como page.tsx; después integramos los bloques en tu página original.

Requisitos:
- Tablas: quotes, patients (ya las tienes).
- Variables de entorno NEXT_PUBLIC_SUPABASE_* correctas.

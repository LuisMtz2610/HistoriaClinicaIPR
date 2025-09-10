
Activación automática — 20250909-0459

Modificados:
- app/layout.tsx  -> + GlobalSearchKit en header/nav
- app/quotes/[id]/page.tsx -> + botón WhatsApp y + SignaturePadKit
- app/pacientes/[id]/page.tsx -> + PatientFilesPanelKit (MobileCapture)
- app/citas/[id]/page.tsx -> + AddToCalendarButtonKit (si existía)

Agregados:
- components/kit/* (GlobalSearch, WhatsApp, MobileCapture, SignaturePad, iCal button)
- app/api/ics-kit/[id]/route.ts

Requisitos:
- .env.local con NEXT_PUBLIC_SUPABASE_URL / ANON_KEY
- Opcional: WHATSAPP_TOKEN / WHATSAPP_PHONE_ID / COUNTRY_PREFIX


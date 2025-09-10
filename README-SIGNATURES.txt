
INTEGRACIÓN DE FIRMAS — 20250909-0451

Ya quedó integrada la firma en: app/quotes/[id]/page.tsx (sección al final, antes de imprimir).

Para CONSENTIMIENTOS, localiza la pantalla con cualquiera de estos comandos (en la raíz del repo):
- mac/linux:
  rg -n "consent" app | head
  rg -n "consents" app | head
  rg -n "consentimientos" app | head
- si no tienes ripgrep: grep -Rin "consent" app | head

Rutas probables (según tu estructura):
- app/consents/[id]/page.tsx
- app/consentimientos/[id]/page.tsx

En esa página, **importa** y **coloca** el bloque en el JSX:
  import ConsentSignatureSectionKit from '@/components/kit/ConsentSignatureSectionKit'
  <ConsentSignatureSectionKit patientId={patient.id} consentId={params.id} />

Si prefieres no usar el section wrapper, puedes usar directamente el Pad:
  import SignaturePadKit from '@/components/kit/SignaturePadKit'
  <SignaturePadKit patientId={patient.id} consentId={params.id} />

El archivo PNG se guarda en Supabase Storage:
  clinical-files/patients/{patientId}/signatures/{consentId}-TIMESTAMP.png

Notas:
- No requiere migración de DB — la ruta del archivo puede guardarse después en tu tabla si lo deseas.
- El componente funciona también en móvil (touch).


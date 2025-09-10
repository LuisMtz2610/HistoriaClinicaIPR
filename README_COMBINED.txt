COMBINADO — Imprimibles + Menú + Tailwind + Listas + Historial + Fix rutas

PASOS IMPORTANTES:
1) Elimina rutas duplicadas dentro de (clinic) si existen (para evitar "two parallel pages"):
   - app/(clinic)/prescriptions/page.tsx
   - app/(clinic)/radiology-orders/page.tsx
   - app/(clinic)/lab-orders/page.tsx
   - app/(clinic)/consents/page.tsx

   Conserva las top-level:
   - app/prescriptions/page.tsx
   - app/radiology-orders/page.tsx
   - app/lab-orders/page.tsx
   - app/consents/page.tsx

2) Asegura los estilos:
   - app/layout.tsx ya importa "../styles/tw.css" y "./ui-fixes.css".
   - No toques tu app/globals.css.

3) Botones desde Historia Clínica (NO sobreescribo tu archivo grande):
   - Aplica el patch `patches/pacientes__id__page_buttons.diff` sobre tu app/pacientes/[id]/page.tsx
     (o agrega manualmente el import y el bloque indicados en el diff).

4) Historial por paciente:
   - Disponible en /pacientes/[id]/printables

5) Datos de la clínica y domicilio al pie:
   - Edita si hace falta en app/(clinic)/_lib/clinic.ts
   - Logo esperado en /public/logo-clinica.png

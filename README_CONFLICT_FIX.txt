Solución a:
"You cannot have two parallel pages that resolve to the same path"

CAUSA:
Tienes dos rutas para el mismo path en App Router:
- app/(clinic)/prescriptions/page.tsx
- app/prescriptions/page.tsx
(Lo mismo para radiology-orders, lab-orders, consents).

OPCIÓN RECOMENDADA (mantener SOLO top-level):
1) **ELIMINA** estos archivos si existen:
   - app/(clinic)/prescriptions/page.tsx
   - app/(clinic)/radiology-orders/page.tsx
   - app/(clinic)/lab-orders/page.tsx
   - app/(clinic)/consents/page.tsx

2) Conserva los top-level que te mandé:
   - app/prescriptions/page.tsx
   - app/radiology-orders/page.tsx
   - app/lab-orders/page.tsx
   - app/consents/page.tsx

Botonera en Historia clínica:
- Ya te dejo actualizado el componente para que el link de historial sea
  /pacientes/[id]/printables en lugar de /patients/...

También te agrego la página:
- app/pacientes/[id]/printables/page.tsx

Tras copiar este ZIP, reinicia el dev server.

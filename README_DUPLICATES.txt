El error de rutas duplicadas persiste si existen archivos dentro de (clinic)
que compitan con las rutas top-level. Borra, si existen:

En listados:
- app/(clinic)/prescriptions/page.tsx
- app/(clinic)/radiology-orders/page.tsx
- app/(clinic)/lab-orders/page.tsx
- app/(clinic)/consents/page.tsx

En formularios (new):
- app/(clinic)/prescriptions/new/page.tsx
- app/(clinic)/radiology-orders/new/page.tsx
- app/(clinic)/lab-orders/new/page.tsx
- app/(clinic)/consents/new/page.tsx

Luego reinicia el dev server.

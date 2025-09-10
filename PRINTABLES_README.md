# Imprimibles — Integración rápida

Rutas incluidas:
- /prescriptions/new → guarda en public.prescriptions → /prescriptions/[id]/print
- /radiology-orders/new → public.radiology_orders → /radiology-orders/[id]/print
- /lab-orders/new → public.lab_orders → /lab-orders/[id]/print
- /consents/new → public.consents → /consents/[id]/print

Todos los impresos usan:
- app/(clinic)/_components/PrintHeader.tsx (logo + datos doctora)
- app/(clinic)/_components/PrintFooter.tsx (domicilio al pie)
- app/(clinic)/_lib/clinic.ts (edita aquí logo/datos si cambian)

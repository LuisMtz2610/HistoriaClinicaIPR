ALL-IN-ONE — Proyecto listo sin duplicados y con imprimibles

INCLUYE
- Tailwind y fix impresión
- Layout con menú
- Datos de la clínica y componentes de impresión
- Botonera PatientPrintableActions
- Formularios + impresión top-level (Recetas, RX, Lab, Consentimientos)
- Listados top-level
- Historial de imprimibles por paciente (/pacientes/[id]/printables)
- Snippet para botones: agrega import y bloque (ver abajo)

PASOS
1) **Backup/commit** de tu repo.
2) Descomprime este ZIP **encima** de tu proyecto.
3) Ejecuta el **eliminador de duplicados** (confirmaste que sí):
   - Node: `node scripts/DELETE_DUPLICATE_ROUTES.mjs`
   - PowerShell: `powershell -ExecutionPolicy Bypass -File scripts/DELETE_DUPLICATE_ROUTES.ps1`
4) Reinicia el dev server.

SNIPPET (solo si no ves los botones en Historia Clínica)
En `app/pacientes/[id]/page.tsx` agrega:
  import PatientPrintableActions from "@/app/(clinic)/_components/PatientPrintableActions";
y debajo del encabezado:
  <div className="mt-2">
    <PatientPrintableActions patientId={p.id} />
  </div>

Logo esperado en `/public/logo-clinica.png`.

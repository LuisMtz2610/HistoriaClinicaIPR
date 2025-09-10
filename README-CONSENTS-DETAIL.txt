Pantalla de detalle para Consentimientos — 20250909-0502

Añadido:
- app/consents/[id]/page.tsx: muestra título, cuerpo y paciente; integra firma táctil.
- app/consents/[id]/actions.ts: server action para guardar 'signature_path' en la tabla consents (si existe).
- components/kit/ConsentSignatureSectionKit.tsx: wrapper (cliente) que pasa onSaved a SignaturePadKit.
- components/kit/SignaturePadKit.tsx: incluido por si no lo tenías.

Ruta de impresión existente: /consents/[id]/print (se conserva link "Imprimir").

Notas:
- Si tu tabla consents no tiene columna 'signature_path', la firma igualmente se guarda en storage y el guardado en DB se ignora de forma segura.
- Bucket por defecto: 'clinical-files'. Ajusta si usas otro.

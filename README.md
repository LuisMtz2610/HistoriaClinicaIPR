# Clínica Odontológica Integral — Starter (Next.js + Supabase)

MVP para gestionar pacientes, historias clínicas y archivos con subida de imágenes.

## Requisitos
- Node 18+
- Cuenta de Supabase con un proyecto y un bucket privado llamado `clinical-files`.

## Pasos
1. Clona este proyecto y ejecuta `npm install`.
2. Crea variables de entorno:
   - Copia `.env.example` a `.env.local` y rellena `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
3. En Supabase, pega y ejecuta `supabase/schema.sql` para crear tablas.
4. En Storage, crea el bucket privado `clinical-files`.
5. Ejecuta `npm run dev` y abre `http://localhost:3000`.

> Nota: Este starter no incluye autenticación/RLS para simplificar la prueba. En producción activa RLS como se detalla al final del SQL.

## Estructura
- `app/` páginas Next.js (App Router)
- `components/` componentes UI
- `lib/supabase.ts` cliente Supabase
- `public/` logos/banner
- `supabase/schema.sql` tablas + políticas

## Personalización rápida
- Colores en `tailwind.config.ts` (palette `brand`).
- Título y navbar en `app/layout.tsx`.
- Campos del paciente en `app/pacientes/new/page.tsx`.
- Tipos de archivo en `components/UploadPatientFile.tsx`.

## Licencia
MIT

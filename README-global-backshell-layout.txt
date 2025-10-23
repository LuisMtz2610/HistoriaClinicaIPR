# AppShell con botón Volver global

## Archivos
- components/BackButton.tsx
- components/AppShell.tsx
- app/layout.tsx
- app/(clinic)/layout.tsx

## Instalación
1. Copia estos archivos en tu repo respetando las rutas.
2. Asegúrate de tener Tailwind y tus clases (`btn`, `page-title`, `card`) ya cargadas en `app/globals.css`.
3. Si ya tienes `app/layout.tsx` existente con configuraciones especiales (fuentes, providers), **fusiona** los cambios:
   - Mantén tus Providers/Theme y **envuelve** `{children}` con `<AppShell>...</AppShell>` dentro del `<body>`.
   - Mantén tu import de `./globals.css`.

## Notas
- El header es **sticky** y minimalista. Si alguna página ya tiene su propio header, el Back button no interfiere (queda arriba).
- Puedes esconder el Back en rutas específicas modificando `AppShell` y controlando por `usePathname()` si lo necesitas.

## Windows: error EBUSY (webpack cache)
Si ves `EBUSY: resource busy or locked` al levantar el dev server:
1. Detén `npm run dev` y cierra editores que tengan abiertos archivos bajo `.next`.
2. Borra caches:
   - PowerShell: `rm -Recurse -Force .\.next`
3. Para evitarlo en desarrollo Windows, deshabilita cache:
   - Una sesión: `$env:NEXT_DISABLE_WEBPACK_CACHE="1"; npm run dev`
   - Permanente: `setx NEXT_DISABLE_WEBPACK_CACHE "1"` (abre nueva terminal).

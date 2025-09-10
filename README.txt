Parches para unificar fondo en toda la app y mantener blanco en impresión.

Archivos:
- app/layout.tsx  → elimina clases bg-* del <body>; el fondo se toma desde CSS
- app/globals.css → define :root{ --app-bg } y aplica a html,body. @media print fuerza blanco.

Si quieres ajustar el tono, cambia --app-bg en app/globals.css.

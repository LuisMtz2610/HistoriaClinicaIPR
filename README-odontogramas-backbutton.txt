- Componente reutilizable: components/BackButton.tsx
  Usa router.back() para regresar a la página inmediata anterior.

- Páginas de odontogramas actualizadas para mostrar BackButton:
  * /pacientes/[id]/odontogramas
  * /pacientes/[id]/odontogramas/[ogid]
  * /pacientes/[id]/odontogramas/compare
  (y sus mirrors en /patients/...)

- Snippet para añadir el acceso desde la ficha del paciente:
  patches/insert-odontogram-link.txt

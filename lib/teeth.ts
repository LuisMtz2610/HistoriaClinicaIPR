// Orden FDI en 4 cuadrantes, como en el odontograma diagnóstico
export const upperRight = ['18','17','16','15','14','13','12','11'];
export const upperLeft  = ['21','22','23','24','25','26','27','28'];
export const lowerLeft  = ['38','37','36','35','34','33','32','31'];
export const lowerRight = ['41','42','43','44','45','46','47','48'];

export const fdiRows = [
  [...upperRight, ...upperLeft],  // fila superior
  [...lowerRight, ...lowerLeft],  // fila inferior
];

// Lista completa utilitaria
export const adultTeeth = [...upperRight, ...upperLeft, ...lowerLeft, ...lowerRight];

// Códigos del odontograma (0..17 y 9, 11..17) — ver leyenda del PDF
export const odontogramaCodes: { value: number; label: string }[] = [
  { value: 0,  label: 'Sano' },
  { value: 1,  label: 'Con caries' },
  { value: 2,  label: 'Obturado con caries' },
  { value: 3,  label: 'Obturado sin caries' },
  { value: 4,  label: 'Perdido por caries' },
  { value: 5,  label: 'Perdido otra causa' },
  { value: 6,  label: 'Fisura obturada' },
  { value: 7,  label: 'Soporte/corona/implante' },
  { value: 8,  label: 'Sin erupcionar' },
  { value: 9,  label: 'No registrado' },
  { value: 11, label: 'Recesión gingival' },
  { value: 12, label: 'Tratamiento de conductos' },
  { value: 13, label: 'Instrumento separado' },
  { value: 14, label: 'Bolsas periodontales' },
  { value: 15, label: 'Fluorosis' },
  { value: 16, label: 'Alteraciones morfológicas' },
  { value: 17, label: 'Lesión endoperiodontal' },
];

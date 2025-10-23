'use client';

import { usePathname } from 'next/navigation';
import BackButton from '@/components/BackButton';

type Props = {
  /** Rutas donde NO debe mostrarse el botón (por defecto solo la home) */
  hideOn?: string[];
  /** Texto del botón (opcional, reusa el de BackButton) */
  label?: string;
  /** Clases extra para el botón (si quieres ajustar estilos) */
  className?: string;
};

export default function BackMaybe({
  hideOn = ['/'],
  label = 'Volver',
  className = '',
}: Props) {
  const pathname = usePathname() || '/';
  if (hideOn.includes(pathname)) return null;
  return <BackButton label={label} />;
}

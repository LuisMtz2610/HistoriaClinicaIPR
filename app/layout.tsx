import "./globals.css";
import "../styles/tw.css";
import "./ui-fixes.css";
import GlobalSearchKit from '@/components/kit/GlobalSearchKit'
import MobileNav from '@/components/MobileNav'

import Image from "next/image";
import Link from "next/link";
import AuthInit from "@/components/AuthInit";
import BackMaybe from '@/components/BackMaybe';

export const metadata = {
  title: "Clínica Odontológica Integral",
  description: "Historia clínica e imprimibles",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className="min-h-screen text-neutral-900">
        <header className="border-b bg-white sticky top-0 z-30">
          <div className="mx-auto max-w-6xl px-4 h-16 flex items-center gap-3">

            {/* Hamburguesa — solo en móvil/tablet (<lg) */}
            <MobileNav />

            {/* Logo */}
            <Image
              src="/logo-clinica.png"
              alt="Logo"
              width={36}
              height={36}
              className="rounded-full shrink-0"
            />

            {/* Botón Volver (se oculta en '/') */}
            <BackMaybe />

            {/* Nombre — se oculta en pantallas muy pequeñas */}
            <div className="font-semibold hidden sm:block whitespace-nowrap">
              Clínica Odontológica Integral
            </div>

            {/* Buscador global — flexible */}
            <div className="flex-1 max-w-xs hidden md:block">
              <GlobalSearchKit />
            </div>

            {/* Nav desktop — solo visible en lg+ */}
            <nav className="ml-auto hidden lg:flex items-center gap-5 text-sm">
              <Link href="/"                 className="hover:text-brand transition">Inicio</Link>
              <Link href="/pacientes"        className="hover:text-brand transition">Pacientes</Link>
              <Link href="/citas"            className="hover:text-brand transition">Citas</Link>
              <Link href="/quotes"           className="hover:text-brand transition">Presupuestos</Link>
              <Link href="/prescriptions"    className="hover:text-brand transition">Recetas</Link>
              <Link href="/radiology-orders" className="hover:text-brand transition">RX</Link>
              <Link href="/lab-orders"       className="hover:text-brand transition">Lab</Link>
              <Link href="/consents"         className="hover:text-brand transition">Consentimientos</Link>
            </nav>

          </div>

          {/* Buscador en móvil — segunda fila, solo si hay espacio */}
          <div className="md:hidden border-t px-4 py-2">
            <GlobalSearchKit />
          </div>
        </header>

        <AuthInit />
        <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
      </body>
    </html>
  );
}

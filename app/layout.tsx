import "./globals.css";
import "../styles/tw.css";
import "./ui-fixes.css";
import GlobalSearchKit from '@/components/kit/GlobalSearchKit'

import Image from "next/image";
import Link from "next/link";
import AuthInit from "@/components/AuthInit";

// ⬇️ nuevo: wrapper que oculta el botón en la Home
import BackMaybe from '@/components/BackMaybe';

export const metadata = {
  title: "Clínica Odontológica Integral",
  description: "Historia clínica e imprimibles",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className="min-h-screen text-neutral-900">
        <header className="border-b bg-white">
        <GlobalSearchKit />
          <div className="mx-auto max-w-6xl px-4 h-16 flex items-center gap-4">
            <Image src="/logo-clinica.png" alt="Logo" width={36} height={36} className="rounded-full" />
            {/* ⬇️ botón Volver (se oculta en '/') */}
            <BackMaybe />

            <div className="font-semibold">Clínica Odontológica Integral</div>
            <nav className="ml-auto flex items-center gap-6 text-sm">
              <Link href="/" className="hover:text-emerald-700">Inicio</Link>
              <Link href="/pacientes" className="hover:text-emerald-700">Pacientes</Link>
              <Link href="/quotes" className="px-2 py-1 rounded hover:bg-gray-100">Presupuestos</Link>
              <Link href="/citas" className="hover:text-emerald-700">Citas</Link>
              <Link href="/prescriptions" className="hover:text-emerald-700">Recetas</Link>
              <Link href="/radiology-orders" className="hover:text-emerald-700">RX</Link>
              <Link href="/lab-orders" className="hover:text-emerald-700">Lab</Link>
              <Link href="/consents" className="hover:text-emerald-700">Consentimientos</Link>
            </nav>
          </div>
        </header>
        <AuthInit />
        <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
      </body>
    </html>
  );
}

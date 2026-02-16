import "./globals.css"
import "../styles/tw.css"
import "./ui-fixes.css"
import type { Metadata } from "next"
import AuthInit from "@/components/AuthInit"
import AppShell from "@/components/AppShell"

export const metadata: Metadata = {
  title: "Clínica Odontológica Integral",
  description: "Historia clínica e imprimibles",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className="min-h-screen text-neutral-900">
        <AuthInit />
        <AppShell>{children}</AppShell>
      </body>
    </html>
  )
}

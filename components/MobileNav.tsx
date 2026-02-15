'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const NAV_LINKS = [
  { href: '/',                  label: 'Inicio',           icon: '🏠' },
  { href: '/pacientes',         label: 'Pacientes',        icon: '👤' },
  { href: '/citas',             label: 'Citas',            icon: '📅' },
  { href: '/quotes',            label: 'Presupuestos',     icon: '💰' },
  { href: '/prescriptions',     label: 'Recetas',          icon: '💊' },
  { href: '/radiology-orders',  label: 'Radiología',       icon: '🩻' },
  { href: '/lab-orders',        label: 'Laboratorio',      icon: '🧪' },
  { href: '/consents',          label: 'Consentimientos',  icon: '📄' },
]

export default function MobileNav() {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()

  // Cerrar al navegar
  useEffect(() => { setOpen(false) }, [pathname])

  // Bloquear scroll del body cuando está abierto
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  return (
    <>
      {/* Botón hamburguesa — solo visible en <lg */}
      <button
        onClick={() => setOpen(o => !o)}
        className="lg:hidden flex flex-col justify-center items-center w-10 h-10 rounded-xl hover:bg-gray-100 transition shrink-0"
        aria-label={open ? 'Cerrar menú' : 'Abrir menú'}
        aria-expanded={open}
      >
        <span className={`block w-5 h-0.5 bg-gray-700 transition-all duration-200 ${open ? 'rotate-45 translate-y-1.5' : ''}`} />
        <span className={`block w-5 h-0.5 bg-gray-700 mt-1 transition-all duration-200 ${open ? 'opacity-0' : ''}`} />
        <span className={`block w-5 h-0.5 bg-gray-700 mt-1 transition-all duration-200 ${open ? '-rotate-45 -translate-y-1.5' : ''}`} />
      </button>

      {/* Overlay backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm lg:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Panel lateral deslizante */}
      <div
        className={[
          'fixed top-0 left-0 h-full w-72 z-50 bg-white shadow-2xl flex flex-col',
          'transition-transform duration-300 ease-in-out lg:hidden',
          open ? 'translate-x-0' : '-translate-x-full',
        ].join(' ')}
      >
        {/* Cabecera del panel */}
        <div className="flex items-center justify-between px-5 py-4 border-b bg-brand">
          <span className="font-semibold text-white text-base">Clínica Odontológica</span>
          <button
            onClick={() => setOpen(false)}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-white/80 hover:text-white hover:bg-white/20 transition"
            aria-label="Cerrar menú"
          >
            ✕
          </button>
        </div>

        {/* Links de navegación */}
        <nav className="flex-1 overflow-y-auto py-3 px-3">
          {NAV_LINKS.map(link => {
            const active = pathname === link.href ||
              (link.href !== '/' && pathname.startsWith(link.href))
            return (
              <Link
                key={link.href}
                href={link.href}
                className={[
                  'flex items-center gap-3 px-4 py-3 rounded-xl mb-1 text-sm font-medium transition',
                  active
                    ? 'bg-brand text-white'
                    : 'text-gray-700 hover:bg-gray-100',
                ].join(' ')}
              >
                <span className="text-lg w-6 text-center">{link.icon}</span>
                {link.label}
              </Link>
            )
          })}
        </nav>

        {/* Acciones rápidas al fondo */}
        <div className="border-t px-4 py-4 space-y-2">
          <Link
            href="/pacientes/new"
            className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-brand text-white text-sm font-medium hover:bg-brand-dark transition"
          >
            <span>➕</span> Nuevo paciente
          </Link>
          <Link
            href="/citas/new"
            className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl border border-brand text-brand text-sm font-medium hover:bg-brand/5 transition"
          >
            <span>🗓️</span> Nueva cita
          </Link>
        </div>
      </div>
    </>
  )
}

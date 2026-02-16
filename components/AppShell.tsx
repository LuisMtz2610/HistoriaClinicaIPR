'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import GlobalSearchKit from '@/components/kit/GlobalSearchKit'

/* ══════════════════════════════════════════════════════════════
   NAV STRUCTURE
══════════════════════════════════════════════════════════════ */
const NAV = [
  {
    group: null,
    items: [
      { href: '/',         icon: HomeIcon,        label: 'Inicio' },
      { href: '/pacientes', icon: PatientIcon,     label: 'Pacientes' },
      { href: '/citas',     icon: CalendarIcon,    label: 'Agenda' },
    ],
  },
  {
    group: 'Documentos',
    items: [
      { href: '/quotes',           icon: QuoteIcon,      label: 'Presupuestos' },
      { href: '/prescriptions',    icon: PrescIcon,      label: 'Recetas' },
      { href: '/consents',         icon: ConsentIcon,    label: 'Consentimientos' },
    ],
  },
  {
    group: 'Órdenes',
    items: [
      { href: '/radiology-orders', icon: XrayIcon,       label: 'Radiología' },
      { href: '/lab-orders',       icon: LabIcon,        label: 'Laboratorio' },
    ],
  },
  {
    group: 'Configuración',
    items: [
      { href: '/services',         icon: ServiceIcon,    label: 'Catálogo' },
    ],
  },
]

const QUICK_ACTIONS = [
  { href: '/pacientes/new', label: 'Nuevo paciente', icon: '👤' },
  { href: '/citas/new',     label: 'Nueva cita',     icon: '📅' },
  { href: '/quotes/new',    label: 'Presupuesto',    icon: '💰' },
]

/* ══════════════════════════════════════════════════════════════
   APP SHELL
══════════════════════════════════════════════════════════════ */
export default function AppShell({ children }: { children: React.ReactNode }) {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const pathname = usePathname()

  // Cerrar drawer al navegar
  useEffect(() => { setDrawerOpen(false) }, [pathname])

  // Bloquear scroll body
  useEffect(() => {
    document.body.style.overflow = drawerOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [drawerOpen])

  return (
    <div className="flex min-h-screen" style={{ background: 'var(--bg, #F7F8FA)' }}>

      {/* ══ SIDEBAR — desktop (lg+) ══════════════════════════ */}
      <aside className="hidden lg:flex flex-col w-60 xl:w-64 shrink-0 fixed top-0 left-0 h-screen z-30"
        style={{ background: '#111827' }}>
        <SidebarContent pathname={pathname} />
      </aside>

      {/* ══ OVERLAY MÓVIL ════════════════════════════════════ */}
      {drawerOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
          onClick={() => setDrawerOpen(false)}
        />
      )}

      {/* ══ DRAWER MÓVIL ═════════════════════════════════════ */}
      <div className={[
        'fixed top-0 left-0 h-full w-64 z-50 flex flex-col transition-transform duration-300 ease-in-out lg:hidden',
        drawerOpen ? 'translate-x-0' : '-translate-x-full',
      ].join(' ')} style={{ background: '#111827' }}>
        <SidebarContent pathname={pathname} onClose={() => setDrawerOpen(false)} />
      </div>

      {/* ══ ZONA PRINCIPAL ═══════════════════════════════════ */}
      <div className="flex-1 flex flex-col min-h-screen lg:pl-60 xl:pl-64">

        {/* Topbar */}
        <header className="sticky top-0 z-20 h-14 flex items-center gap-3 px-4 border-b border-gray-200/80"
          style={{ background: 'rgba(247,248,250,0.92)', backdropFilter: 'blur(12px)' }}>

          {/* Hamburguesa */}
          <button
            onClick={() => setDrawerOpen(o => !o)}
            className="lg:hidden w-9 h-9 rounded-xl flex flex-col justify-center items-center gap-1.5 hover:bg-gray-100 transition shrink-0"
            aria-label="Menú"
          >
            <span className={`block w-4.5 h-0.5 bg-gray-600 transition-all duration-200 ${drawerOpen ? 'rotate-45 translate-y-2' : ''}`} style={{ width: 18 }}/>
            <span className={`block h-0.5 bg-gray-600 transition-all duration-200 ${drawerOpen ? 'opacity-0 scale-x-0' : ''}`} style={{ width: 18 }}/>
            <span className={`block h-0.5 bg-gray-600 transition-all duration-200 ${drawerOpen ? '-rotate-45 -translate-y-2' : ''}`} style={{ width: 18 }}/>
          </button>

          {/* Logo móvil */}
          <div className="lg:hidden flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg overflow-hidden bg-brand flex items-center justify-center">
              <LogoFallback size={18} />
            </div>
            <span className="text-sm font-semibold text-gray-800">Clínica</span>
          </div>

          {/* Breadcrumb de página activa */}
          <div className="hidden lg:block">
            <Breadcrumb pathname={pathname} />
          </div>

          {/* Buscador global */}
          <div className="flex-1 max-w-xs hidden md:block px-3">
            <GlobalSearchKit />
          </div>

          <div className="ml-auto flex items-center gap-2">
            {/* Acción rápida desktop */}
            <div className="hidden md:flex items-center gap-1.5">
              {QUICK_ACTIONS.map(a => (
                <Link key={a.href} href={a.href}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border border-gray-200 text-gray-600 hover:border-brand hover:text-brand hover:bg-brand/5 transition">
                  <span>{a.icon}</span>
                  <span>{a.label}</span>
                </Link>
              ))}
            </div>
          </div>
        </header>

        {/* Contenido */}
        <main className="flex-1 px-4 lg:px-6 py-5 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>

      <style>{`
        :root { --sidebar-w: 240px; }
        @media(min-width:1280px){ --sidebar-w: 256px; }
      `}</style>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════
   SIDEBAR CONTENT (compartido desktop + drawer)
══════════════════════════════════════════════════════════════ */
function SidebarContent({ pathname, onClose }: { pathname: string; onClose?: () => void }) {
  return (
    <>
      {/* Logo / Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b shrink-0" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
        <Link href="/" className="flex items-center gap-3 min-w-0" onClick={onClose}>
          <div className="w-8 h-8 rounded-xl overflow-hidden shrink-0 flex items-center justify-center"
            style={{ background: 'rgba(43,156,147,0.25)', border: '1px solid rgba(43,156,147,0.4)' }}>
            <LogoFallback size={20} />
          </div>
          <div className="min-w-0">
            <div className="text-sm font-bold text-white leading-tight truncate">Clínica Dental</div>
            <div className="text-[10px] leading-tight" style={{ color: 'rgba(255,255,255,0.4)' }}>Sistema de gestión</div>
          </div>
        </Link>
        {onClose && (
          <button onClick={onClose} className="w-7 h-7 rounded-lg flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 transition text-sm shrink-0">
            ✕
          </button>
        )}
      </div>

      {/* Nav links */}
      <nav className="flex-1 overflow-y-auto py-3 px-3 space-y-0.5">
        {NAV.map((section, si) => (
          <div key={si} className={si > 0 ? 'mt-4' : ''}>
            {section.group && (
              <div className="px-3 pb-1.5 text-[10px] font-bold uppercase tracking-widest"
                style={{ color: 'rgba(255,255,255,0.3)' }}>
                {section.group}
              </div>
            )}
            {section.items.map(item => {
              const active = item.href === '/'
                ? pathname === '/'
                : pathname === item.href || pathname.startsWith(item.href + '/')
              const Icon = item.icon
              return (
                <Link key={item.href} href={item.href} onClick={onClose}
                  className={[
                    'relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all group',
                    active
                      ? 'text-white'
                      : 'hover:bg-white/8',
                  ].join(' ')}
                  style={active ? { background: 'rgba(43,156,147,0.25)', color: '#fff' } : { color: 'rgba(255,255,255,0.6)' }}
                >
                  {/* Indicador activo */}
                  {active && (
                    <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-r-full"
                      style={{ background: '#2B9C93' }}/>
                  )}
                  <span className={`w-5 text-center shrink-0 text-base transition-opacity ${active ? 'opacity-100' : 'opacity-50 group-hover:opacity-80'}`}>
                    <Icon size={17} />
                  </span>
                  <span>{item.label}</span>
                </Link>
              )
            })}
          </div>
        ))}
      </nav>

      {/* Acciones rápidas al fondo */}
      <div className="px-3 py-3 space-y-1.5 border-t shrink-0" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
        <div className="px-3 pb-1 text-[10px] font-bold uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.3)' }}>
          Crear nuevo
        </div>
        {QUICK_ACTIONS.map(a => (
          <Link key={a.href} href={a.href} onClick={onClose}
            className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition"
            style={{ color: 'rgba(255,255,255,0.55)' }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(43,156,147,0.15)'; (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.9)' }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.55)' }}
          >
            <span className="w-5 text-center">{a.icon}</span>
            <span>{a.label}</span>
            <span className="ml-auto text-xs opacity-40">+</span>
          </Link>
        ))}
      </div>
    </>
  )
}

/* ══════════════════════════════════════════════════════════════
   BREADCRUMB
══════════════════════════════════════════════════════════════ */
const ROUTE_LABELS: Record<string, string> = {
  '':              'Inicio',
  'pacientes':     'Pacientes',
  'citas':         'Agenda',
  'quotes':        'Presupuestos',
  'prescriptions': 'Recetas',
  'consents':      'Consentimientos',
  'radiology-orders': 'Radiología',
  'lab-orders':    'Laboratorio',
  'services':      'Catálogo',
  'new':           'Nuevo',
  'historia':      'Historia clínica',
  'odontogramas':  'Odontogramas',
  'printables':    'Imprimibles',
  'print':         'Imprimir',
}

function Breadcrumb({ pathname }: { pathname: string }) {
  const segments = pathname.split('/').filter(Boolean)
  if (segments.length === 0) return (
    <span className="text-sm font-semibold text-gray-700">Inicio</span>
  )

  return (
    <div className="flex items-center gap-1.5 text-sm">
      <Link href="/" className="text-gray-400 hover:text-brand transition">Inicio</Link>
      {segments.map((seg, i) => {
        const isLast = i === segments.length - 1
        const isId   = /^[0-9a-f-]{8,}$/i.test(seg)
        const label  = ROUTE_LABELS[seg] ?? (isId ? '…' : seg)
        const href   = '/' + segments.slice(0, i + 1).join('/')
        return (
          <React.Fragment key={i}>
            <span className="text-gray-300">/</span>
            {isLast
              ? <span className="font-semibold text-gray-800">{label}</span>
              : <Link href={href} className="text-gray-400 hover:text-brand transition">{label}</Link>
            }
          </React.Fragment>
        )
      })}
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════
   LOGO FALLBACK (SVG inline — sin depender de next/image)
══════════════════════════════════════════════════════════════ */
function LogoFallback({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M12 3C9.5 3 7.5 5 7.5 7.5c0 1.5.7 2.8 1.8 3.7L12 13l2.7-1.8c1.1-.9 1.8-2.2 1.8-3.7C16.5 5 14.5 3 12 3z" fill="#2B9C93"/>
      <path d="M8.5 14.5C6.5 15.5 5 17.5 5 20h14c0-2.5-1.5-4.5-3.5-5.5L12 16l-3.5-1.5z" fill="#4FB7AE" opacity=".8"/>
    </svg>
  )
}

/* ══════════════════════════════════════════════════════════════
   ICONOS SVG (inline, sin dependencias externas)
══════════════════════════════════════════════════════════════ */
type IconProps = { size?: number }

function HomeIcon({ size = 16 }: IconProps) {
  return <svg width={size} height={size} viewBox="0 0 20 20" fill="currentColor"><path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h4a1 1 0 001-1v-3h2v3a1 1 0 001 1h4a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z"/></svg>
}
function PatientIcon({ size = 16 }: IconProps) {
  return <svg width={size} height={size} viewBox="0 0 20 20" fill="currentColor"><path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z"/></svg>
}
function CalendarIcon({ size = 16 }: IconProps) {
  return <svg width={size} height={size} viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd"/></svg>
}
function QuoteIcon({ size = 16 }: IconProps) {
  return <svg width={size} height={size} viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h4a1 1 0 100-2H7z" clipRule="evenodd"/></svg>
}
function PrescIcon({ size = 16 }: IconProps) {
  return <svg width={size} height={size} viewBox="0 0 20 20" fill="currentColor"><path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z"/><path fillRule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clipRule="evenodd"/></svg>
}
function ConsentIcon({ size = 16 }: IconProps) {
  return <svg width={size} height={size} viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 2a1 1 0 011 1v1.323l3.954 1.582 1.599-.8a1 1 0 01.894 1.79l-1.233.616 1.738 5.42a1 1 0 01-.285 1.05A3.989 3.989 0 0115 14a3.989 3.989 0 01-2.667-1.019 1 1 0 01-.285-1.05l1.715-5.349L11 6.477V16h2a1 1 0 110 2H7a1 1 0 110-2h2V6.477L6.237 7.582l1.715 5.349a1 1 0 01-.285 1.05A3.989 3.989 0 015 15a3.989 3.989 0 01-2.667-1.019 1 1 0 01-.285-1.05l1.738-5.42-1.233-.617a1 1 0 01.894-1.788l1.599.799L9 4.323V3a1 1 0 011-1z" clipRule="evenodd"/></svg>
}
function XrayIcon({ size = 16 }: IconProps) {
  return <svg width={size} height={size} viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd"/></svg>
}
function LabIcon({ size = 16 }: IconProps) {
  return <svg width={size} height={size} viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M7 2a1 1 0 00-.707 1.707L7 4.414v3.758a1 1 0 01-.293.707l-4 4C1.03 14.663 2.062 17 3.998 17h12c1.936 0 2.969-2.337 1.29-4.121l-4-4A1 1 0 0113 8.172V4.414l.707-.707A1 1 0 0013 2H7zm2 6.172V4h2v4.172a3 3 0 00.879 2.12l1.027 1.028a4 4 0 00-2.171.836l-.07.087-.063-.093a4 4 0 00-2.14-.83l1.027-1.028A3 3 0 009 8.172z" clipRule="evenodd"/></svg>
}
function ServiceIcon({ size = 16 }: IconProps) {
  return <svg width={size} height={size} viewBox="0 0 20 20" fill="currentColor"><path d="M7 3a1 1 0 000 2h6a1 1 0 100-2H7zM4 7a1 1 0 011-1h10a1 1 0 110 2H5a1 1 0 01-1-1zM2 11a2 2 0 012-2h12a2 2 0 012 2v4a2 2 0 01-2 2H4a2 2 0 01-2-2v-4z"/></svg>
}

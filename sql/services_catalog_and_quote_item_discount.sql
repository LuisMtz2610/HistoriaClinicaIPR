-- Añade catálogo de servicios y descuento por partida (Presupuestos)
-- Ejecuta en Supabase SQL Editor

create table if not exists public.services_catalog (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  unit_price numeric(12,2) not null default 0,
  created_at timestamptz not null default now()
);

-- Nota: si tu tabla quote_items ya existe, esto añade el descuento por servicio.
alter table public.quote_items
  add column if not exists discount numeric(12,2) not null default 0;

-- Si NO tienes line_total en quote_items, puedes descomentar esto para que exista.
-- alter table public.quote_items
--   add column if not exists line_total numeric(12,2);

-- Recomendación opcional: si quieres que line_total se recalcule en DB cuando cambie qty/precio/descuento,
-- podrías migrar a columna GENERATED (depende de tu esquema actual).

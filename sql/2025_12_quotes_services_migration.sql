-- 2025_12_quotes_services_migration.sql
-- Agrega: vigencia, descuento/impuestos a quote; descuento por renglón; catálogo de servicios.

alter table public.quotes
  add column if not exists valid_until date,
  add column if not exists discount numeric(12,2) not null default 0,
  add column if not exists tax numeric(12,2) not null default 0,
  add column if not exists terms text;

-- Nota: quotes.total ya existe; se actualiza desde el front.

alter table public.quote_items
  add column if not exists discount numeric(12,2) not null default 0;

create table if not exists public.services_catalog (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  unit_price numeric(12,2) not null default 0,
  created_at timestamptz default now()
);

-- Índice útil para búsqueda
create index if not exists idx_services_catalog_name on public.services_catalog (name);

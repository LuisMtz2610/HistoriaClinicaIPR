
create table if not exists public.quotes (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients(id) on delete cascade,
  author_id uuid references auth.users(id),
  created_at timestamptz default now(),
  diagnosis text,
  notes text,
  total numeric(12,2) not null default 0
);

create table if not exists public.quote_items (
  id uuid primary key default gen_random_uuid(),
  quote_id uuid not null references public.quotes(id) on delete cascade,
  concept text not null,
  qty numeric(10,2) not null default 1,
  unit_price numeric(12,2) not null default 0,
  subtotal numeric(12,2) generated always as (qty * unit_price) stored
);

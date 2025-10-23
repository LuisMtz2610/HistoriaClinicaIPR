-- odontograms.sql (v2 con ALTERs seguros)
create extension if not exists pgcrypto;

create table if not exists public.odontograms (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients(id) on delete cascade,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  note text,
  state jsonb not null,
  svg text,
  image_path text
);

alter table public.odontograms
  add column if not exists created_at timestamptz;

update public.odontograms set created_at = now() where created_at is null;

alter table public.odontograms
  alter column created_at set default now(),
  alter column created_at set not null;

create index if not exists idx_odontograms_patient_created
  on public.odontograms(patient_id, created_at desc);

alter table public.odontograms enable row level security;

drop policy if exists "read odontograms" on public.odontograms;
create policy "read odontograms"
on public.odontograms for select
to authenticated
using (true);

drop policy if exists "insert odontograms" on public.odontograms;
create policy "insert odontograms"
on public.odontograms for insert
to authenticated
with check (true);

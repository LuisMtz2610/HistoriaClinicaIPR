-- Citas odontológicas
create table if not exists public.appointments (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients(id) on delete cascade,
  created_by uuid references auth.users(id),
  starts_at timestamptz not null,
  ends_at   timestamptz not null,
  reason text,
  notes text,
  status text not null default 'scheduled' check (status in ('scheduled','completed','cancelled')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- índices útiles
create index if not exists idx_appointments_patient on public.appointments(patient_id);
create index if not exists idx_appointments_starts_at on public.appointments(starts_at);
create index if not exists idx_appointments_status on public.appointments(status);

-- trigger para updated_at
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists trg_appointments_set_updated_at on public.appointments;
create trigger trg_appointments_set_updated_at
before update on public.appointments
for each row execute function public.set_updated_at();

-- RLS (ajusta a tus necesidades; aquí se permite a usuarios autenticados leer/escribir)
alter table public.appointments enable row level security;

drop policy if exists appointments_select on public.appointments;
create policy appointments_select
on public.appointments for select
to authenticated
using ( true );

drop policy if exists appointments_insert on public.appointments;
create policy appointments_insert
on public.appointments for insert
to authenticated
with check ( true );

drop policy if exists appointments_update on public.appointments;
create policy appointments_update
on public.appointments for update
to authenticated
using ( true )
with check ( true );

drop policy if exists appointments_delete on public.appointments;
create policy appointments_delete
on public.appointments for delete
to authenticated
using ( true );

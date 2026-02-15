-- ============================================================
-- Tabla: plan de tratamiento por paciente
-- Cada fila = un procedimiento con diagnóstico, tratamiento,
-- diente(s) involucrado(s), precio estimado y estado.
-- ============================================================

create table if not exists public.treatment_plans (
  id            uuid primary key default gen_random_uuid(),
  patient_id    uuid not null references public.patients(id) on delete cascade,
  created_by    uuid references auth.users(id),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),

  -- Datos clínicos
  tooth         text,                     -- ej. "16", "múltiples", "superior derecho"
  diagnosis     text not null default '', -- diagnóstico
  treatment     text not null default '', -- tratamiento propuesto
  priority      text not null default 'normal'
                  check (priority in ('urgente','alta','normal','baja')),

  -- Seguimiento
  status        text not null default 'pendiente'
                  check (status in ('pendiente','en_proceso','completado','cancelado')),
  session_date  date,                     -- fecha en que se realizó / está programado
  notes         text,                     -- notas adicionales
  price_est     numeric(10,2),            -- precio estimado (opcional)

  -- Relación opcional con cita o presupuesto
  appointment_id uuid references public.appointments(id) on delete set null,
  quote_id       uuid references public.quotes(id) on delete set null
);

create index if not exists idx_treatment_plans_patient
  on public.treatment_plans(patient_id, created_at desc);

-- Trigger para updated_at
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

drop trigger if exists treatment_plans_updated_at on public.treatment_plans;
create trigger treatment_plans_updated_at
  before update on public.treatment_plans
  for each row execute function public.set_updated_at();

-- RLS
alter table public.treatment_plans enable row level security;

drop policy if exists treatment_plans_select on public.treatment_plans;
create policy treatment_plans_select
  on public.treatment_plans for select to authenticated using (true);

drop policy if exists treatment_plans_insert on public.treatment_plans;
create policy treatment_plans_insert
  on public.treatment_plans for insert to authenticated with check (true);

drop policy if exists treatment_plans_update on public.treatment_plans;
create policy treatment_plans_update
  on public.treatment_plans for update to authenticated using (true);

drop policy if exists treatment_plans_delete on public.treatment_plans;
create policy treatment_plans_delete
  on public.treatment_plans for delete to authenticated using (true);

-- supabase/002_printables_adapter.sql
-- Adapta a tu esquema actual: folios + columnas en tablas existentes + consent_prints + RLS/policies

create table if not exists public.folios (
  id bigserial primary key,
  created_at timestamptz default now(),
  doc_type text not null,
  seq int not null,
  unique (doc_type, seq)
);

do $$
begin
  if exists (select 1 from information_schema.tables where table_schema='public' and table_name='prescriptions') then
    alter table public.prescriptions add column if not exists folio text;
    alter table public.prescriptions add column if not exists doctor_name text;
    alter table public.prescriptions add column if not exists doctor_license text;
  end if;
end $$;

do $$
begin
  if exists (select 1 from information_schema.tables where table_schema='public' and table_name='radiology_orders') then
    alter table public.radiology_orders add column if not exists folio text;
    alter table public.radiology_orders add column if not exists doctor_name text;
    alter table public.radiology_orders add column if not exists doctor_license text;
  end if;
end $$;

do $$
begin
  if exists (select 1 from information_schema.tables where table_schema='public' and table_name='lab_orders') then
    alter table public.lab_orders add column if not exists folio text;
    alter table public.lab_orders add column if not exists doctor_name text;
    alter table public.lab_orders add column if not exists doctor_license text;
  end if;
end $$;

create table if not exists public.consent_prints (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid references public.patients(id) on delete set null,
  author_id uuid references auth.users(id) on delete set null,
  created_at timestamptz default now(),
  folio text,
  diagnosis text,
  planned_treatments text,
  alternatives text,
  risks text,
  expected_benefits text,
  risks_if_none text,
  studies_needed text,
  doctor_name text,
  doctor_license text,
  signed_by text,
  signed_id text,
  witnesses jsonb default '[]'::jsonb,
  related_consent uuid
);

alter table public.prescriptions enable row level security;
alter table public.radiology_orders enable row level security;
alter table public.lab_orders enable row level security;
alter table public.consent_prints enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='prescriptions' and policyname='presc_select_auth') then
    create policy presc_select_auth on public.prescriptions for select using (auth.role() = 'authenticated');
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='prescriptions' and policyname='presc_insert_auth') then
    create policy presc_insert_auth on public.prescriptions for insert with check (auth.role() = 'authenticated');
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='prescriptions' and policyname='presc_update_own') then
    create policy presc_update_own on public.prescriptions for update using (author_id = auth.uid());
  end if;

  if not exists (select 1 from pg_policies where schemaname='public' and tablename='radiology_orders' and policyname='rx_select_auth') then
    create policy rx_select_auth on public.radiology_orders for select using (auth.role() = 'authenticated');
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='radiology_orders' and policyname='rx_insert_auth') then
    create policy rx_insert_auth on public.radiology_orders for insert with check (auth.role() = 'authenticated');
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='radiology_orders' and policyname='rx_update_own') then
    create policy rx_update_own on public.radiology_orders for update using (author_id = auth.uid());
  end if;

  if not exists (select 1 from pg_policies where schemaname='public' and tablename='lab_orders' and policyname='lab_select_auth') then
    create policy lab_select_auth on public.lab_orders for select using (auth.role() = 'authenticated');
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='lab_orders' and policyname='lab_insert_auth') then
    create policy lab_insert_auth on public.lab_orders for insert with check (auth.role() = 'authenticated');
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='lab_orders' and policyname='lab_update_own') then
    create policy lab_update_own on public.lab_orders for update using (author_id = auth.uid());
  end if;

  if not exists (select 1 from pg_policies where schemaname='public' and tablename='consent_prints' and policyname='consentp_select_auth') then
    create policy consentp_select_auth on public.consent_prints for select using (auth.role() = 'authenticated');
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='consent_prints' and policyname='consentp_insert_auth') then
    create policy consentp_insert_auth on public.consent_prints for insert with check (auth.role() = 'authenticated');
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='consent_prints' and policyname='consentp_update_own') then
    create policy consentp_update_own on public.consent_prints for update using (author_id = auth.uid());
  end if;
end $$;

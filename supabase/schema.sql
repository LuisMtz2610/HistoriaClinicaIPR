-- Schema base para MVP
create table if not exists public.patients (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid,
  created_by uuid,
  first_name text not null,
  last_name text not null,
  birth_date date,
  sex text check (sex in ('M','F','X')),
  phone text,
  email text,
  allergies text,
  medical_history text,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.files (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid,
  patient_id uuid references public.patients(id) on delete cascade,
  uploaded_by uuid,
  path text not null,
  kind text check (kind in ('xray','photo','consent','doc','other')),
  created_at timestamptz default now(),
  meta jsonb
);

-- Índices
create index if not exists idx_patients_lastname on public.patients (last_name);
create index if not exists idx_files_patient on public.files (patient_id);

-- === Opcional: Habilitar RLS (cuando uses auth) ===
-- alter table public.patients enable row level security;
-- alter table public.files enable row level security;

-- create policy "clinic read patients" on public.patients
--   for select using (clinic_id is null or clinic_id = (select clinic_id from public.users where id = auth.uid()));
-- create policy "clinic write patients" on public.patients
--   for insert with check (clinic_id is null or clinic_id = (select clinic_id from public.users where id = auth.uid()));
-- create policy "clinic update patients" on public.patients
--   for update using (clinic_id is null or clinic_id = (select clinic_id from public.users where id = auth.uid()))
--   with check (clinic_id is null or clinic_id = (select clinic_id from public.users where id = auth.uid()));

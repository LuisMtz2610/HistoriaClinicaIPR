-- Enforce no overlapped appointments per patient (except Canceladas)
create extension if not exists btree_gist;

-- Drop old constraint if exists
do $$ begin
  alter table public.appointments drop constraint if exists appointments_no_overlap;
exception when others then null;
end $$;

alter table public.appointments
  add constraint appointments_no_overlap
  exclude using gist (
    patient_id with =,
    tstzrange(starts_at, ends_at) with &&
  ) where (status <> 'cancelled');

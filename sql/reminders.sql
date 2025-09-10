-- Reminders log for WhatsApp notifications
create table if not exists public.reminders (
  id uuid primary key default gen_random_uuid(),
  appointment_id uuid not null references public.appointments(id) on delete cascade,
  kind text not null check (kind in ('24h','2h')),
  sent_at timestamptz not null default now(),
  status text not null check (status in ('ok','error')),
  provider_message_id text,
  error text,
  created_at timestamptz not null default now(),
  unique (appointment_id, kind)
);

create index if not exists idx_reminders_appt on public.reminders(appointment_id);

alter table public.reminders enable row level security;

-- Basic read policy for authenticated users (adjust as needed)
drop policy if exists reminders_select on public.reminders;
create policy reminders_select
on public.reminders for select
to authenticated
using (true);

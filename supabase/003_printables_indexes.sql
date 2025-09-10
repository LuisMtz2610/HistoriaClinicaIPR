-- Índices útiles para listados y joins
create index if not exists idx_prescriptions_patient on public.prescriptions (patient_id);
create index if not exists idx_prescriptions_created on public.prescriptions (created_at desc);

create index if not exists idx_rx_patient on public.radiology_orders (patient_id);
create index if not exists idx_rx_created on public.radiology_orders (created_at desc);

create index if not exists idx_lab_patient on public.lab_orders (patient_id);
create index if not exists idx_lab_created on public.lab_orders (created_at desc);

create index if not exists idx_consentp_patient on public.consent_prints (patient_id);
create index if not exists idx_consentp_created on public.consent_prints (created_at desc);

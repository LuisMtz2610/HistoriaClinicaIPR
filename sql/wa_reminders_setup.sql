-- ============================================================
-- WhatsApp Reminders — migración completa
-- Ejecutar en Supabase SQL Editor (es idempotente)
-- ============================================================

-- 1. Ampliar CHECK para aceptar todos los tipos de recordatorio
ALTER TABLE public.reminders
  DROP CONSTRAINT IF EXISTS reminders_kind_check;

ALTER TABLE public.reminders
  DROP CONSTRAINT IF EXISTS reminders_appointment_id_kind_key;

ALTER TABLE public.reminders
  ADD CONSTRAINT reminders_kind_check
  CHECK (kind IN ('24h', '2h', 'manual', 'confirmacion'));

-- 2. Unique solo para los automáticos (una vez por tipo por cita)
--    Los manuales y confirmaciones pueden repetirse
CREATE UNIQUE INDEX IF NOT EXISTS reminders_auto_unique
  ON public.reminders (appointment_id, kind)
  WHERE kind IN ('24h', '2h', 'confirmacion');

-- 3. Políticas RLS
DROP POLICY IF EXISTS reminders_select ON public.reminders;
DROP POLICY IF EXISTS reminders_insert ON public.reminders;

CREATE POLICY reminders_select
  ON public.reminders FOR SELECT TO authenticated USING (true);

CREATE POLICY reminders_insert
  ON public.reminders FOR INSERT TO authenticated WITH CHECK (true);

-- 4. Vista útil: estado de recordatorios por cita
CREATE OR REPLACE VIEW public.v_appointment_reminders AS
SELECT
  a.id            AS appointment_id,
  a.starts_at,
  a.status        AS appt_status,
  p.first_name || ' ' || p.last_name AS patient_name,
  p.phone,
  MAX(CASE WHEN r.kind = 'confirmacion' AND r.status = 'ok' THEN r.sent_at END) AS confirmacion_sent_at,
  MAX(CASE WHEN r.kind = '24h'          AND r.status = 'ok' THEN r.sent_at END) AS reminder_24h_sent_at,
  MAX(CASE WHEN r.kind = '2h'           AND r.status = 'ok' THEN r.sent_at END) AS reminder_2h_sent_at,
  MAX(CASE WHEN r.kind = 'manual'       AND r.status = 'ok' THEN r.sent_at END) AS manual_sent_at,
  COUNT(CASE WHEN r.status = 'error' THEN 1 END)::int                           AS total_errors
FROM public.appointments a
JOIN public.patients p ON p.id = a.patient_id
LEFT JOIN public.reminders r ON r.appointment_id = a.id
GROUP BY a.id, a.starts_at, a.status, p.first_name, p.last_name, p.phone;

GRANT SELECT ON public.v_appointment_reminders TO authenticated;

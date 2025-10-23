# WhatsApp Reminders – Supabase Edge Function

## Qué hace
- Corre cada **5 minutos**.
- Envía recordatorios por WhatsApp a **T-24h** y **T-2h** de cada cita (no Cancelada).
- Registra envíos en `public.reminders` (éxitos/errores) evitando duplicados.

## Archivos
- `sql/reminders.sql` — Crea tabla `reminders` + RLS básica.
- `supabase/functions/wa-reminders/` — Edge Function (Deno).

## Requisitos
- Tabla `appointments` con `starts_at`, `ends_at`, `status`, `patient_id` y relación `patients(phone, first_name, last_name)`.
- Variables de entorno:
  - `SUPABASE_URL` (ya existe en Supabase)
  - `SUPABASE_SERVICE_ROLE_KEY` (programado por Supabase para funciones con Schedule)
  - `WHATSAPP_TOKEN` (token de WhatsApp Cloud API)
  - `WHATSAPP_PHONE_ID` (ID del número de WhatsApp Cloud)
  - `COUNTRY_PREFIX` (por defecto `52` para MX)
  - `CLINIC_NAME` (texto del mensaje; default "Clínica Odontológica Integral")

## Pasos
1) **Base de datos**
   - Ejecuta `sql/reminders.sql` en el SQL Editor.
   - (Ya tienes `appointments`; opcionalmente activa el constraint anti-solapes con `appointments_overlap.sql`).

2) **Desplegar función**
   ```bash
   supabase functions deploy wa-reminders
   ```

3) **Configurar secrets** (Dashboard o CLI):
   ```bash
   supabase secrets set WHATSAPP_TOKEN=XXXXX WHATSAPP_PHONE_ID=XXXXXXXXXXXX COUNTRY_PREFIX=52 CLINIC_NAME="Clínica Odontológica Integral"
   ```
   > Las funciones agendadas usan el **Service Role** automáticamente. No necesitas exponerlo.

4) **Programar ejecución cada 5 minutos**
   - En el Dashboard: *Edge Functions → wa-reminders → Schedules → Add schedule* → cron: `*/5 * * * *`
   - O por CLI (si está disponible en tu versión):
     ```bash
     supabase functions schedule create wa-reminders --cron "*/5 * * * *"
     ```

## Notas
- Si el paciente no tiene teléfono, se omite (se registra como "skipped").
- Si ya se envió un recordatorio para esa cita y ese `kind` (`24h` o `2h`), no se reenvía.
- Para plantillas de **WhatsApp Cloud API**, puedes cambiar el envío a `type: "template"` y tu template aprobado.

¡Listo!

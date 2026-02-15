# Configuración WhatsApp — Guía completa

## Cómo funciona

```
Al crear cita        → Confirmación inmediata (automática)
T-24h antes cita     → Recordatorio del día siguiente (automático, cron)
T-2h  antes cita     → Recordatorio "en 2 horas" (automático, cron)
Botón 💬 en la app   → Recordatorio manual (siempre disponible)
```

---

## Paso 1 — SQL (Supabase SQL Editor)

Ejecutar el archivo `sql/wa_reminders_setup.sql`.
Es idempotente: puede correrse múltiples veces sin problema.

---

## Paso 2 — Desplegar la Edge Function

```bash
# Desde la raíz del proyecto
supabase functions deploy wa-reminders
```

---

## Paso 3 — Configurar secrets en Supabase

```bash
supabase secrets set \
  WHATSAPP_TOKEN="EAABxxxxxxxxxxxxxx" \
  WHATSAPP_PHONE_ID="123456789012345" \
  COUNTRY_PREFIX="52" \
  CLINIC_NAME="Clínica Odontológica Integral" \
  CLINIC_PHONE="229 000 0000"
```

> Los valores `WHATSAPP_TOKEN` y `WHATSAPP_PHONE_ID` los encuentras en:
> Meta for Developers → Tu App → WhatsApp → API Setup

---

## Paso 4 — Configurar variables en Vercel/Railway

En el panel de tu hosting agregar:

| Variable | Valor |
|---|---|
| `WHATSAPP_TOKEN` | Token de WhatsApp Cloud API |
| `WHATSAPP_PHONE_ID` | ID del número de WhatsApp |
| `COUNTRY_PREFIX` | `52` (México) |
| `NEXT_PUBLIC_COUNTRY_PREFIX` | `52` |

---

## Paso 5 — Programar el cron (recordatorios automáticos)

En el Dashboard de Supabase:
`Edge Functions → wa-reminders → Schedules → Add schedule`

Cron: `*/5 * * * *` (cada 5 minutos)

---

## Paso 6 — (Opcional) Confirmación automática al crear cita

Para que se envíe confirmación automáticamente al crear cada cita,
agrega al final de `app/citas/new/Client.tsx`, dentro de `onSave()`,
después del INSERT de la cita:

```typescript
// Enviar confirmación inmediata (no bloquea el guardado)
fetch('/api/whatsapp/send-confirmation', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ appointmentId: data.id }),
}).catch(console.error);
```

O simplemente usar el botón 💬 de la pantalla de cita.

---

## Sin token de WhatsApp Cloud API

Si no tienes la API configurada, el botón 💬 abre WhatsApp Web/App
con el mensaje prellenado. La doctora solo toca "Enviar".
El historial se guarda igual.

---

## Tipos de recordatorio y sus badges

| Badge | Significado |
|---|---|
| ✅ conf | Confirmación al agendar |
| 24h | Recordatorio automático 24h antes |
| 2h | Recordatorio automático 2h antes |
| 📤 | Enviado manualmente desde la app |

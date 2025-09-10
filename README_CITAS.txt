# Módulo de Citas — Clínica Odontológica Integral

## 1) SQL (Supabase)
Ejecuta `sql/appointments.sql` en tu proyecto de Supabase (SQL Editor) para crear:
- Tabla `public.appointments`
- Índices
- Trigger `updated_at`
- RLS de ejemplo (ajústalas a tu seguridad)

## 2) Rutas incluidas
- `/citas` — Calendario mensual + lista de próximas citas
- `/citas/new` — Crear cita
- `/citas/[id]` — Ver/editar estatus, mover hora, notas
- `/citas/[id]/print` — Comprobante imprimible

## 3) Acceso rápido desde paciente
Incluí `app/(clinic)/_components/PatientAppointmentQuickAction.tsx`.

En tu `app/pacientes/[id]/page.tsx`, añade:
```tsx
import PatientAppointmentQuickAction from "@/app/(clinic)/_components/PatientAppointmentQuickAction";

// Debajo del encabezado del paciente, junto a otros botones:
<div className="mt-2">
  <PatientAppointmentQuickAction patientId={p.id} />
</div>
```

## 4) Notas
- Usa tu `layout.tsx` existente (ya tienes enlace "Citas" en el menú).
- El calendario es simple (sin dependencias externas) y muestra puntos en días con citas.
- Para recordatorios por WhatsApp/SMS o validación de solapes de horario, lo añadimos en una siguiente iteración.

¡Listo!

import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

// ======================
// Función auxiliar: nombre de paciente
// ======================
type APRow = {
  id: string;
  starts_at: string;
  ends_at: string;
  notes?: string | null;
  patients?: { name?: string; first_name?: string; last_name?: string; phone?: string | null } | { name?: string; first_name?: string; last_name?: string; phone?: string | null }[];
};

function pickPatientName(p: APRow["patients"]): string {
  if (!p) return "Paciente";

  if (Array.isArray(p)) {
    const it = p[0];
    if (!it) return "Paciente";
    const fromParts = `${it.first_name ?? ""} ${it.last_name ?? ""}`.trim();
    const cand = it.name ?? fromParts;
    return cand || "Paciente";
  }

  const fromParts = `${p.first_name ?? ""} ${p.last_name ?? ""}`.trim();
  const cand = p.name ?? fromParts;
  return cand || "Paciente";
}

// ======================
// Escapar texto ICS
// ======================
function escapeICS(text: string): string {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
}

// ======================
// Handler principal
// ======================
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const id = params.id;

  const { data, error } = await supabase
    .from("appointments")
    .select("id, starts_at, ends_at, notes, patients(first_name,last_name,phone)")
    .eq("id", id)
    .single<APRow>();

  if (error || !data) {
    return new NextResponse("No encontrado", { status: 404 });
  }

  const dtStart = new Date(data.starts_at);
  const dtEnd = new Date(data.ends_at);

  const pad = (n: number) => String(n).padStart(2, "0");
  const fmt = (d: Date) =>
    d.getUTCFullYear().toString() +
    pad(d.getUTCMonth() + 1) +
    pad(d.getUTCDate()) +
    "T" +
    pad(d.getUTCHours()) +
    pad(d.getUTCMinutes()) +
    pad(d.getUTCSeconds()) +
    "Z";

  const patientName = pickPatientName(data.patients);
  const description = escapeICS(data.notes || "");

  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Clinica Odontologica Integral//ES",
    "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT",
    `UID:${data.id}@clinica-odonto`,
    `DTSTAMP:${fmt(new Date())}`,
    `DTSTART:${fmt(dtStart)}`,
    `DTEND:${fmt(dtEnd)}`,
    `SUMMARY:Cita - ${patientName}`,
    `DESCRIPTION:${description}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");

  return new NextResponse(ics, {
    status: 200,
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="cita-${data.id}.ics"`,
    },
  });
}

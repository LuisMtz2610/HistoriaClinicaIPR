// Status mapping (DB -> UI)
export const statusEs: Record<string, string> = {
  scheduled: "Programada",
  completed: "Completada",
  cancelled: "Cancelada",
};

export function toStatusDb(es: string): "scheduled" | "completed" | "cancelled" {
  const map: Record<string, any> = {
    Programada: "scheduled",
    Completada: "completed",
    Cancelada: "cancelled",
  };
  return map[es] ?? "scheduled";
}

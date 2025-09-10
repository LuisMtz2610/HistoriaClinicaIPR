// Status mapping (DB -> UI)
export const statusEs: Record<string, string> = {
  scheduled: "programada",
  completed: "completada",
  cancelled: "cancelada",
};

export function toStatusDb(es: string): "scheduled" | "completed" | "cancelled" {
  const map: Record<string, any> = {
    programada: "scheduled",
    completada: "completed",
    cancelada: "cancelled",
  };
  return map[es] ?? "scheduled";
}

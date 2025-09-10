export type DocType = "RX" | "LAB" | "REC" | "CON";

export async function mintFolio(docType: DocType) {
  const res = await fetch("/(clinic)/api/folios", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ docType }),
  });
  if (!res.ok) throw new Error("No se pudo generar folio");
  return res.json() as Promise<{ folio: string; seq: number }>;
}

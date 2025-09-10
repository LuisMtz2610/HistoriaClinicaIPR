import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: Request) {
  const { docType } = await req.json();
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY! // requiere SRK para atomicidad
  );

  const { data: last, error: selErr } = await supabase
    .from("folios")
    .select("seq")
    .eq("doc_type", docType)
    .order("seq", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (selErr) return NextResponse.json({ error: selErr.message }, { status: 500 });

  const nextSeq = (last?.seq || 0) + 1;
  const { error: insErr } = await supabase.from("folios").insert({
    doc_type: docType,
    seq: nextSeq,
  });

  if (insErr) return NextResponse.json({ error: insErr.message }, { status: 500 });

  const y = new Date().getFullYear().toString().slice(-2);
  const folio = `${docType}-${y}-${String(nextSeq).padStart(4, "0")}`;
  return NextResponse.json({ folio, seq: nextSeq });
}

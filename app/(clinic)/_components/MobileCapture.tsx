
"use client";
import { useState } from "react";
import { supabase } from "@/lib/supabase";

export default function MobileCapture({ patientId }: { patientId: string }) {
  const [uploading, setUploading] = useState(false);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `patients/${patientId}/${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("clinical-files").upload(path, file, { upsert: false });
      if (error) throw error;
      alert("Foto subida");
    } catch (err:any) {
      alert(err?.message || String(err));
    } finally {
      setUploading(false);
    }
  }

  return (
    <label className="inline-flex items-center gap-2 px-3 py-2 rounded bg-emerald-700 text-white">
      {uploading ? "Subiendo..." : "Tomar foto"}
      <input
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={onFile}
      />
    </label>
  );
}

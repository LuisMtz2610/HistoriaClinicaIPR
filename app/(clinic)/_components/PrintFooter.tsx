"use client";
import { clinic } from "../_lib/clinic";

export default function PrintFooter() {
  return (
    <div className="pt-3 mt-6 border-t text-[11px] text-center text-neutral-600">
      {clinic.footerAddress}
    </div>
  );
}

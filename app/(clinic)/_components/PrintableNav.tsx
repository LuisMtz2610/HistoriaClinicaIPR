"use client";
import Link from "next/link";

export default function PrintableNav() {
  return (
    <ul className="flex items-center gap-4">
      <li><Link href="/prescriptions">Recetas</Link></li>
      <li><Link href="/radiology-orders">RX</Link></li>
      <li><Link href="/lab-orders">Lab</Link></li>
      <li><Link href="/consents">Consentimientos</Link></li>
    </ul>
  );
}

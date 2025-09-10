"use client";
import { clinic } from "../_lib/clinic";

export default function PrintHeader({ title }: { title: string }) {
  return (
    <div className="flex items-center gap-4 pb-3 mb-4 border-b">
      <img src={clinic.logoPath} alt="Logo" width={60} height={60} />
      <div className="grow">
        <div className="font-semibold text-[15px]">{clinic.name}</div>
        <div className="text-[12px]">{clinic.doctor.fullName}</div>
        <div className="text-[11px]">{clinic.doctor.title} — {clinic.doctor.cedula}</div>
        <div className="text-[11px]">{clinic.doctor.specialty} · {clinic.doctor.master}</div>
        <div className="text-[11px]">{clinic.doctor.university}</div>
      </div>
      <div className="text-right text-[14px] font-semibold">{title}</div>
    </div>
  );
}

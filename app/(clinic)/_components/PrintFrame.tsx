"use client";
import React from "react";

export default function PrintFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="print:p-6 p-6 bg-white text-[13px] leading-5">
      <style jsx global>{`
        @media print {
          @page { margin: 12mm; }
          header, nav, footer.app { display: none !important; }
          html, body { background: #fff !important; }
        }
      `}</style>
      {children}
    </div>
  );
}

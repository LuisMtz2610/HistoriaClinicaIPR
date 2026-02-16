"use client";
import React from "react";

export default function PrintFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="print:p-6 p-6 bg-white text-[13px] leading-5">
      <style jsx global>{`
        @media print {
          @page { margin: 12mm; }
          /* Ocultar todo el shell — sidebar + topbar */
          header,
          nav,
          aside,
          footer.app,
          [data-sidebar],
          [data-topbar] {
            display: none !important;
          }
          /* Quitar el padding-left que deja el sidebar */
          .lg\\:pl-60,
          .xl\\:pl-64,
          [class*="pl-60"],
          [class*="pl-64"] {
            padding-left: 0 !important;
          }
          html, body { background: #fff !important; }
        }
        /* En pantalla también ocultar chrome cuando se abre /print */
      `}</style>
      {children}
    </div>
  );
}

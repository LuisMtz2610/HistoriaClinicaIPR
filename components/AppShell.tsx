'use client';
import React from 'react';
import BackButton from '@/components/BackButton';

export default function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      {/* Header muy liviano, respeta tu estética */}
      <div className="sticky top-0 z-40 bg-white/70 backdrop-blur border-b">
        <div className="mx-auto max-w-7xl px-4 py-2 flex items-center gap-3">
          <BackButton />
          <div className="ml-auto" />
        </div>
      </div>

      {/* Contenido */}
      <main className="mx-auto max-w-7xl px-4 py-4">
        {children}
      </main>
    </div>
  );
}

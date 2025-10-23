import React from 'react';
import AppShell from '@/components/AppShell';

export default function ClinicLayout({ children }: { children: React.ReactNode }) {
  return <AppShell>{children}</AppShell>;
}

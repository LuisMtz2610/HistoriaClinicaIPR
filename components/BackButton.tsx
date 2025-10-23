'use client';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';

export default function BackButton({ label = 'Volver' }: { label?: string }) {
  const router = useRouter();
  return (
    <button type="button" onClick={() => router.back()} className="btn inline-flex items-center gap-2">
      <ArrowLeft size={16} /> {label}
    </button>
  );
}

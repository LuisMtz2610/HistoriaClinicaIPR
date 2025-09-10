export const dynamic = 'force-dynamic'
import { Suspense } from 'react';
import Client from './Client';

export default function Page() {
  return (
    <Suspense fallback={null}>
      <Client />
    </Suspense>
  );
}

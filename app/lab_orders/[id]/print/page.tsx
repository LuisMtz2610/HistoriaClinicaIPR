import { redirect } from 'next/navigation';

export default function Page({ params }: { params: { id: string } }) {
  redirect(`/lab-orders/${params.id}/print`);
  return null;
}

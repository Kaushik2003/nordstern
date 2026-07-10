'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useCustomer } from '@/components/customer-context';
import { Spinner } from '@/components/ui';

// Entry: route to the app if signed in, else to sign-in. No landing/demo content.
export default function Entry() {
  const { customer, loading } = useCustomer();
  const router = useRouter();
  useEffect(() => {
    if (loading) return;
    router.replace(customer ? '/home' : '/login');
  }, [customer, loading, router]);
  return <div className="grid min-h-screen place-items-center"><Spinner className="h-6 w-6 text-brand" /></div>;
}

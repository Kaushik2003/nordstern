'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

export default function VerifyEmailPage() {
  const [state, setState] = useState<'verifying' | 'ok' | 'error'>('verifying');

  useEffect(() => {
    const token = new URLSearchParams(window.location.search).get('token');
    if (!token) { setState('error'); return; }
    api.post('/auth/verify-email', { token }).then(() => setState('ok')).catch(() => setState('error'));
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {state === 'verifying' ? 'Verifying…' : state === 'ok' ? 'Email verified' : 'Verification failed'}
        </CardTitle>
        <CardDescription>
          {state === 'ok' ? 'Your email is confirmed.' : state === 'error' ? 'This link is invalid or expired.' : 'One moment…'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Link href="/login" className="text-sm font-medium text-foreground hover:underline">Continue to sign in</Link>
      </CardContent>
    </Card>
  );
}

'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { api, ApiError } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

const schema = z.object({ email: z.email(), password: z.string().min(1, 'Required') });
type Form = z.infer<typeof schema>;

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState('');
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<Form>({ resolver: zodResolver(schema) });

  async function onSubmit(v: Form) {
    setError('');
    try {
      await api.post('/auth/login', v);
      router.push('/overview');
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Something went wrong');
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Welcome back</CardTitle>
        <CardDescription>Sign in to your NordStern account</CardDescription>
      </CardHeader>
      <CardContent>
        {error && <div className="mb-4 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</div>}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Work email</Label>
            <Input id="email" type="email" placeholder="you@company.com" {...register('email')} />
            {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Password</Label>
              <Link href="/forgot-password" className="text-xs text-muted-foreground hover:text-foreground">Forgot?</Link>
            </div>
            <Input id="password" type="password" {...register('password')} />
          </div>
          <Button type="submit" className="w-full" disabled={isSubmitting}>{isSubmitting ? 'Signing in…' : 'Sign in'}</Button>
        </form>
        <p className="mt-4 text-center text-sm text-muted-foreground">
          No account? <Link href="/register" className="font-medium text-foreground hover:underline">Create one</Link>
        </p>
      </CardContent>
    </Card>
  );
}

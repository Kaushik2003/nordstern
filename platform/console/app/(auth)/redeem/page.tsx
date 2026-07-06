'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import { api, ApiError } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { CheckCircle2, Loader2 } from 'lucide-react';

const schema = z.object({
  token: z.string().min(1, 'Token is required'),
  subdomain: z.string()
    .min(3, 'Minimum 3 characters')
    .max(63, 'Maximum 63 characters')
    .regex(/^[a-z0-9][a-z0-9-]*[a-z0-9]$/, 'Only lowercase letters, numbers, and hyphens'),
  fullName: z.string().min(2, 'Name is required'),
  password: z.string().min(8, 'Password must be at least 8 characters')
});

type Form = z.infer<typeof schema>;

const STAGES = [
  { key: 'queued', label: 'Queuing Provisioning Job' },
  { key: 'provisioning_database', label: 'Creating Postgres Database Schema' },
  { key: 'generating_keys', label: 'Generating Stellar Keypairs' },
  { key: 'funding_testnet', label: 'Funding Accounts via Friendbot' },
  { key: 'generating_config', label: 'Generating Platform Configurations' },
  { key: 'starting_services', label: 'Spinning up isolated Docker Containers' },
  { key: 'registering_aggregator', label: 'Registering Capabilities with Aggregator' },
  { key: 'active', label: 'Anchor Active & Ready!' }
];

export default function RedeemPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState('');
  const [stageIndex, setStageIndex] = useState(-1);
  const [success, setSuccess] = useState(false);

  const { register, handleSubmit, setValue, formState: { errors, isSubmitting } } = useForm<Form>({
    resolver: zodResolver(schema),
    defaultValues: {
      token: searchParams.get('token') || '',
      subdomain: '',
      fullName: '',
      password: ''
    }
  });

  useEffect(() => {
    const token = searchParams.get('token');
    if (token) {
      setValue('token', token);
    }
  }, [searchParams, setValue]);

  async function onSubmit(v: Form) {
    setError('');
    try {
      const res = await api.post('/anchor-invitations/redeem', v) as any;
      
      // Begin simulated live status tracking loop (for the MVP/demo)
      setStageIndex(0);
      let idx = 0;
      const interval = setInterval(() => {
        idx++;
        if (idx < STAGES.length) {
          setStageIndex(idx);
        } else {
          clearInterval(interval);
          setSuccess(true);
        }
      }, 2000);

    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Something went wrong');
    }
  }

  if (success) {
    return (
      <Card className="w-full max-w-lg mx-auto">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <CheckCircle2 className="h-16 w-16 text-brand" />
          </div>
          <CardTitle>Anchor Provisioned Successfully!</CardTitle>
          <CardDescription>Your tenant console is ready and routing is live.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 text-center">
          <p className="text-sm text-muted-foreground">
            You can now access your operator dashboard at your dedicated domain.
          </p>
          <Button onClick={() => router.push('/login')} className="w-full">
            Proceed to Login
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (stageIndex >= 0) {
    return (
      <Card className="w-full max-w-lg mx-auto">
        <CardHeader className="text-center">
          <CardTitle>Provisioning your Anchor</CardTitle>
          <CardDescription>Please wait while we launch your dedicated infrastructure.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            {STAGES.map((s, idx) => {
              const isPast = idx < stageIndex;
              const isCurrent = idx === stageIndex;
              return (
                <div key={s.key} className="flex items-center gap-3 text-sm">
                  {isPast && <CheckCircle2 className="h-5 w-5 text-brand shrink-0" />}
                  {isCurrent && <Loader2 className="h-5 w-5 text-brand animate-spin shrink-0" />}
                  {!isPast && !isCurrent && <div className="h-5 w-5 rounded-full border border-muted shrink-0" />}
                  <span className={isCurrent ? 'font-medium text-foreground' : 'text-muted-foreground'}>
                    {s.label}
                  </span>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-lg mx-auto">
      <CardHeader>
        <CardTitle>Redeem Invitation</CardTitle>
        <CardDescription>Configure your admin account and choose your subdomain.</CardDescription>
      </CardHeader>
      <CardContent>
        {error && <div className="mb-4 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</div>}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="token">Invitation Token</Label>
            <Input id="token" type="text" {...register('token')} />
            {errors.token && <p className="text-xs text-destructive">{errors.token.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="fullName">Full Name</Label>
            <Input id="fullName" placeholder="e.g. John Doe" {...register('fullName')} />
            {errors.fullName && <p className="text-xs text-destructive">{errors.fullName.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="subdomain">Desired Subdomain</Label>
            <div className="flex items-center border rounded-md px-3 bg-background">
              <input
                id="subdomain"
                placeholder="globex"
                {...register('subdomain')}
                className="flex h-10 w-full bg-transparent py-2 text-sm outline-none placeholder:text-muted-foreground"
              />
              <span className="text-sm text-muted-foreground">.nordstern.live</span>
            </div>
            {errors.subdomain && <p className="text-xs text-destructive">{errors.subdomain.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Admin Password</Label>
            <Input id="password" type="password" {...register('password')} />
            {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
          </div>

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? 'Verifying Invite…' : 'Accept Invitation & Launch'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

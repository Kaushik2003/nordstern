'use client';

import { useState } from 'react';
import { Mail, ChevronDown, MessageCircle } from 'lucide-react';
import { useBrand } from '@/components/brand-context';
import { Card, CardBody, Button } from '@/components/ui';

const FAQ = [
  { q: 'How long does a buy take?', a: 'Most buys complete within a few minutes once your payment is confirmed. You can track progress live on the transaction screen.' },
  { q: 'How do I get verified?', a: 'You complete a one-time identity check. Once verified, you can buy and sell right away — and you won’t need to verify again.' },
  { q: 'Do I need a wallet?', a: 'Your account is your email. You can optionally link one or more wallets in your profile to send and receive.' },
  { q: 'What are the fees?', a: 'Any fee is shown clearly before you confirm a buy or sell — no surprises.' },
];

export default function SupportPage() {
  const brand = useBrand();
  const email = brand.supportEmail || `support@${brand.slug}.example`;
  const [open, setOpen] = useState<number | null>(0);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-ink">Support</h1>

      <Card><CardBody className="flex items-center gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-full bg-brand/15"><MessageCircle className="h-5 w-5 text-brand-deep" /></div>
        <div className="flex-1"><p className="font-medium text-ink">Need a hand?</p><p className="text-xs text-muted">Our team usually replies within a few hours.</p></div>
      </CardBody></Card>

      <a href={`mailto:${email}`}>
        <Button size="block"><Mail className="h-4 w-4" /> Email {email}</Button>
      </a>

      <div>
        <h2 className="mb-2 font-semibold text-ink">Frequently asked</h2>
        <div className="space-y-2">
          {FAQ.map((f, i) => (
            <Card key={i}>
              <button className="flex w-full items-center justify-between p-4 text-left" onClick={() => setOpen(open === i ? null : i)}>
                <span className="text-sm font-medium text-ink">{f.q}</span>
                <ChevronDown className={`h-4 w-4 text-muted transition ${open === i ? 'rotate-180' : ''}`} />
              </button>
              {open === i && <p className="px-4 pb-4 text-sm text-muted">{f.a}</p>}
            </Card>
          ))}
        </div>
      </div>

      <p className="text-center text-xs text-faint">
        When contacting support about a transaction, include its reference from the activity screen.
      </p>
    </div>
  );
}

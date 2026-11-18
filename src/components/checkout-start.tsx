'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Brand } from './brand';
import { Button } from './ui/button';
import { request } from './providers';
import type { PublicPlan } from '@/lib/plans';
export function CheckoutStart({ plan, testMode }: { plan: PublicPlan; testMode: boolean }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function open(signal?: AbortSignal) {
    setBusy(true); setError('');
    try { const result = await request('/api/billing/checkout', 'POST', { plan: plan.id }, signal); if (!signal?.aborted) window.location.assign(result.url); }
    catch (error) { if (!signal?.aborted) { setError(error instanceof Error ? error.message : 'Checkout could not open.'); setBusy(false); } }
  }
  useEffect(() => {
    if (!plan.available) return;
    const controller = new AbortController();
    void open(controller.signal);
    return () => controller.abort();
  }, [plan.id, plan.available]);
  return <main id="main-content" className="legal-page"><Brand/><section className="card feature-card"><span className="eyebrow">YOUR NEXT LITTLE CHAPTER</span><h1>{plan.label}</h1><p>{plan.available ? `${plan.amount} per ${plan.interval}. Renews ${plan.interval === 'month' ? 'monthly' : 'yearly'} until canceled.` : 'This billing option is not available yet.'}</p>{testMode && <p>Test mode · No real money is charged.</p>}<p role="status">{busy ? 'Opening secure Stripe checkout…' : 'Stripe will show your total before you confirm.'}</p>{error && <p className="form-error" role="alert">{error}</p>}<Button disabled={busy || !plan.available} onClick={() => void open()}>Continue to Stripe</Button><p><Link href="/pricing">Compare plans</Link> · <Link href="/settings/subscription">Manage an existing subscription</Link></p></section></main>;
}

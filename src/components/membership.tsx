'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Crown, Check, ArrowRight, RefreshCw } from 'lucide-react';
import { Button } from './ui/button';
import { useApp, request } from './providers';
import { type PlanCatalog, type PlanId } from '@/lib/plans';
import { trackCheckoutStarted } from '@/lib/trfyx';

export function MembershipPage({ catalog, settings = false }: { catalog: PlanCatalog; settings?: boolean }) {
  const { data, refresh } = useApp();
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [returned, setReturned] = useState('');
  const [checking, setChecking] = useState(false);
  const [plan, setPlan] = useState<PlanId>(catalog.monthly.available ? 'monthly' : 'yearly');
  useEffect(() => {
    const outcome = new URLSearchParams(window.location.search).get('checkout') || '';
    setReturned(outcome);
    if (outcome !== 'success') { void refresh(); return; }
    // The return URL never grants premium. Wait for the verified webhook.
    setChecking(true);
    let attempts = 0;
    const timer = window.setInterval(() => {
      void refresh(); attempts++;
      if (attempts >= 10) { window.clearInterval(timer); setChecking(false); }
    }, 3000);
    return () => window.clearInterval(timer);
  }, [refresh]);
  async function openBilling(action: 'checkout' | 'portal') {
    setBusy(action); setError('');
    try { const result = await request(`/api/billing/${action}`, 'POST', action === 'checkout' ? { plan } : {}); if (action === 'checkout') await trackCheckoutStarted(result.sessionId, plan); window.location.assign(result.url); }
    catch (error) { setError(error instanceof Error ? error.message : 'Could not open billing.'); setBusy(''); }
  }
  if (!data) return null;
  const membership = data.membership;
  return <div id="main-content" className="page-enter feature-page">
    <div className="page-heading"><div><span className="eyebrow">A LITTLE MORE ROOM TO REFLECT</span><h1>{settings ? 'Your subscription' : 'Moodora Premium'} <Crown className="heading-flower"/></h1><p>{settings ? 'Your plan, billing details, and a little room to grow.' : 'Look back on your week with a little more understanding.'}</p></div></div>
    {returned === 'success' && !membership.premium && <div className="card" role="status"><h2>{checking ? 'Confirming your membership…' : 'Your payment confirmation is still on its way.'}</h2><p>Premium access appears after Stripe confirms your subscription. You don’t need to pay again.</p><Button variant="outline" onClick={() => void refresh()}><RefreshCw size={16}/>Check again</Button></div>}
    {returned === 'cancelled' && <p role="status">Checkout was closed. You can continue using your free features.</p>}
    {membership.testMode && <p className="soft-badge">TEST BILLING · NO REAL MONEY IS CHARGED</p>}
    <div className="membership-grid">
      <section className="card feature-card"><span className="eyebrow">YOUR EVERYDAY SPACE</span><h2>Moodora Free</h2><p>Your daily rituals are always here.</p><ul className="feature-list"><li><Check size={17}/>Daily mood tracking</li><li><Check size={17}/>Private diary and calendar</li><li><Check size={17}/>Existing mood insights</li><li><Check size={17}/>Daily in-app reminders</li></ul><Link className="text-button" href="/dashboard">Go to my space <ArrowRight size={15}/></Link></section>
      <section className="card feature-card premium-card"><span className="eyebrow"><Crown size={15}/> MORE TIME TO REFLECT</span><h2>{membership.premium ? 'Your Premium membership' : 'Moodora Premium'}</h2><p>A private weekly summary made from your own check-ins.</p><ul className="feature-list"><li><Check size={17}/>Everything in Free</li><li><Check size={17}/>Weekly mood reports</li><li><Check size={17}/>Compare check-in counts with the previous week</li><li><Check size={17}/>Download a weekly report</li></ul>
        {membership.premium ? <><p className="soft-badge">PREMIUM ACTIVE</p><p>{membership.planId === 'yearly' ? 'Yearly Premium' : membership.planId === 'monthly' ? 'Monthly Premium' : 'Your existing Premium plan'}{membership.amount ? ` · ${membership.amount}${membership.billingInterval ? ` per ${membership.billingInterval}` : ''}` : ''}</p>{membership.currentPeriodEnd && <p>{membership.cancelAtPeriodEnd ? 'Access continues until ' : 'Current billing period ends '}{new Date(membership.currentPeriodEnd).toLocaleDateString()}.</p>}<Button asChild><Link href="/reports">Open weekly reports <ArrowRight size={16}/></Link></Button></> : <><div className="feature-actions" role="group" aria-label="Premium billing frequency">{(['monthly', 'yearly'] as const).map(id => <Button key={id} variant={plan === id ? 'default' : 'outline'} aria-pressed={plan === id} disabled={!catalog[id].available || !!busy} onClick={() => setPlan(id)}>{catalog[id].label} · {catalog[id].amount || 'Not available yet'}</Button>)}</div><p className="muted">{catalog[plan].available ? `${catalog[plan].amount} per ${catalog[plan].interval}. Renews ${plan === 'monthly' ? 'monthly' : 'yearly'} until canceled. Review the total in Stripe before subscribing.` : 'This billing option is not available yet.'}</p><Button disabled={!!busy || !membership.checkoutAvailable || !catalog[plan].available} onClick={() => void openBilling('checkout')}>{busy === 'checkout' ? 'Opening Stripe…' : 'Subscribe with Stripe'}</Button></>}
        {!['free', 'active', 'trialing'].includes(membership.status) && <p role="status">Subscription status: {membership.status.replaceAll('_', ' ')}. Use billing management to review payments and available options.</p>}
        {membership.canManage && <Button variant="outline" disabled={!!busy} onClick={() => void openBilling('portal')}>{busy === 'portal' ? 'Opening…' : 'Manage membership'}</Button>}
        {membership.canManage && <p className="muted">Open Stripe to manage your payment methods, invoices, cancellation, and any plan changes enabled for your subscription.</p>}
        {error && <p className="form-error" role="alert">{error}</p>}
      </section>
    </div>
  </div>;
}

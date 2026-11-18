'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Crown, Check, ArrowRight, RefreshCw } from 'lucide-react';
import { Button } from './ui/button';
import { useApp, request } from './providers';

export function MembershipPage() {
  const { data, refresh } = useApp();
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [returned, setReturned] = useState('');
  const [checking, setChecking] = useState(false);
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
    try { const result = await request(`/api/billing/${action}`, 'POST', {}); window.location.assign(result.url); }
    catch (error) { setError(error instanceof Error ? error.message : 'Could not open billing.'); setBusy(''); }
  }
  if (!data) return null;
  const membership = data.membership;
  return <div id="main-content" className="page-enter feature-page">
    <div className="page-heading"><div><span className="eyebrow">A LITTLE MORE ROOM TO REFLECT</span><h1>Moodora Premium <Crown className="heading-flower"/></h1><p>Look back on your week with a little more understanding.</p></div></div>
    {returned === 'success' && !membership.premium && <div className="card" role="status"><h2>{checking ? 'Confirming your membership…' : 'Your payment confirmation is still on its way.'}</h2><p>Premium access appears after Stripe confirms your subscription. You don’t need to pay again.</p><Button variant="outline" onClick={() => void refresh()}><RefreshCw size={16}/>Check again</Button></div>}
    {returned === 'cancelled' && <p role="status">Checkout was closed. You can continue using your free features.</p>}
    {membership.testMode && <p className="soft-badge">TEST BILLING · NO REAL MONEY IS CHARGED</p>}
    <div className="membership-grid">
      <section className="card feature-card"><span className="eyebrow">YOUR EVERYDAY SPACE</span><h2>Moodora Free</h2><p>Your daily rituals are always here.</p><ul className="feature-list"><li><Check size={17}/>Daily mood tracking</li><li><Check size={17}/>Private diary and calendar</li><li><Check size={17}/>Existing mood insights</li><li><Check size={17}/>Daily in-app reminders</li></ul><Link className="text-button" href="/dashboard">Go to my space <ArrowRight size={15}/></Link></section>
      <section className="card feature-card premium-card"><span className="eyebrow"><Crown size={15}/> MORE TIME TO REFLECT</span><h2>{membership.premium ? 'Your Premium membership' : 'Moodora Premium'}</h2><p>A private weekly summary made from your own check-ins.</p><ul className="feature-list"><li><Check size={17}/>Everything in Free</li><li><Check size={17}/>Weekly mood reports</li><li><Check size={17}/>Compare check-in counts with the previous week</li><li><Check size={17}/>Download a weekly report</li></ul>
        {membership.premium ? <><p className="soft-badge">PREMIUM ACTIVE</p>{membership.currentPeriodEnd && <p>{membership.cancelAtPeriodEnd ? 'Access continues until ' : 'Current billing period ends '}{new Date(membership.currentPeriodEnd).toLocaleDateString()}.</p>}<Button asChild><Link href="/reports">Open weekly reports <ArrowRight size={16}/></Link></Button></> : <><p className="muted">The recurring price and billing interval are shown in Stripe before you subscribe.</p><Button disabled={!!busy || !membership.checkoutAvailable} onClick={() => void openBilling('checkout')}>{busy === 'checkout' ? 'Opening Stripe…' : 'Subscribe with Stripe'}</Button>{!membership.checkoutAvailable && <p className="muted">Premium subscriptions are not available yet. Your free features are ready to use.</p>}</>}
        {membership.canManage && <Button variant="outline" disabled={!!busy} onClick={() => void openBilling('portal')}>{busy === 'portal' ? 'Opening…' : 'Manage membership'}</Button>}
        {error && <p className="form-error" role="alert">{error}</p>}
      </section>
    </div>
  </div>;
}

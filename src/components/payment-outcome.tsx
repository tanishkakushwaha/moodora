'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from './ui/button';
import { useApp } from './providers';
export function PaymentOutcome({ cancelled = false }: { cancelled?: boolean }) {
  const { data, refresh } = useApp();
  const [waiting, setWaiting] = useState(true);
  useEffect(() => {
    if (cancelled || data?.membership.premium) { setWaiting(false); return; }
    void refresh();
    let attempts = 0;
    const timer = window.setInterval(() => {
      void refresh();
      if (++attempts >= 10) { clearInterval(timer); setWaiting(false); }
    }, 3000);
    return () => clearInterval(timer);
  }, [cancelled, data?.membership.premium, refresh]);
  const premium = data?.membership.premium;
  return <div id="main-content" className="page-enter"><section className="card feature-card"><span className="eyebrow">YOUR MOODORA MEMBERSHIP</span><h1>{cancelled ? 'A little pause is okay.' : premium ? 'Welcome to Premium ♡' : waiting ? 'Confirming your subscription…' : 'Your confirmation is taking a little longer.'}</h1><p role="status">{cancelled ? 'Checkout was closed. You can choose a plan whenever you’re ready.' : premium ? 'Your membership is active. Your weekly mood reports are ready to explore.' : 'We’re waiting for Stripe’s verified subscription update. You don’t need to pay again.'}</p><div className="feature-actions">{premium ? <Button asChild><Link href="/reports">Explore my reports</Link></Button> : cancelled ? <Button asChild><Link href="/pricing">Compare plans</Link></Button> : <Button onClick={() => void refresh()}>Check confirmation</Button>}<Button variant="outline" asChild><Link href="/dashboard">Back to my space</Link></Button><Link className="text-button" href="/settings/subscription">Subscription settings</Link></div></section></div>;
}

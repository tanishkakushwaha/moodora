'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Check, Crown, Heart, LockKeyhole, Sparkles } from 'lucide-react';
import { Brand } from './brand';
import { Button } from './ui/button';
import './pricing.css';
import { annualSavings, type PlanCatalog } from '@/lib/plans';

const freeFeatures = ['Daily mood tracking and notes', 'Private journaling and full mood history', 'Mood calendar and existing insights', 'Daily in-app reminders', 'Breathing exercises and writing prompts'];
const premiumFeatures = ['Everything in Moodora Free', 'Weekly mood reports', 'Week-to-week check-in comparisons', 'Daily mood breakdowns in each report', 'Downloadable weekly reports'];
const comparisons = [
  ['Mood tracking and private journal', 'Included', 'Included'],
  ['Full mood history and calendar', 'Included', 'Included'],
  ['Existing mood charts and insights', 'Included', 'Included'],
  ['Daily in-app reminders', 'Included', 'Included'],
  ['Breathing exercises and writing prompts', 'Included', 'Included'],
  ['Weekly mood reports', '—', 'Included'],
  ['Previous-week check-in comparisons', '—', 'Included'],
  ['Downloadable weekly reports', '—', 'Included'],
];

export function PricingPage({ catalog }: { catalog: PlanCatalog }) {
  const savings = annualSavings(catalog);
  const recommended = savings ? 'yearly' : catalog.monthly.available ? 'monthly' : catalog.yearly.available ? 'yearly' : null;
  const testMode = catalog.testMode;
  const [billing, setBilling] = useState<'monthly' | 'yearly'>('monthly');
  return <div className="m-landing pricing-public">
    <header className="pricing-header"><Brand/><nav aria-label="Pricing navigation"><Link href="/">Home</Link><Link href="/login">Log in</Link><Button asChild size="sm"><Link href="/signup">Start for free <ArrowRight size={15}/></Link></Button></nav></header>
    <main id="main-content" className="pricing-main">
      <section className="pricing-intro"><span className="eyebrow"><Sparkles size={15}/> A LITTLE SPACE. ROOM TO GROW.</span><h1>Your space.<br/><em>Your pace. Your plan.</em></h1><p>Begin with the everyday rituals you love. Choose Premium when you’d like a little more room to reflect.</p>
        <div className="pricing-toggle" role="group" aria-label="Preferred billing frequency"><button type="button" aria-pressed={billing === 'monthly'} onClick={() => setBilling('monthly')}>Monthly</button><button type="button" aria-pressed={billing === 'yearly'} onClick={() => setBilling('yearly')}>Yearly</button></div>
        <p className="pricing-selection" role="status">{catalog[billing].available ? `${catalog[billing].amount} per ${catalog[billing].interval}, with automatic renewal until canceled.` : 'This billing option is not available yet. Your free space is always here.'}{billing === 'yearly' && savings && <span className="pricing-savings">Save {savings.amount?.replace(/\.00$/, '')} per year with annual billing.</span>}</p>
        {testMode && <p className="pricing-test-note">Stripe sandbox · Checkout is for testing and does not charge real money.</p>}
      </section>

      <section className={`pricing-plans pricing-prefer-${billing}`} aria-label="Moodora plans">
        <article className="pricing-plan"><span className="pricing-plan-icon"><Heart size={24}/></span><h2>Free</h2><p className="pricing-plan-summary">Your everyday place to feel, write, and unwind.</p><div className="pricing-amount">Free<span>No subscription required</span></div><Button variant="outline" asChild><Link href="/signup">Start my free space <ArrowRight size={16}/></Link></Button><ul>{freeFeatures.map(feature => <li key={feature}><Check size={17}/>{feature}</li>)}</ul><p className="pricing-card-note">Your existing everyday features stay free.</p></article>

        {(['monthly', 'yearly'] as const).map(id => {
          const plan = catalog[id];
          return <article key={id} className={`pricing-plan ${id === 'monthly' ? 'pricing-plan-premium' : 'pricing-plan-yearly'} ${billing === id ? 'pricing-plan-selected' : ''}`}>
            {id === recommended && <span className="pricing-recommended"><Crown size={14}/>{savings ? 'BEST VALUE' : 'RECOMMENDED'}</span>}
            <span className="pricing-plan-icon"><Crown size={24}/></span><h2>{plan.label}</h2>
            <p className="pricing-plan-summary">{id === 'monthly' ? 'A thoughtful look back at your week, just for you.' : 'The same thoughtful reflections, with one annual subscription.'}</p>
            <div className={`pricing-amount ${plan.available ? '' : 'pricing-amount-fallback'}`}>{plan.amount || 'Not available yet'}<span>{plan.available ? `per ${plan.interval} · billed ${id}` : 'Checkout opens when this Stripe plan is configured'}</span></div>
            {plan.available ? <Button variant={id === billing ? 'default' : 'outline'} asChild><Link href={`/checkout?plan=${id}`}>Choose {id === 'monthly' ? 'monthly' : 'yearly'} Premium <ArrowRight size={16}/></Link></Button> : <Button variant="outline" disabled>{id === 'monthly' ? 'Monthly' : 'Yearly'} checkout unavailable</Button>}
            <ul>{premiumFeatures.map(feature => <li key={feature}><Check size={17}/>{feature}</li>)}</ul>
            {id === 'yearly' && savings && <p className="pricing-yearly-copy">Save {savings.amount} compared with 12 monthly payments at the current price.</p>}
            <p className="pricing-card-note">{plan.available ? `Renews ${id} until canceled. Sign in to continue; Stripe shows your total before confirmation.` : 'No payment is available for this billing option yet. You can continue using Free.'}</p>
          </article>;
        })}
      </section>

      <div className="pricing-trust"><span><LockKeyhole size={16}/>Payments handled by Stripe</span><span><Heart size={16}/>Free to begin</span><span><Check size={16}/>Only features available today</span></div>
      <section className="pricing-comparison" aria-labelledby="pricing-compare"><div className="pricing-section-heading"><span className="eyebrow">THE LITTLE DETAILS</span><h2 id="pricing-compare">Find what feels right for you.</h2><p>Premium adds weekly reports. Your journal, history, and daily rituals remain available on Free.</p></div><div className="pricing-table-wrap"><table><caption className="sr-only">Comparison of implemented Moodora Free and monthly Premium features</caption><thead><tr><th scope="col">Your Moodora experience</th><th scope="col">Free</th><th scope="col">Premium</th></tr></thead><tbody>{comparisons.map(([feature, free, premium]) => <tr key={feature}><th scope="row">{feature}</th><td>{free === '—' ? <span aria-label="Not included">—</span> : free}</td><td>{premium}</td></tr>)}</tbody></table></div></section>
      <section className="pricing-faq" aria-labelledby="pricing-questions"><div className="pricing-section-heading"><span className="eyebrow">A FEW LITTLE ANSWERS</span><h2 id="pricing-questions">Before you choose.</h2></div>
        <details><summary>Do I need an account to compare plans?</summary><p>No. You can explore this page without signing in. An account is required to save your moods and journal or subscribe to Premium.</p></details>
        <details><summary>What does Premium unlock today?</summary><p>Weekly mood reports, comparisons with the previous week, a day-by-day breakdown, and report downloads. Existing mood tracking, journaling, history, charts, and self-care tools remain free.</p></details>
        <details><summary>How do monthly payments work?</summary><p>Stripe shows the price, billing interval, and total before you confirm. Monthly subscriptions renew until canceled. When cancellation is scheduled for the end of your billing period, Premium continues until that period ends.</p></details>
        <details><summary>Can I subscribe yearly?</summary><p>Choose the yearly plan when its checkout is available above. It includes the same Premium features as monthly billing and renews once per year until canceled.</p></details>
        <details><summary>Will daily reminders arrive when the app is closed?</summary><p>Reminders currently appear inside Moodora while it is open, after the time you choose in Settings. Email and background push reminders are not included.</p></details>
      </section>
      <section className="pricing-closing"><Heart size={27}/><h2>No perfect days required.</h2><p>Your next little check-in can start for free.</p><Button asChild><Link href="/signup">Make yourself at home <ArrowRight size={17}/></Link></Button></section>
    </main>
    <footer className="pricing-footer"><Brand/><nav aria-label="Footer"><Link href="/privacy">Privacy</Link><Link href="/terms">Terms</Link><Link href="/login">My space</Link></nav><span>Grow gently. At your own pace.</span></footer>
  </div>;
}

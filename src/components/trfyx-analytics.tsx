'use client';

import Script from 'next/script';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { TRFYX_DOMAIN, TRFYX_WEBSITE_ID, analyticsChoice, saveAnalyticsChoice, type AnalyticsChoice } from '@/lib/trfyx';
import './trfyx-analytics.css';

export function TrfyxAnalytics() {
  const [choice, setChoice] = useState<AnalyticsChoice | null>(null);
  const [enabledHost, setEnabledHost] = useState(false);
  useEffect(() => {
    setEnabledHost(window.location.hostname === TRFYX_DOMAIN);
    const update = () => setChoice(analyticsChoice());
    update();
    window.addEventListener('moodora:analytics-choice', update);
    return () => window.removeEventListener('moodora:analytics-choice', update);
  }, []);
  if (!enabledHost) return null;
  if (choice === null) return <aside className="analytics-choice" aria-label="Optional analytics">
    <p><strong>Help Moodora grow gently.</strong> Allow optional analytics to understand visits and subscriptions. Your journal text is never included. <Link href="/privacy#analytics-settings">Privacy and choices</Link></p>
    <div><button type="button" className="button button-outline" onClick={() => saveAnalyticsChoice('denied')}>Not now</button><button type="button" className="button" onClick={() => saveAnalyticsChoice('granted')}>Allow analytics</button></div>
  </aside>;
  if (choice !== 'granted') return null;
  return <Script id="moodora-trfyx" src="https://app.trfyx.com/script.js" strategy="afterInteractive"
    data-website-id={TRFYX_WEBSITE_ID} data-domain={TRFYX_DOMAIN}
    data-disable-replay="true" data-disable-heatmaps="true" data-disable-form-tracking="true"
    data-disable-file-downloads="true" data-replay-mask-all-text="true" />;
}

export function AnalyticsSettings() {
  const [choice, setChoice] = useState<AnalyticsChoice | null>(null);
  useEffect(() => {
    const update = () => setChoice(analyticsChoice());
    update();
    window.addEventListener('moodora:analytics-choice', update);
    return () => window.removeEventListener('moodora:analytics-choice', update);
  }, []);
  function choose(next: AnalyticsChoice) {
    saveAnalyticsChoice(next);
    if (next === 'denied') {
      // Removing a script element alone cannot stop its already-running listeners.
      document.cookie = `df_visitor_id=; Path=/; Max-Age=0; SameSite=Lax`;
      document.cookie = `df_visitor_id=; Domain=${TRFYX_DOMAIN}; Path=/; Max-Age=0; SameSite=Lax`;
      window.location.reload();
    } else setChoice(next);
  }
  return <section id="analytics-settings" aria-labelledby="analytics-heading">
    <h2 id="analytics-heading">Optional analytics</h2>
    <p>Trfyx helps us understand page visits, successful email signups, checkout openings, and the traffic sources of subscriptions. If you allow it, Trfyx receives page addresses and titles, referrers, device information, and visitor identifiers. Its visitor cookie can last up to a year. Stripe revenue attribution requires a separate connection in Trfyx and may include payment and customer information from Stripe.</p>
    <p>We do not send your mood values, journal text, passwords, or form contents as custom events. Session replay, heatmaps, automatic form tracking, and automatic file download tracking are disabled. You can use Moodora and pay for Premium without allowing analytics.</p>
    <p>Your choice: {choice === 'granted' ? 'allowed' : choice === 'denied' ? 'declined' : 'not chosen'}. We remember this preference for up to a year. Changing it does not erase information already recorded.</p>
    <div className="analytics-settings-actions"><button type="button" className="button" onClick={() => choose('granted')}>Allow analytics</button><button type="button" className="button button-outline" onClick={() => choose('denied')}>Decline analytics</button></div>
    <p><a href="https://www.trfyx.com/privacy" target="_blank" rel="noreferrer">Trfyx privacy policy</a></p>
  </section>;
}

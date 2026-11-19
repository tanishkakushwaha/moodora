// Public installation settings supplied by the site's Trfyx dashboard.
export const TRFYX_WEBSITE_ID = 'Wwfhn43v8pg5';
export const TRFYX_DOMAIN = 'my-moodora.vercel.app';
export const ANALYTICS_CHOICE = 'moodora_analytics_consent';
export type AnalyticsChoice = 'granted' | 'denied';
type Tracker = ((...args: unknown[]) => void) & { q?: unknown[][] };
type TrackingWindow = Window & { trfyx?: Tracker };
const sentCheckouts = new Set<string>();

export function cookieValue(cookie: string, name: string): string | undefined {
  const raw = cookie.split(';').map(part => part.trim()).find(part => part.startsWith(`${name}=`))?.slice(name.length + 1);
  try { return raw === undefined ? undefined : decodeURIComponent(raw); } catch { return undefined; }
}

export function analyticsChoice(): AnalyticsChoice | null {
  if (typeof document === 'undefined') return null;
  const value = cookieValue(document.cookie, ANALYTICS_CHOICE);
  return value === 'granted' || value === 'denied' ? value : null;
}

export function analyticsAllowed() {
  if (typeof window === 'undefined' || window.location.hostname !== TRFYX_DOMAIN || analyticsChoice() !== 'granted') return false;
  try { return window.localStorage.getItem('df_ignore') !== 'true'; } catch { return true; }
}

export function saveAnalyticsChoice(choice: AnalyticsChoice) {
  document.cookie = `${ANALYTICS_CHOICE}=${choice}; Path=/; Max-Age=31536000; SameSite=Lax${window.location.protocol === 'https:' ? '; Secure' : ''}`;
  window.dispatchEvent(new Event('moodora:analytics-choice'));
}

// Queue documented custom events while the official deferred script is loading.
// Tracking must never stop sign-in or payment navigation.
function send(name: string, properties: Record<string, string>, callback?: () => void) {
  try {
    if (!analyticsAllowed()) return false;
    const target = window as TrackingWindow;
    target.trfyx ??= Object.assign((...args: unknown[]) => { (target.trfyx!.q ??= []).push(args); }, { q: [] as unknown[][] });
    if (callback) target.trfyx(name, properties, callback);
    else target.trfyx(name, properties);
    return true;
  } catch { return false; }
}

export function trackSignupCompleted() {
  send('signup_completed', { method: 'email' });
}

export async function trackCheckoutStarted(sessionId: unknown, plan: string) {
  if (typeof sessionId !== 'string' || !sessionId.startsWith('cs_') || !['monthly', 'yearly'].includes(plan) || !analyticsAllowed()) return;
  // Session IDs are local deduplication keys, never event properties.
  const key = `moodora:checkout-started:${sessionId}`;
  if (sentCheckouts.has(key)) return;
  try { if (window.localStorage.getItem(key)) return; } catch { /* Use the in-memory fallback. */ }
  await new Promise<void>(resolve => {
    // Give the documented request callback time to finish before leaving the site.
    // A blocked tracker must never leave the customer waiting indefinitely.
    const timeout = setTimeout(resolve, 700);
    const done = () => { clearTimeout(timeout); resolve(); };
    if (!send('checkout_started', { plan: 'premium', billing: plan }, done)) { done(); return; }
    sentCheckouts.add(key);
    try { window.localStorage.setItem(key, '1'); } catch { /* Checkout remains usable without storage. */ }
  });
}

// Optional attribution only. Neither this cookie nor an analytics event grants Premium.
export function stripeAttribution(visitorId?: string, choice?: string): Record<string, string> {
  if (choice !== 'granted' || !visitorId || visitorId.length > 255 || /[\s\x00-\x1f\x7f]/.test(visitorId)) return {};
  return { 'metadata[df_visitor_id]': visitorId, 'subscription_data[metadata][df_visitor_id]': visitorId };
}

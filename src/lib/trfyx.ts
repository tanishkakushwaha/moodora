// Public installation settings supplied by the site's Trfyx dashboard.
export const TRFYX_WEBSITE_ID = 'wwfhn43v8pg5';
export const TRFYX_DOMAIN = 'my-moodora.vercel.app';
export const ANALYTICS_CHOICE = 'moodora_analytics_consent';
export type AnalyticsChoice = 'granted' | 'denied';
type Tracker = ((...args: unknown[]) => void) & { q?: unknown[][] };
type DeliveryResult = { status?: number };
type TrackingWindow = Window & { trfyx?: Tracker };
const sentCheckouts = new Set<string>();
// Keep concurrent callers together. Unknown delivery remains guarded in this
// page's memory rather than being falsely persisted as successful delivery.
const checkoutAttempts = new Map<string, Promise<void>>();

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
  try {
    if (typeof window === 'undefined' || window.location.hostname !== TRFYX_DOMAIN || analyticsChoice() !== 'granted') return false;
    try { return window.localStorage.getItem('df_ignore') !== 'true'; } catch { return true; }
  } catch { return false; }
}

export function saveAnalyticsChoice(choice: AnalyticsChoice) {
  document.cookie = `${ANALYTICS_CHOICE}=${choice}; Path=/; Max-Age=31536000; SameSite=Lax${window.location.protocol === 'https:' ? '; Secure' : ''}`;
  window.dispatchEvent(new Event('moodora:analytics-choice'));
}

// Queue documented custom events while the official deferred script is loading.
// Tracking must never stop sign-in or payment navigation.
function send(name: string, properties: Record<string, string>, callback?: (result?: DeliveryResult) => void) {
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
  const previousAttempt = checkoutAttempts.get(key);
  if (previousAttempt) return previousAttempt;
  let resolveAttempt!: () => void;
  const attempt = new Promise<void>(resolve => { resolveAttempt = resolve; });
  checkoutAttempts.set(key, attempt);
  // Give the documented callback time to finish before leaving the site.
  // A timeout is uncertain delivery, so never label it as accepted or blindly
  // send again from this page. A later callback can still settle its state.
  const timeout = setTimeout(resolveAttempt, 700);
  const done = (result?: DeliveryResult) => {
    if (result?.status === 200 || result?.status === 202) {
      sentCheckouts.add(key);
      try { window.localStorage.setItem(key, '1'); } catch { /* Use memory if storage is unavailable. */ }
      checkoutAttempts.delete(key);
    } else if (typeof result?.status === 'number' && result.status >= 400) {
      // An explicitly rejected delivery must not prevent a later user retry.
      checkoutAttempts.delete(key);
    }
    clearTimeout(timeout);
    resolveAttempt();
  };
  if (!send('checkout_started', { plan: 'premium', billing: plan }, done)) {
    checkoutAttempts.delete(key);
    clearTimeout(timeout);
    resolveAttempt();
  }
  return attempt;
}

// Optional attribution only. Neither this cookie nor an analytics event grants Premium.
export function stripeAttribution(visitorId?: string, choice?: string): Record<string, string> {
  if (choice !== 'granted' || !visitorId || visitorId.length > 255 || /[\s\x00-\x1f\x7f]/.test(visitorId)) return {};
  return { 'metadata[df_visitor_id]': visitorId, 'subscription_data[metadata][df_visitor_id]': visitorId };
}

import test from 'node:test';
import assert from 'node:assert/strict';
import { analyticsAllowed, cookieValue, stripeAttribution, trackCheckoutStarted, trackSignupCompleted, TRFYX_DOMAIN } from '../src/lib/trfyx.ts';

type FakeTracker = ((...args: unknown[]) => void) & { q?: unknown[][] };
function browser(cookie = 'moodora_analytics_consent=granted', hostname = TRFYX_DOMAIN) {
  const storage = new Map<string, string>();
  const target = { location: { hostname }, localStorage: { getItem: (key: string) => storage.get(key) ?? null, setItem: (key: string, value: string) => { storage.set(key, value); } }, trfyx: undefined as FakeTracker | undefined };
  Object.defineProperty(globalThis, 'window', { configurable: true, value: target });
  Object.defineProperty(globalThis, 'document', { configurable: true, value: { cookie } });
  return { target, storage };
}
test.afterEach(() => { Reflect.deleteProperty(globalThis, 'window'); Reflect.deleteProperty(globalThis, 'document'); });

test('SSR and declined or unset choices send no events; previews do not pollute production', () => {
  assert.equal(analyticsAllowed(), false);
  assert.doesNotThrow(trackSignupCompleted);
  for (const [cookie, host] of [['', TRFYX_DOMAIN], ['moodora_analytics_consent=denied', TRFYX_DOMAIN], ['moodora_analytics_consent=granted', 'preview.vercel.app']]) {
    const { target } = browser(cookie, host);
    trackSignupCompleted();
    assert.equal(target.trfyx, undefined);
  }
});

test('successful signup queues only an event name and safe fixed properties before script readiness', () => {
  const { target } = browser();
  trackSignupCompleted();
  assert.deepEqual(target.trfyx?.q, [['signup_completed', { method: 'email' }]]);
});

test('checkout events deduplicate a reused session across callers and a page reload', async () => {
  const { target, storage } = browser();
  const calls: unknown[][] = [];
  target.trfyx = (...args) => { calls.push(args); (args[2] as () => void)(); };
  await trackCheckoutStarted('cs_unique_test', 'monthly');
  await trackCheckoutStarted('cs_unique_test', 'monthly');
  // Simulate a marker retained from another page, without relying on the memory set.
  storage.set('moodora:checkout-started:cs_previous_page', '1');
  await trackCheckoutStarted('cs_previous_page', 'yearly');
  assert.equal(calls.length, 1);
  assert.deepEqual(calls[0].slice(0, 2), ['checkout_started', { plan: 'premium', billing: 'monthly' }]);
});

test('tracker exceptions and unavailable storage cannot break signups or checkout', async () => {
  const { target } = browser();
  target.localStorage.getItem = () => { throw new Error('storage denied'); };
  target.localStorage.setItem = () => { throw new Error('storage denied'); };
  target.trfyx = () => { throw new Error('tracking blocked'); };
  assert.doesNotThrow(trackSignupCompleted);
  await assert.doesNotReject(trackCheckoutStarted('cs_blocked_test', 'yearly'));
  target.trfyx = (...args) => { (args[2] as () => void)(); };
  await assert.doesNotReject(trackCheckoutStarted('cs_storage_test', 'yearly'));
});

test('checkout without a tracker callback has a bounded wait', async () => {
  const { target } = browser();
  target.trfyx = () => {};
  await trackCheckoutStarted('cs_no_callback', 'yearly');
});

test('owner traffic exclusion and invalid session responses do not emit checkout events', async () => {
  const { target, storage } = browser();
  storage.set('df_ignore', 'true');
  trackSignupCompleted();
  await trackCheckoutStarted('cs_excluded', 'monthly');
  storage.clear();
  await trackCheckoutStarted(undefined, 'monthly');
  await trackCheckoutStarted('cs_invalid_plan', 'lifetime');
  assert.equal(target.trfyx, undefined);
});

test('Stripe visitor metadata is optional, consent gated, and preserves application ownership fields', () => {
  for (const visitor of [undefined, '', 'bad\nvalue', 'a'.repeat(256)]) assert.deepEqual(stripeAttribution(visitor, 'granted'), {});
  for (const choice of [undefined, 'denied', 'invalid']) assert.deepEqual(stripeAttribution('visitor_123', choice), {});
  const original = { client_reference_id: 'user_123', 'subscription_data[metadata][moodoraUserId]': 'user_123', 'subscription_data[metadata][moodoraPlan]': 'monthly' };
  assert.deepEqual({ ...original, ...stripeAttribution('visitor_123', 'granted') }, { ...original, 'metadata[df_visitor_id]': 'visitor_123', 'subscription_data[metadata][df_visitor_id]': 'visitor_123' });
});

test('cookie parsing handles encoded, unrelated and malformed cookies safely', () => {
  assert.equal(cookieValue('other=df_visitor_id; df_visitor_id=abc%2D123', 'df_visitor_id'), 'abc-123');
  assert.equal(cookieValue('df_visitor_id=%ZZ', 'df_visitor_id'), undefined);
  assert.equal(cookieValue('other=123', 'df_visitor_id'), undefined);
});

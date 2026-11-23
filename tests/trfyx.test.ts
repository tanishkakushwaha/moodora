import test from 'node:test';
import assert from 'node:assert/strict';
process.env.NEXT_PUBLIC_TESTING_TRFYX_WEBSITE_ID = 'offline_testing_fixture';
process.env.NEXT_PUBLIC_TESTING_TRFYX_DOMAIN = 'testing.trfyx.com';
const { analyticsAllowed, cookieValue, stripeAttribution, trackCheckoutStarted, trackSignupCompleted, TRFYX_DOMAIN } = await import('../src/lib/trfyx.ts');

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
  target.trfyx = (...args) => { calls.push(args); (args[2] as (result: { status: number }) => void)({ status: 202 }); };
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
  target.trfyx = (...args) => { (args[2] as (result: { status: number }) => void)({ status: 202 }); };
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

test('explicit failure does not persist success and the same checkout can retry', async () => {
  const { target, storage } = browser();
  let calls = 0;
  target.trfyx = (...args) => {
    calls++;
    (args[2] as (result: { status: number }) => void)({ status: calls === 1 ? 500 : 202 });
  };
  await trackCheckoutStarted('cs_failed_then_accepted', 'monthly');
  assert.equal(storage.has('moodora:checkout-started:cs_failed_then_accepted'), false);
  await trackCheckoutStarted('cs_failed_then_accepted', 'monthly');
  assert.equal(calls, 2);
  assert.equal(storage.get('moodora:checkout-started:cs_failed_then_accepted'), '1');
  await trackCheckoutStarted('cs_failed_then_accepted', 'monthly');
  assert.equal(calls, 2);
});

test('concurrent callers wait for one delivery and do not send twice', async () => {
  const { target, storage } = browser();
  let calls = 0;
  let complete!: (result: { status: number }) => void;
  target.trfyx = (...args) => { calls++; complete = args[2] as typeof complete; };
  const first = trackCheckoutStarted('cs_concurrent_delivery', 'yearly');
  let secondFinished = false;
  const second = trackCheckoutStarted('cs_concurrent_delivery', 'yearly').then(() => { secondFinished = true; });
  await Promise.resolve();
  assert.equal(calls, 1);
  assert.equal(secondFinished, false);
  assert.equal(storage.has('moodora:checkout-started:cs_concurrent_delivery'), false);
  complete({ status: 200 });
  await Promise.all([first, second]);
  assert.equal(secondFinished, true);
  assert.equal(storage.get('moodora:checkout-started:cs_concurrent_delivery'), '1');
});

test('uncertain delivery is not marked successful or automatically repeated in the page', async () => {
  const { target, storage } = browser();
  let calls = 0;
  let complete!: (result: { status: number }) => void;
  target.trfyx = (...args) => { calls++; complete = args[2] as typeof complete; };
  await trackCheckoutStarted('cs_unknown_delivery', 'monthly');
  await trackCheckoutStarted('cs_unknown_delivery', 'monthly');
  assert.equal(calls, 1);
  assert.equal(storage.has('moodora:checkout-started:cs_unknown_delivery'), false);
  // Even a callback received after the bounded navigation wait can confirm it.
  complete({ status: 202 });
  assert.equal(storage.get('moodora:checkout-started:cs_unknown_delivery'), '1');
});

test('an explicit failure arriving after a timeout permits a later retry', async () => {
  const { target, storage } = browser();
  let calls = 0;
  let complete!: (result: { status: number }) => void;
  target.trfyx = (...args) => { calls++; complete = args[2] as typeof complete; };
  await trackCheckoutStarted('cs_late_failure', 'monthly');
  complete({ status: 503 });
  const retry = trackCheckoutStarted('cs_late_failure', 'monthly');
  assert.equal(calls, 2);
  complete({ status: 202 });
  await retry;
  assert.equal(storage.get('moodora:checkout-started:cs_late_failure'), '1');
});

test('cookie SecurityError cannot reject the checkout tracking helper', async () => {
  const { target } = browser();
  Object.defineProperty(globalThis, 'document', {
    configurable: true,
    value: { get cookie() { throw new DOMException('Cookies unavailable', 'SecurityError'); } },
  });
  assert.equal(analyticsAllowed(), false);
  assert.doesNotThrow(trackSignupCompleted);
  await assert.doesNotReject(trackCheckoutStarted('cs_cookie_access_denied', 'monthly'));
  assert.equal(target.trfyx, undefined);
});

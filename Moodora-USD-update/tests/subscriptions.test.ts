import test from 'node:test';
import assert from 'node:assert/strict';
import { annualSavings, formatPrice, isPlan, planForPrice, priceIdFor, purchaseDestination, safeAuthDestination, validPlanPrice, type PlanCatalog, type PriceDetails } from '../src/lib/plans.ts';
import { subscriptionValues, type StripeSubscriptionState } from '../src/lib/subscription-state.ts';
import { hasPremium } from '../src/lib/membership.ts';

const env = { STRIPE_PREMIUM_PRICE_ID: 'price_original', STRIPE_MONTHLY_PRICE_ID: 'price_monthly', STRIPE_YEARLY_PRICE_ID: 'price_yearly' };
const monthly: PriceDetails = { id: 'price_monthly', active: true, currency: 'usd', unit_amount: 1500, recurring: { interval: 'month', interval_count: 1 } };
const yearly: PriceDetails = { id: 'price_yearly', active: true, currency: 'usd', unit_amount: 15000, recurring: { interval: 'year', interval_count: 1 } };
function subscription(price = monthly): StripeSubscriptionState {
  return { id: 'sub_fixture', customer: 'cus_fixture', status: 'active', created: 1794000000, cancel_at_period_end: false,
    items: { data: [{ price, current_period_end: Date.parse('2027-11-18T12:00:00Z') / 1000 }] },
  };
}

test('server maps plan names to configured prices while retaining the original price', () => {
  assert.equal(priceIdFor('monthly', env), 'price_monthly');
  assert.equal(priceIdFor('yearly', env), 'price_yearly');
  assert.equal(priceIdFor('monthly', { STRIPE_PREMIUM_PRICE_ID: 'price_original' }), 'price_original');
  assert.equal(priceIdFor('yearly', {}), undefined);
  assert.equal(planForPrice('price_original', env), 'legacy');
  assert.equal(planForPrice('price_monthly', env), 'monthly');
  assert.equal(planForPrice('price_yearly', env), 'yearly');
  assert.equal(planForPrice('price_unknown', env), null);
});

test('new plans require the exact approved currency, amount, interval, and price ID', () => {
  assert.equal(validPlanPrice('monthly', monthly, env), true);
  assert.equal(validPlanPrice('yearly', yearly, env), true);
  for (const altered of [{ ...monthly, currency: 'inr' }, { ...monthly, unit_amount: 19900 }, { ...monthly, unit_amount: null }, { ...monthly, active: false }, { ...monthly, id: 'price_injected' }, { ...monthly, recurring: null }, { ...monthly, recurring: { interval: 'year', interval_count: 1 } }, { ...monthly, recurring: { interval: 'month', interval_count: 3 } }]) {
    assert.equal(validPlanPrice('monthly', altered, env), false);
  }
  assert.equal(validPlanPrice('yearly', { ...yearly, unit_amount: 19900 }, env), false);
});

test('the existing monthly checkout can continue at its original currency and amount', () => {
  const legacyEnv = { STRIPE_PREMIUM_PRICE_ID: 'price_original' };
  assert.equal(validPlanPrice('monthly', { ...monthly, id: 'price_original', currency: 'usd', unit_amount: 1500 }, legacyEnv), true);
  assert.equal(validPlanPrice('monthly', { ...monthly, id: 'price_original', recurring: { interval: 'year', interval_count: 1 } }, legacyEnv), false);
});

test('monthly and yearly subscriptions grant access only through actual valid state', () => {
  const now = new Date('2026-11-18T12:00:00Z');
  for (const price of [monthly, yearly]) {
    const values = subscriptionValues(subscription(price), env);
    assert.equal(hasPremium([values], now), true);
    assert.equal(values.planId, price === yearly ? 'yearly' : 'monthly');
    assert.equal(values.stripePriceId, price.id);
    assert.equal(values.unitAmount, price.unit_amount);
  }
  for (const status of ['incomplete', 'incomplete_expired', 'canceled', 'past_due', 'unpaid', 'paused']) {
    const values = subscriptionValues({ ...subscription(yearly), status }, env);
    assert.equal(hasPremium([values], now), false);
  }
});

test('unrecognized or misconfigured new prices cannot grant Premium', () => {
  for (const price of [{ ...monthly, id: 'price_unapproved' }, { ...yearly, currency: 'inr' }, { ...monthly, unit_amount: 1 }]) {
    assert.equal(hasPremium([subscriptionValues(subscription(price), env)]), false);
  }
});

test('archiving a valid price does not remove paid access from an existing subscriber', () => {
  assert.equal(hasPremium([subscriptionValues(subscription({ ...yearly, active: false }), env)], new Date('2026-11-18T12:00:00Z')), true);
});

test('legacy subscribers retain access even if the new monthly configuration reuses the old ID', () => {
  const values = subscriptionValues(subscription({ ...monthly, id: 'price_original', currency: 'usd', unit_amount: 1500 }), { ...env, STRIPE_MONTHLY_PRICE_ID: 'price_original' });
  assert.equal(values.planId, 'legacy');
  assert.equal(hasPremium([values], new Date('2026-11-18T12:00:00Z')), true);
});

test('scheduled cancellation preserves access only until the actual paid-through date', () => {
  const values = subscriptionValues({ ...subscription(yearly), cancel_at_period_end: true }, env);
  assert.equal(values.cancelAtPeriodEnd, true);
  assert.equal(hasPremium([values], new Date('2027-11-18T11:59:59Z')), true);
  assert.equal(hasPremium([values], new Date('2027-11-18T12:00:00Z')), false);
});

test('selected plans survive authentication but arbitrary redirect targets are rejected', () => {
  for (const plan of ['monthly', 'yearly']) {
    assert.equal(isPlan(plan), true);
    assert.equal(safeAuthDestination(purchaseDestination(plan)), `/checkout?plan=${plan}`);
  }
  for (const value of [undefined, 'lifetime', 'price_injected', ['monthly'], 'https://attacker.example', '//attacker.example', '/checkout?plan=monthly&next=https://attacker.example', '/checkout?plan=yearly#injected']) {
    assert.equal(safeAuthDestination(value), '/dashboard');
  }
});

test('annual savings are calculated only for available plans in the same currency', () => {
  const catalog: PlanCatalog = {
    monthly: { id: 'monthly', label: 'Monthly', available: true, amount: '$15.00', unitAmount: 1500, currency: 'usd', interval: 'month' },
    yearly: { id: 'yearly', label: 'Yearly', available: true, amount: '$150.00', unitAmount: 15000, currency: 'usd', interval: 'year' }, testMode: true,
  };
  assert.equal(annualSavings(catalog)?.percent, 17);
  assert.equal(annualSavings(catalog)?.amount, '$30.00');
  assert.equal(annualSavings({ ...catalog, yearly: { ...catalog.yearly, available: false } }), null);
  assert.equal(annualSavings({ ...catalog, monthly: { ...catalog.monthly, currency: 'inr' } }), null);
  assert.equal(annualSavings({ ...catalog, yearly: { ...catalog.yearly, unitAmount: 300000 } }), null);
  assert.equal(formatPrice({ currency: 'usd', unit_amount: 1500 }), '$15.00');
});

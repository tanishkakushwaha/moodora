import 'server-only';
import { ApiError } from './api';
import { db } from './db';
import { hasPremium } from './membership';
import type { Prisma } from '@/generated/prisma/client';
import { formatPrice, priceIdFor, validPlanPrice, type PlanId, type PriceDetails, type PlanCatalog } from './plans';
import { subscriptionValues, type StripeSubscriptionState } from './subscription-state';

export function billingReady() {
  return !!(process.env.STRIPE_SECRET_KEY && (priceIdFor('monthly') || priceIdFor('yearly')) && process.env.STRIPE_WEBHOOK_SECRET);
}

export async function stripeRequest<T>(path: string, params?: Record<string, string>, idempotencyKey?: string): Promise<T> {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new ApiError('Membership checkout is not available yet.', 503);
  const response = await fetch(`https://api.stripe.com/v1/${path}`, {
    method: params ? 'POST' : 'GET',
    headers: { Authorization: `Bearer ${key}`, 'Stripe-Version': '2026-10-28.endive',
      ...(params ? { 'Content-Type': 'application/x-www-form-urlencoded' } : {}),
      ...(idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {}),
    },
    ...(params ? { body: new URLSearchParams(params) } : {}),
    cache: 'no-store', signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) {
    console.error('Stripe request failed', response.status, path.split('/')[0]);
    throw new ApiError('Stripe could not complete this request. Please try again shortly.', 502);
  }
  return response.json() as Promise<T>;
}

export async function verifiedPlanPrice(plan: PlanId) {
  const id = priceIdFor(plan);
  if (!id) throw new ApiError('This billing option is not available yet.', 503);
  const price = await stripeRequest<PriceDetails>(`prices/${encodeURIComponent(id)}`);
  if (!validPlanPrice(plan, price)) {
    console.error('Stripe price configuration does not match plan', plan);
    throw new ApiError('This plan is being configured. Please choose another option or try again later.', 503);
  }
  return price;
}

export async function publicPlans(): Promise<PlanCatalog> {
  const testMode = /^(sk|rk)_test_/.test(process.env.STRIPE_SECRET_KEY || '');
  const plans = await Promise.all((['monthly', 'yearly'] as const).map(async id => {
    const interval = id === 'monthly' ? 'month' as const : 'year' as const;
    try {
      if (!billingReady()) throw new Error('Billing unavailable');
      const price = await verifiedPlanPrice(id);
      return { id, label: id === 'monthly' ? 'Monthly Premium' : 'Yearly Premium', available: true, amount: formatPrice(price), unitAmount: price.unit_amount, currency: price.currency, interval };
    } catch { return { id, label: id === 'monthly' ? 'Monthly Premium' : 'Yearly Premium', available: false, amount: null, unitAmount: null, currency: null, interval }; }
  }));
  return { monthly: plans[0], yearly: plans[1], testMode };
}

// Retrieve current state after locking the account: duplicate and out-of-order
// events cannot restore an older state or grant access from an unrelated price.
export async function syncSubscription(subscriptionId: string, customerId: string, event?: { id: string; type: string }) {
  const user = await db.user.findUnique({ where: { stripeCustomerId: customerId }, select: { id: true } });
  if (!user) return;
  await db.$transaction(async transaction => {
    await transaction.$queryRaw`SELECT "id" FROM "User" WHERE "id" = ${user.id} FOR UPDATE`;
    if (event && await transaction.stripeWebhookEvent.findUnique({ where: { id: event.id } })) return;
    const subscription = await stripeRequest<StripeSubscriptionState>(`subscriptions/${encodeURIComponent(subscriptionId)}`);
    if (subscription.customer !== customerId) throw new ApiError('Subscription customer mismatch.', 400);
    const values = { userId: user.id, ...subscriptionValues(subscription) };
    await transaction.subscription.upsert({ where: { id: subscription.id }, create: { id: subscription.id, ...values }, update: values });
    if (Number.isFinite(subscription.created) && subscription.created > 0) await transaction.subscription.update({ where: { id: subscription.id }, data: { createdAt: new Date(subscription.created * 1000) } });
    if (event) await transaction.stripeWebhookEvent.create({ data: event });
  }, { timeout: 30000, maxWait: 10000 });
}

export async function membershipFor(userId: string, transaction: Pick<Prisma.TransactionClient, 'subscription'> = db) {
  const subscriptions = await transaction.subscription.findMany({ where: { userId }, orderBy: { updatedAt: 'desc' } });
  const active = subscriptions.find(subscription => hasPremium([subscription]));
  const latest = active || subscriptions[0];
  return { premium: !!active, status: latest?.status || 'free',
    planId: latest?.planId || 'free', billingInterval: latest?.billingInterval || null,
    amount: latest?.currency ? formatPrice({ currency: latest.currency, unit_amount: latest.unitAmount }) : null,
    currentPeriodEnd: latest?.currentPeriodEnd?.toISOString() || null,
    cancelAtPeriodEnd: latest?.cancelAtPeriodEnd || false,
    checkoutAvailable: billingReady(), testMode: process.env.STRIPE_SECRET_KEY?.startsWith('sk_test_') || process.env.STRIPE_SECRET_KEY?.startsWith('rk_test_') || false,
  };
}

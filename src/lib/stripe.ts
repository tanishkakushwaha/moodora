import 'server-only';
import { ApiError } from './api';
import { db } from './db';
import { hasPremium } from './membership';
import type { Prisma } from '@/generated/prisma/client';

export function billingReady() {
  return !!(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_PREMIUM_PRICE_ID && process.env.STRIPE_WEBHOOK_SECRET);
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

type StripeSubscription = {
  id: string; customer: string; status: string; cancel_at_period_end: boolean;
  items: { data: { price: { id: string }; current_period_end: number }[] };
};

// Retrieve current state after locking the account: duplicate and out-of-order
// events cannot restore an older state or grant access from an unrelated price.
export async function syncSubscription(subscriptionId: string, customerId: string) {
  const user = await db.user.findUnique({ where: { stripeCustomerId: customerId }, select: { id: true } });
  if (!user) return;
  await db.$transaction(async transaction => {
    await transaction.$queryRaw`SELECT "id" FROM "User" WHERE "id" = ${user.id} FOR UPDATE`;
    const subscription = await stripeRequest<StripeSubscription>(`subscriptions/${encodeURIComponent(subscriptionId)}`);
    if (subscription.customer !== customerId) throw new ApiError('Subscription customer mismatch.', 400);
    const matching = subscription.items.data.filter(item => item.price.id === process.env.STRIPE_PREMIUM_PRICE_ID);
    const ends = matching.map(item => item.current_period_end).filter(Number.isFinite);
    const values = { userId: user.id, status: subscription.status, qualifies: matching.length > 0,
      currentPeriodEnd: ends.length ? new Date(Math.max(...ends) * 1000) : null,
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
    };
    await transaction.subscription.upsert({ where: { id: subscription.id }, create: { id: subscription.id, ...values }, update: values });
  }, { timeout: 30000, maxWait: 10000 });
}

export async function membershipFor(userId: string, transaction: Pick<Prisma.TransactionClient, 'subscription'> = db) {
  const subscriptions = await transaction.subscription.findMany({ where: { userId }, orderBy: { updatedAt: 'desc' } });
  const active = subscriptions.find(subscription => hasPremium([subscription]));
  const latest = active || subscriptions[0];
  return { premium: !!active, status: latest?.status || 'free',
    currentPeriodEnd: latest?.currentPeriodEnd?.toISOString() || null,
    cancelAtPeriodEnd: latest?.cancelAtPeriodEnd || false,
    checkoutAvailable: billingReady(), testMode: process.env.STRIPE_SECRET_KEY?.startsWith('sk_test_') || process.env.STRIPE_SECRET_KEY?.startsWith('rk_test_') || false,
  };
}

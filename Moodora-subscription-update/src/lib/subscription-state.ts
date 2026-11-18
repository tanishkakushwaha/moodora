import { planForPrice, validPlanPrice } from './plans.ts';
export type StripeSubscriptionState = {
  id: string; customer: string; status: string; created: number; cancel_at_period_end: boolean;
  items: { data: { price: { id: string; currency: string; unit_amount: number | null; recurring?: { interval: string; interval_count: number } | null }; current_period_end: number }[] };
};

export function subscriptionValues(subscription: StripeSubscriptionState, env: Readonly<Record<string, string | undefined>> = process.env) {
  const item = subscription.items.data.find(value => {
    const plan = planForPrice(value.price.id, env);
    return plan === 'legacy' || (plan !== null && validPlanPrice(plan, { ...value.price, active: true, recurring: value.price.recurring || null }, env));
  });
  const validEnd = item && Number.isFinite(item.current_period_end) && item.current_period_end > 0;
  return { status: subscription.status, qualifies: !!item,
    stripePriceId: item?.price.id || null,
    planId: item ? planForPrice(item.price.id, env)! : 'unknown',
    billingInterval: item?.price.recurring?.interval || null,
    unitAmount: item?.price.unit_amount ?? null, currency: item?.price.currency || null,
    currentPeriodEnd: validEnd ? new Date(item.current_period_end * 1000) : null,
    cancelAtPeriodEnd: subscription.cancel_at_period_end,
  };
}

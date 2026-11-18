export type PlanId = 'monthly' | 'yearly';
type Environment = Readonly<Record<string, string | undefined>>;
export type PriceDetails = {
  id: string; active: boolean; currency: string; unit_amount: number | null;
  recurring: { interval: string; interval_count: number } | null;
};
export type PublicPlan = { id: PlanId; label: string; available: boolean; amount: string | null; unitAmount: number | null; currency: string | null; interval: 'month' | 'year' };
export type PlanCatalog = { monthly: PublicPlan; yearly: PublicPlan; testMode: boolean };

export function isPlan(value: unknown): value is PlanId { return value === 'monthly' || value === 'yearly'; }
export function priceIdFor(plan: PlanId, env: Environment = process.env) {
  return plan === 'monthly' ? env.STRIPE_MONTHLY_PRICE_ID || env.STRIPE_PREMIUM_PRICE_ID : env.STRIPE_YEARLY_PRICE_ID;
}
export function planForPrice(priceId: string, env: Environment = process.env): PlanId | 'legacy' | null {
  if (priceId && priceId === env.STRIPE_PREMIUM_PRICE_ID) return 'legacy';
  if (priceId && priceId === env.STRIPE_MONTHLY_PRICE_ID) return 'monthly';
  if (priceId && priceId === env.STRIPE_YEARLY_PRICE_ID) return 'yearly';
  return null;
}

export const blockingSubscriptionStatuses = ['active', 'trialing', 'past_due', 'unpaid', 'paused', 'incomplete'];
export function validPlanPrice(plan: PlanId, price: PriceDetails, env: Environment = process.env) {
  if (price.id !== priceIdFor(plan, env) || !price.active || price.unit_amount === null || price.unit_amount <= 0 || price.recurring?.interval_count !== 1) return false;
  if (price.recurring.interval !== (plan === 'monthly' ? 'month' : 'year')) return false;
  // Preserve existing checkout until the new INR monthly price is configured.
  if (plan === 'monthly' && !env.STRIPE_MONTHLY_PRICE_ID) return true;
  return price.currency === 'inr' && price.unit_amount === (plan === 'monthly' ? 19900 : 149900);
}
export function formatPrice(price: Pick<PriceDetails, 'currency' | 'unit_amount'>) {
  if (price.unit_amount === null) return null;
  const currency = price.currency.toUpperCase();
  const formatter = new Intl.NumberFormat('en-IN', { style: 'currency', currency });
  const minorDigits = ['ISK', 'UGX'].includes(currency) ? 2 : formatter.resolvedOptions().maximumFractionDigits ?? 2;
  return formatter.format(price.unit_amount / 10 ** minorDigits);
}

// Never accept arbitrary callback URLs or arbitrary Stripe Price IDs from a URL.
export function purchaseDestination(value: unknown) {
  return isPlan(value) ? `/checkout?plan=${value}` : '/dashboard';
}
export function safeAuthDestination(value: unknown) {
  return value === '/checkout?plan=monthly' || value === '/checkout?plan=yearly' ? value : '/dashboard';
}

export function annualSavings(catalog: PlanCatalog) {
  const { monthly, yearly } = catalog;
  if (!monthly.available || !yearly.available || !monthly.currency || monthly.currency !== yearly.currency || !monthly.unitAmount || !yearly.unitAmount) return null;
  const difference = monthly.unitAmount * 12 - yearly.unitAmount;
  if (difference <= 0) return null;
  return { amount: formatPrice({ currency: monthly.currency, unit_amount: difference }), percent: Math.round(difference / (monthly.unitAmount * 12) * 100) };
}

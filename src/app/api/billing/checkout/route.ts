import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { ANALYTICS_CHOICE, stripeAttribution } from '@/lib/trfyx';
import { apiError, ApiError, checkOrigin, requireUser, readJson } from '@/lib/api';
import { db } from '@/lib/db';
import { billingReady, stripeRequest, verifiedPlanPrice } from '@/lib/stripe';
import { rateLimit } from '@/lib/rate-limit';
import { z } from 'zod';
import { blockingSubscriptionStatuses } from '@/lib/plans';

type Session = { id: string; url: string | null; status: string; subscription: string | null; customer: string; success_url: string; line_items?: { data: { price: { id: string } }[] } };
const selectionSchema = z.object({ plan: z.enum(['monthly', 'yearly']).default('monthly') }).strict();
export async function POST(request: Request) {
  try {
    checkOrigin(request);
    const userId = await requireUser();
    const { plan } = selectionSchema.parse(await readJson(request));
    if (!billingReady()) throw new ApiError('Membership checkout is not available yet.', 503);
    if (!await rateLimit(`billing-checkout:${userId}`, 10, 60)) throw new ApiError('Please wait a moment before opening checkout again.', 429);
    const price = await verifiedPlanPrice(plan);
    const origin = request.headers.get('origin')!;
    const cookieStore = await cookies();
    const attribution = stripeAttribution(cookieStore.get('df_visitor_id')?.value, cookieStore.get(ANALYTICS_CHOICE)?.value);
    const checkout = await db.$transaction(async transaction => {
      await transaction.$queryRaw`SELECT "id" FROM "User" WHERE "id" = ${userId} FOR UPDATE`;
      const user = await transaction.user.findUniqueOrThrow({ where: { id: userId } });
      const existing = await transaction.subscription.findFirst({ where: { userId, status: { in: blockingSubscriptionStatuses } } });
      if (existing) throw new ApiError('You already have a membership. Use Manage membership to make changes.', 409);
      if (user.stripeCustomerId) {
        const remote = await stripeRequest<{ data: { status: string }[]; has_more: boolean }>(`subscriptions?customer=${encodeURIComponent(user.stripeCustomerId)}&status=all&limit=100`);
        if (remote.has_more || remote.data.some(subscription => blockingSubscriptionStatuses.includes(subscription.status))) {
          throw new ApiError('Your Stripe account already has a subscription. Open subscription settings to manage it.', 409);
        }
      }
      if (user.stripeCheckoutId) {
        const previous = await stripeRequest<Session>(`checkout/sessions/${encodeURIComponent(user.stripeCheckoutId)}?expand[]=line_items`);
        if (previous.customer !== user.stripeCustomerId) throw new ApiError('Checkout ownership could not be verified.', 403);
        if (previous.status === 'open') {
          if (previous.line_items?.data[0]?.price.id === price.id && previous.success_url?.startsWith(`${origin}/`) && previous.url) return { url: previous.url, sessionId: previous.id };
          await stripeRequest(`checkout/sessions/${encodeURIComponent(previous.id)}/expire`, {});
        }
        if (previous.status === 'complete') {
          // A paid session must be reconciled before another subscription can be created.
          const recorded = previous.subscription && await transaction.subscription.findUnique({ where: { id: previous.subscription } });
          if (!recorded) throw new ApiError('Your previous payment is still being confirmed. Please refresh shortly.', 409);
        }
      }
      let customer = user.stripeCustomerId;
      if (!customer) {
        const created = await stripeRequest<{ id: string }>('customers', { email: user.email, name: user.name, 'metadata[moodoraUserId]': userId }, `moodora-customer-${userId}`);
        customer = created.id;
        await transaction.user.update({ where: { id: userId }, data: { stripeCustomerId: customer } });
      }
      const session = await stripeRequest<Session>('checkout/sessions', {
        mode: 'subscription', customer,
        'line_items[0][price]': price.id, 'line_items[0][quantity]': '1',
        client_reference_id: userId, 'subscription_data[metadata][moodoraUserId]': userId,
        'subscription_data[metadata][moodoraPlan]': plan,
        ...attribution,
        success_url: `${origin}/checkout/success`, cancel_url: `${origin}/checkout/cancel?plan=${plan}`,
      }, `moodora-checkout-${userId}-${price.id}-${user.stripeCheckoutId || 'first'}`);
      if (!session.url) throw new ApiError('Checkout is unavailable. Please try again.', 502);
      await transaction.user.update({ where: { id: userId }, data: { stripeCheckoutId: session.id } });
      return { url: session.url, sessionId: session.id };
    }, { timeout: 45000, maxWait: 10000 });
    return NextResponse.json(checkout, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) { return apiError(error); }
}

import { NextResponse } from 'next/server';
import { apiError, ApiError, checkOrigin, requireUser } from '@/lib/api';
import { db } from '@/lib/db';
import { billingReady, stripeRequest } from '@/lib/stripe';

type Session = { id: string; url: string | null; status: string; subscription: string | null };
export async function POST(request: Request) {
  try {
    checkOrigin(request);
    const userId = await requireUser();
    if (!billingReady()) throw new ApiError('Membership checkout is not available yet.', 503);
    const origin = request.headers.get('origin')!;
    const url = await db.$transaction(async transaction => {
      await transaction.$queryRaw`SELECT "id" FROM "User" WHERE "id" = ${userId} FOR UPDATE`;
      const user = await transaction.user.findUniqueOrThrow({ where: { id: userId } });
      const existing = await transaction.subscription.findFirst({ where: { userId, status: { in: ['active', 'trialing', 'past_due', 'unpaid', 'paused', 'incomplete'] } } });
      if (existing) throw new ApiError('You already have a membership. Use Manage membership to make changes.', 409);
      if (user.stripeCheckoutId) {
        const previous = await stripeRequest<Session>(`checkout/sessions/${encodeURIComponent(user.stripeCheckoutId)}`);
        if (previous.status === 'open' && previous.url) return previous.url;
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
        'line_items[0][price]': process.env.STRIPE_PREMIUM_PRICE_ID!, 'line_items[0][quantity]': '1',
        client_reference_id: userId, 'subscription_data[metadata][moodoraUserId]': userId,
        success_url: `${origin}/membership?checkout=success`, cancel_url: `${origin}/membership?checkout=cancelled`,
      }, `moodora-checkout-${userId}-${user.stripeCheckoutId || 'first'}`);
      if (!session.url) throw new ApiError('Checkout is unavailable. Please try again.', 502);
      await transaction.user.update({ where: { id: userId }, data: { stripeCheckoutId: session.id } });
      return session.url;
    }, { timeout: 45000, maxWait: 10000 });
    return NextResponse.json({ url }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) { return apiError(error); }
}

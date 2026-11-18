import { NextResponse } from 'next/server';
import { validStripeSignature } from '@/lib/stripe-signature';
import { billingReady, syncSubscription } from '@/lib/stripe';
export const runtime = 'nodejs';

export async function POST(request: Request) {
  if (!billingReady()) return NextResponse.json({ error: 'Billing is not configured.' }, { status: 503 });
  const body = await request.text();
  if (!validStripeSignature(body, request.headers.get('stripe-signature'), process.env.STRIPE_WEBHOOK_SECRET!)) {
    return NextResponse.json({ error: 'Invalid signature.' }, { status: 400 });
  }
  try {
    const event = JSON.parse(body) as { type: string; data: { object: { id: string; customer?: string; subscription?: string } } };
    const object = event.data.object;
    if (['customer.subscription.created', 'customer.subscription.updated', 'customer.subscription.deleted'].includes(event.type) && object.customer) {
      await syncSubscription(object.id, object.customer);
    } else if (['checkout.session.completed', 'checkout.session.async_payment_succeeded'].includes(event.type) && object.subscription && object.customer) {
      await syncSubscription(object.subscription, object.customer);
    }
    return NextResponse.json({ received: true });
  } catch {
    // Return a failure so Stripe retries; do not acknowledge unsaved changes.
    console.error('Stripe webhook could not be processed.');
    return NextResponse.json({ error: 'Unable to process event.' }, { status: 500 });
  }
}

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
    const event = JSON.parse(body) as { id: string; type: string; data: { object: { id: string; customer?: string; subscription?: string; parent?: { subscription_details?: { subscription?: string } } } } };
    if (typeof event.id !== 'string' || !event.id.startsWith('evt_')) return NextResponse.json({ error: 'Invalid event.' }, { status: 400 });
    const object = event.data.object;
    const receipt = { id: event.id, type: event.type };
    if (['customer.subscription.created', 'customer.subscription.updated', 'customer.subscription.deleted', 'customer.subscription.paused', 'customer.subscription.resumed'].includes(event.type) && object.customer) {
      await syncSubscription(object.id, object.customer, receipt);
    } else if (['checkout.session.completed', 'checkout.session.async_payment_succeeded'].includes(event.type) && object.subscription && object.customer) {
      await syncSubscription(object.subscription, object.customer, receipt);
    } else if (['invoice.paid', 'invoice.payment_failed', 'invoice.payment_action_required'].includes(event.type) && object.customer) {
      const subscriptionId = object.parent?.subscription_details?.subscription || object.subscription;
      if (subscriptionId) await syncSubscription(subscriptionId, object.customer, receipt);
    }
    return NextResponse.json({ received: true });
  } catch {
    // Return a failure so Stripe retries; do not acknowledge unsaved changes.
    console.error('Stripe webhook could not be processed.');
    return NextResponse.json({ error: 'Unable to process event.' }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { apiError, ApiError, checkOrigin, requireUser } from '@/lib/api';
import { db } from '@/lib/db';
import { stripeRequest } from '@/lib/stripe';
import { rateLimit } from '@/lib/rate-limit';

export async function POST(request: Request) {
  try {
    checkOrigin(request);
    const userId = await requireUser();
    if (!await rateLimit(`billing-portal:${userId}`, 10, 60)) throw new ApiError('Please wait a moment before opening billing again.', 429);
    const user = await db.user.findUniqueOrThrow({ where: { id: userId }, select: { stripeCustomerId: true } });
    if (!user.stripeCustomerId) throw new ApiError('You do not have a billing account yet.', 404);
    const session = await stripeRequest<{ url: string }>('billing_portal/sessions', {
      customer: user.stripeCustomerId, return_url: `${request.headers.get('origin')}/settings/subscription`,
      ...(process.env.STRIPE_PORTAL_CONFIGURATION_ID ? { configuration: process.env.STRIPE_PORTAL_CONFIGURATION_ID } : {}),
    });
    return NextResponse.json({ url: session.url }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) { return apiError(error); }
}

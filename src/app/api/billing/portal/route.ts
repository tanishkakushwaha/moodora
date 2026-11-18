import { NextResponse } from 'next/server';
import { apiError, ApiError, checkOrigin, requireUser } from '@/lib/api';
import { db } from '@/lib/db';
import { stripeRequest } from '@/lib/stripe';

export async function POST(request: Request) {
  try {
    checkOrigin(request);
    const userId = await requireUser();
    const user = await db.user.findUniqueOrThrow({ where: { id: userId }, select: { stripeCustomerId: true } });
    if (!user.stripeCustomerId) throw new ApiError('You do not have a billing account yet.', 404);
    const session = await stripeRequest<{ url: string }>('billing_portal/sessions', {
      customer: user.stripeCustomerId, return_url: `${request.headers.get('origin')}/membership`,
    });
    return NextResponse.json({ url: session.url }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) { return apiError(error); }
}

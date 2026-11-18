import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { apiError, requireUser } from '@/lib/api';
import { membershipFor } from '@/lib/stripe';
export async function GET() {
    try {
        const userId = await requireUser();
        const [user, moods, entries, favorites, membership] = await Promise.all([db.user.findUniqueOrThrow({ where: { id: userId }, select: { id: true, name: true, email: true, image: true, theme: true, createdAt: true, passwordHash: true, reminderEnabled: true, reminderTime: true, reminderTimezone: true, stripeCustomerId: true } }), db.mood.findMany({ where: { userId }, orderBy: { date: 'desc' } }), db.diaryEntry.findMany({ where: { userId }, orderBy: [{ date: 'desc' }, { createdAt: 'desc' }] }), db.favoriteQuote.findMany({ where: { userId }, select: { quoteId: true } }), membershipFor(userId)]);
        const { passwordHash, stripeCustomerId, ...profile } = user;
        return NextResponse.json({ user: { ...profile, hasPassword: !!passwordHash }, membership: { ...membership, canManage: !!stripeCustomerId }, moods, entries, favorites: favorites.map(f => f.quoteId) }, { headers: { 'Cache-Control': 'private, no-store' } });
    }
    catch (e) {
        return apiError(e);
    }
}

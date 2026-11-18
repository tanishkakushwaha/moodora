import { NextResponse } from 'next/server';
import { apiError, ApiError, requireUser } from '@/lib/api';
import { db } from '@/lib/db';
import { membershipFor } from '@/lib/stripe';
import { dateSchema } from '@/lib/validation';
import { dateBefore, weeklyReport } from '@/lib/weekly-report';

export async function GET(request: Request) {
  try {
    const userId = await requireUser();
    if (!(await membershipFor(userId)).premium) throw new ApiError('Weekly reports are included with Moodora Premium.', 403);
    const end = dateSchema.parse(new URL(request.url).searchParams.get('end') || new Date().toISOString().slice(0, 10));
    if (end < '1900-01-14') throw new ApiError('Choose a date from 1900 onwards.');
    // A local date can be one day ahead of UTC.
    if (end > new Date(Date.now() + 86400000).toISOString().slice(0, 10)) throw new ApiError('Choose today or an earlier date.');
    const records = await db.mood.findMany({ where: { userId, date: { gte: dateBefore(end, 13), lte: end } }, select: { date: true, mood: true } });
    return NextResponse.json(weeklyReport(records, end), { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) { return apiError(error); }
}

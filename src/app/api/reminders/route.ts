import { NextResponse } from 'next/server';
import { z } from 'zod';
import { apiError, checkOrigin, readJson, requireUser } from '@/lib/api';
import { db } from '@/lib/db';

const schema = z.object({ enabled: z.boolean(), time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  timezone: z.string().max(100).refine(value => { try { new Intl.DateTimeFormat('en', { timeZone: value }); return true; } catch { return false; } }, 'Choose a valid time zone.'),
});
export async function PUT(request: Request) {
  try {
    checkOrigin(request);
    const userId = await requireUser();
    const settings = schema.parse(await readJson(request));
    await db.user.update({ where: { id: userId }, data: { reminderEnabled: settings.enabled, reminderTime: settings.time, reminderTimezone: settings.timezone } });
    return NextResponse.json({ ok: true });
  } catch (error) { return apiError(error); }
}

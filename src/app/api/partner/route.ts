import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import type { Prisma } from '@/generated/prisma/client';
import { ApiError, apiError, checkOrigin, readJson, requireUser } from '@/lib/api';
import { rateLimit } from '@/lib/rate-limit';
import { hashInvite, lockOrder, newInvite, partnerActionSchema } from '@/lib/couple-invites';
export const dynamic = 'force-dynamic';
const noStore = { 'Cache-Control': 'private, no-store' };
async function lockUsers(tx: Prisma.TransactionClient, ids: string[]) {
  for (const id of lockOrder(ids)) await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${id}))`;
}
export async function GET() {
 try {
  const userId = await requireUser();
  const result = await db.$transaction(async tx => {
   const membership = await tx.coupleMember.findUnique({ where: { userId }, include: { couple: { include: { members: { include: { user: { select: { id: true, name: true, image: true } } } } } } } });
   if (!membership) {
    const invite = await tx.coupleInvite.findUnique({ where: { ownerId: userId }, select: { expiresAt: true } });
    return { connected: false, inviteExpiresAt: invite && invite.expiresAt > new Date() ? invite.expiresAt : null };
   }
   const partner = membership.couple.members.find(member => member.userId !== userId)?.user || null;
   const scope = { sharedCoupleId: membership.coupleId };
   const [partnerMoods, partnerEntries, myMoods, myEntries] = await Promise.all([
    partner ? tx.mood.findMany({ where: { ...scope, userId: partner.id }, orderBy: { date: 'desc' }, select: { id: true, date: true, mood: true, note: true } }) : [],
    partner ? tx.diaryEntry.findMany({ where: { ...scope, userId: partner.id }, orderBy: [{ date: 'desc' }, { createdAt: 'desc' }], select: { id: true, date: true, mood: true, title: true, content: true, tags: true } }) : [],
    tx.mood.findMany({ where: { ...scope, userId }, select: { id: true } }),
    tx.diaryEntry.findMany({ where: { ...scope, userId }, select: { id: true } }),
   ]);
   return { connected: true, partner, partnerMoods, partnerEntries, sharedByMe: { moodIds: myMoods.map(row => row.id), diaryIds: myEntries.map(row => row.id) } };
  });
  return NextResponse.json(result, { headers: noStore });
 } catch (error) { return apiError(error); }
}
export async function POST(request: Request) {
 try {
  checkOrigin(request);
  const userId = await requireUser();
  const action = partnerActionSchema.parse(await readJson(request));
  if (!await rateLimit(`couple:${userId}`, 60, 900)) throw new ApiError('Please wait before trying again.', 429);
  if (action.action === 'invite') {
   const invite = newInvite();
   await db.$transaction(async tx => {
    await lockUsers(tx, [userId]);
    if (await tx.coupleMember.findUnique({ where: { userId } })) throw new ApiError('You already have a connected partner.', 409);
    await tx.coupleInvite.upsert({ where: { ownerId: userId }, create: { ownerId: userId, tokenHash: invite.tokenHash, expiresAt: invite.expiresAt }, update: { tokenHash: invite.tokenHash, expiresAt: invite.expiresAt } });
   });
   return NextResponse.json({ code: invite.code, expiresAt: invite.expiresAt }, { headers: noStore });
  }
  if (action.action === 'cancel-invite') {
   await db.$transaction(async tx => { await lockUsers(tx, [userId]); await tx.coupleInvite.deleteMany({ where: { ownerId: userId } }); });
   return NextResponse.json({ ok: true }, { headers: noStore });
  }
  if (action.action === 'accept') {
   const tokenHash = hashInvite(action.code);
   const initial = await db.coupleInvite.findUnique({ where: { tokenHash }, select: { ownerId: true } });
   if (!initial || initial.ownerId === userId) throw new ApiError('This invitation is invalid, expired, or belongs to you.', 400);
   await db.$transaction(async tx => {
    await lockUsers(tx, [userId, initial.ownerId]);
    const invite = await tx.coupleInvite.findUnique({ where: { tokenHash } });
    if (!invite || invite.expiresAt <= new Date()) throw new ApiError('This invitation has expired or was replaced.', 400);
    if (await tx.coupleMember.count({ where: { userId: { in: [userId, initial.ownerId] } } })) throw new ApiError('One of you is already connected. Disconnect before making a new connection.', 409);
    const couple = await tx.couple.create({ data: {} });
    await tx.coupleMember.createMany({ data: [{ userId, coupleId: couple.id }, { userId: initial.ownerId, coupleId: couple.id }] });
    await tx.coupleInvite.deleteMany({ where: { ownerId: { in: [userId, initial.ownerId] } } });
   });
   return NextResponse.json({ ok: true }, { headers: noStore });
  }
  if (action.action === 'disconnect') {
   const member = await db.coupleMember.findUnique({ where: { userId }, include: { couple: { include: { members: true } } } });
   if (!member) return NextResponse.json({ ok: true }, { headers: noStore });
   await db.$transaction(async tx => {
    await lockUsers(tx, member.couple.members.map(row => row.userId));
    const current = await tx.coupleMember.findUnique({ where: { userId } });
    if (current?.coupleId !== member.coupleId) throw new ApiError('Your connection changed. Refresh and try again.', 409);
    // SET NULL on the sharing foreign keys removes access without deleting personal records.
    await tx.couple.delete({ where: { id: member.coupleId } });
   });
   return NextResponse.json({ ok: true }, { headers: noStore });
  }
  await db.$transaction(async tx => {
   await lockUsers(tx, [userId]);
   const membership = await tx.coupleMember.findUnique({ where: { userId } });
   if (action.shared && !membership) throw new ApiError('Connect with your partner first.', 409);
   const data = { sharedCoupleId: action.shared ? membership!.coupleId : null };
   const where = { id: action.id, userId };
   const result = action.kind === 'diary' ? await tx.diaryEntry.updateMany({ where, data }) : await tx.mood.updateMany({ where, data });
   if (!result.count) throw new ApiError('This record was not found in your account.', 404);
  });
  return NextResponse.json({ ok: true }, { headers: noStore });
 } catch (error) { return apiError(error); }
}

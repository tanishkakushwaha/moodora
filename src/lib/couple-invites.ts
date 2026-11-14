import { createHash, randomBytes } from 'node:crypto';
import { z } from 'zod';
export const inviteCodeSchema = z.string().trim().regex(/^[A-Za-z0-9_-]{32}$/, 'Paste the complete 32-character invitation code.');
export function hashInvite(code: string) { return createHash('sha256').update(code).digest('hex'); }
export function newInvite(now = new Date()) {
  const code = randomBytes(24).toString('base64url');
  return { code, tokenHash: hashInvite(code), expiresAt: new Date(now.getTime() + 24 * 60 * 60 * 1000) };
}
export function lockOrder(ids: string[]) { return [...new Set(ids)].sort(); }
export const partnerActionSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('invite') }),
  z.object({ action: z.literal('cancel-invite') }),
  z.object({ action: z.literal('accept'), code: inviteCodeSchema }),
  z.object({ action: z.literal('disconnect') }),
  z.object({ action: z.literal('share'), kind: z.enum(['mood', 'diary']), id: z.string().min(1).max(64), shared: z.boolean() }),
]);

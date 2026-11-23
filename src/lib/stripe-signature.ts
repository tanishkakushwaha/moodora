import { createHmac, timingSafeEqual } from 'node:crypto';

export function validStripeSignature(body: string, signature: string | null, secret: string, now = Date.now()) {
  if (!signature || !secret) return false;
  const fields = signature.split(',').map(field => field.trim().split('='));
  const timestamp = fields.find(([key]) => key === 't')?.[1];
  if (!timestamp || !/^\d+$/.test(timestamp) || Math.abs(now / 1000 - Number(timestamp)) > 300) return false;
  const expected = createHmac('sha256', secret).update(`${timestamp}.${body}`).digest();
  return fields.filter(([key]) => key === 'v1').some(([, value]) => {
    if (!value || !/^[a-f0-9]{64}$/i.test(value)) return false;
    return timingSafeEqual(expected, Buffer.from(value, 'hex'));
  });
}

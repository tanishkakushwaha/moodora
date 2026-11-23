// Offline reproduction only. No requests, payments, database writes or secrets.
process.env.NEXT_PUBLIC_TESTING_TRFYX_WEBSITE_ID = 'offline_testing_fixture';
process.env.NEXT_PUBLIC_TESTING_TRFYX_DOMAIN = 'testing.trfyx.com';
const { trackCheckoutStarted } = await import('../src/lib/trfyx.ts');
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const helperFile = new URL('../src/lib/trfyx.ts', import.meta.url);
console.log('DELIVERY CHECK — VERSION 2');
console.log(`Run time: ${new Date().toISOString()}`);
console.log(`Helper file: ${fileURLToPath(helperFile)}`);
console.log(`Helper fingerprint: ${createHash('sha256').update(readFileSync(helperFile)).digest('hex').slice(0, 16)}`);

const values = new Map<string, string>();
let attempts = 0;
let accepted = 0;
const sessionId = 'cs_offline_delivery_test';
const marker = `moodora:checkout-started:${sessionId}`;
const previousWindow = Object.getOwnPropertyDescriptor(globalThis, 'window');
const previousDocument = Object.getOwnPropertyDescriptor(globalThis, 'document');

try {
  Object.defineProperty(globalThis, 'document', {
    configurable: true,
    value: { cookie: 'moodora_analytics_consent=granted' },
  });
  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    value: {
      location: { hostname: 'testing.trfyx.com' },
      localStorage: {
        getItem: (key: string) => values.get(key) ?? null,
        setItem: (key: string, value: string) => { values.set(key, value); },
        removeItem: (key: string) => { values.delete(key); },
      },
      trfyx: (...args: unknown[]) => {
        attempts++;
        // First delivery fails. If a retry happens, it is accepted.
        const status = attempts === 1 ? 500 : 202;
        if (status === 202) accepted++;
        (args[2] as (result: { status: number }) => void)({ status });
      },
    },
  });

  console.log('OFFLINE TEST: failed checkout tracking, followed by a retry.');
  await trackCheckoutStarted(sessionId, 'monthly');
  const markedSentAfterFailure = values.has(marker);
  await trackCheckoutStarted(sessionId, 'monthly');

  console.log(`Expected tracking attempts: 2 | Actual: ${attempts}`);
  console.log(`Expected accepted events: 1 | Actual: ${accepted}`);
  console.log(`Expected sent marker after failure: false | Actual: ${markedSentAfterFailure}`);
  const passed = attempts === 2 && accepted === 1 && !markedSentAfterFailure;
  console.log(passed ? 'PASS: failed delivery can retry.' : 'FAIL: BUG REPRODUCED — failed delivery was marked sent, so retry was skipped.');
  console.log('No live tracking, payment or production data was used.');
  if (!passed) process.exitCode = 1;
} finally {
  if (previousWindow) Object.defineProperty(globalThis, 'window', previousWindow);
  else Reflect.deleteProperty(globalThis, 'window');
  if (previousDocument) Object.defineProperty(globalThis, 'document', previousDocument);
  else Reflect.deleteProperty(globalThis, 'document');
}

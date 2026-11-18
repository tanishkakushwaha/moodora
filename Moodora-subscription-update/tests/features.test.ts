import test from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { hasPremium } from '../src/lib/membership.ts';
import { weeklyReport } from '../src/lib/weekly-report.ts';
import { reminderDue, zonedClock } from '../src/lib/reminders.ts';
import { validStripeSignature } from '../src/lib/stripe-signature.ts';

test('premium requires an allowed price, active status, and a future paid-through date', () => {
  const now = new Date('2026-11-18T12:00:00Z');
  const record = { qualifies: true, status: 'active', currentPeriodEnd: '2026-12-18T12:00:00Z' };
  assert.equal(hasPremium([record], now), true);
  assert.equal(hasPremium([{ ...record, status: 'trialing' }], now), true);
  for (const status of ['past_due', 'unpaid', 'incomplete', 'canceled', 'paused']) assert.equal(hasPremium([{ ...record, status }], now), false);
  assert.equal(hasPremium([{ ...record, qualifies: false }], now), false);
  assert.equal(hasPremium([{ ...record, currentPeriodEnd: null }], now), false);
  assert.equal(hasPremium([{ ...record, currentPeriodEnd: now }], now), false);
  assert.equal(hasPremium([{ ...record, currentPeriodEnd: 'invalid' }], now), false);
  assert.equal(hasPremium([], now), false);
});

test('weekly reports handle month boundaries, missing days, duplicate dates, and tied moods', () => {
  const report = weeklyReport([
    { date: '2026-10-24', mood: 'happy' }, // outside both weeks
    { date: '2026-10-28', mood: 'calm' }, // previous week
    { date: '2026-11-02', mood: 'sad' },
    { date: '2026-11-02', mood: 'happy' },
    { date: '2026-11-03', mood: 'calm' },
    { date: '2026-11-04', mood: 'unknown' },
    { date: '2026-11-06', mood: 'happy' },
    { date: '2026-11-07', mood: 'calm' },
    { date: '2026-11-08', mood: 'angry' }, // after selected week
  ], '2026-11-07');
  assert.equal(report.start, '2026-11-01');
  assert.equal(report.checkIns, 4);
  assert.equal(report.previousCheckIns, 1);
  assert.equal(report.change, 3);
  assert.deepEqual(report.mostFrequent.map(mood => mood.id), ['happy', 'calm']);
  assert.equal(report.days.length, 7);
  assert.equal(report.days[0].mood, null);
  assert.equal(report.days[3].mood, null);
  assert.equal(report.days[6].mood?.id, 'calm');
});

test('empty report shows no invented moods or emotional trend', () => {
  const report = weeklyReport([], '2026-03-02');
  assert.equal(report.start, '2026-02-24');
  assert.equal(report.checkIns, 0);
  assert.deepEqual(report.distribution, []);
  assert.deepEqual(report.mostFrequent, []);
  assert.ok(report.days.every(day => day.mood === null));
});

test('reminders honor local time, opt-out, completed moods, and a daily dismissal', () => {
  const now = new Date('2026-11-18T15:00:00Z'); // 20:30 Kolkata
  const settings = { enabled: true, time: '20:00', timezone: 'Asia/Kolkata', completedDates: [] as string[], now };
  assert.equal(reminderDue(settings), true);
  assert.equal(reminderDue({ ...settings, time: '21:00' }), false);
  assert.equal(reminderDue({ ...settings, enabled: false }), false);
  assert.equal(reminderDue({ ...settings, completedDates: ['2026-11-18'] }), false);
  assert.equal(reminderDue({ ...settings, dismissedDate: '2026-11-18' }), false);
  assert.equal(reminderDue({ ...settings, dismissedDate: '2026-11-17' }), true);
  assert.deepEqual(zonedClock(new Date('2026-11-18T23:00:00Z'), 'Asia/Kolkata'), { date: '2026-11-19', time: '04:30' });
  assert.deepEqual(zonedClock(new Date('2026-11-18T01:00:00Z'), 'America/Los_Angeles'), { date: '2026-11-17', time: '17:00' });
});

test('webhook signatures reject tampering, stale events, future events, and wrong secrets', () => {
  const body = '{"type":"customer.subscription.updated"}';
  const timestamp = 1795000000;
  const secret = 'whsec_test_fixture_only';
  const signature = createHmac('sha256', secret).update(`${timestamp}.${body}`).digest('hex');
  const header = `t=${timestamp},v1=${signature}`;
  assert.equal(validStripeSignature(body, header, secret, timestamp * 1000), true);
  assert.equal(validStripeSignature(body + ' ', header, secret, timestamp * 1000), false);
  assert.equal(validStripeSignature(body, header, 'wrong', timestamp * 1000), false);
  assert.equal(validStripeSignature(body, header, secret, (timestamp + 301) * 1000), false);
  assert.equal(validStripeSignature(body, header, secret, (timestamp - 301) * 1000), false);
  assert.equal(validStripeSignature(body, `t=${timestamp},v1=bad`, secret, timestamp * 1000), false);
  assert.equal(validStripeSignature(body, `t=nope,v1=${signature}`, secret, timestamp * 1000), false);
  assert.equal(validStripeSignature(body, `t=${timestamp},v1=${'0'.repeat(64)},v1=${signature}`, secret, timestamp * 1000), true);
  assert.equal(validStripeSignature(body, null, secret), false);
});

// Real local HTTP/database integration checks. Temporary users are deleted in
// finally; no shared demo account or journal content is left behind.
import assert from 'node:assert/strict';
import { checkCouples } from './lib/couple-smoke.mjs';
import { randomBytes, randomUUID } from 'node:crypto';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { config } from 'dotenv';
import pg from 'pg';
import { assertLoginRedirect } from './lib/redirect.mjs';
import { localEndpoint, describeFetchError } from './lib/local-server.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
config({ path: resolve(root, '.env'), quiet: true });
const origin = process.env.BLOOM_SMOKE_ORIGIN || 'http://localhost:3000';
const endpoint = localEndpoint(origin);
const interruption = new AbortController();
const interrupt = () => interruption.abort(new Error('Integration checks interrupted'));
process.on('SIGINT', interrupt);
process.on('SIGTERM', interrupt);
const suffix = randomUUID();
const emails = [`bloom-smoke-a-${suffix}@example.invalid`, `bloom-smoke-b-${suffix}@example.invalid`];
const password = randomBytes(24).toString('hex');
const nextPassword = randomBytes(24).toString('hex');
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 1, connectionTimeoutMillis: 5000 });

function client() {
  const cookies = new Map();
  return async (path, { method = 'GET', json, form, requestOrigin = origin } = {}) => {
    const headers = new Headers({ Origin: requestOrigin, ...(method !== 'GET' ? { 'Content-Type': 'application/json' } : {}) });
    if (cookies.size) headers.set('Cookie', [...cookies].map(([key, value]) => `${key}=${value}`).join('; '));
    let body;
    if (json !== undefined) {
      headers.set('Content-Type', 'application/json');
      body = JSON.stringify(json);
    } else if (form) {
      headers.set('Content-Type', 'application/x-www-form-urlencoded');
      headers.set('X-Auth-Return-Redirect', '1');
      body = new URLSearchParams(form);
    }
    let response;
    try {
      response = await fetch(endpoint + path, { method, headers, body, redirect: 'manual', signal: AbortSignal.any([interruption.signal, AbortSignal.timeout(15000)]) });
    } catch (error) {
      throw new Error(describeFetchError(error, method, endpoint + path), { cause: error });
    }
    for (const line of response.headers.getSetCookie()) {
      const pair = line.split(';', 1)[0];
      const equals = pair.indexOf('=');
      const key = pair.slice(0, equals);
      const value = pair.slice(equals + 1);
      if (!value || /max-age=0/i.test(line)) cookies.delete(key);
      else cookies.set(key, value);
    }
    const type = response.headers.get('content-type') || '';
    const data = type.includes('application/json') ? await response.json() : await response.text();
    return { status: response.status, headers: response.headers, data };
  };
}

async function login(agent, email, suppliedPassword, expected = true) {
  const csrf = await agent('/api/auth/csrf');
  assert.equal(csrf.status, 200, 'CSRF endpoint must respond');
  assert.ok(csrf.data.csrfToken, 'Auth.js must issue a CSRF token');
  const response = await agent('/api/auth/callback/credentials', {
    method: 'POST', form: { csrfToken: csrf.data.csrfToken, email, password: suppliedPassword, callbackUrl: `${origin}/dashboard` },
  });
  assert.equal(response.status, 200, 'Auth.js must respond with a redirect result');
  const error = new URL(response.data.url).searchParams.get('error');
  assert.equal(!error, expected, expected ? 'Valid credentials must sign in' : 'Old credentials must be rejected');
  if (expected) {
    const session = await agent('/api/auth/session');
    assert.equal(session.data.user?.email, email, 'Session must belong to this account');
  }
}

const a = client();
const b = client();
const anonymous = client();
let passed = false;
let attemptedSignup = false;
try {
  const health = await anonymous('/api/health');
  assert.equal(health.status, 200, 'The database must be healthy');
  assert.equal(health.data.app, 'bloom-mood-diary', 'This port must belong to Moodora');
  assert.equal((await anonymous('/api/data')).status, 401, 'Private records require authentication');
  const dashboard = await anonymous('/dashboard');
  assertLoginRedirect(dashboard, origin);

  for (const [index, agent] of [a, b].entries()) {
    attemptedSignup = true;
    const signup = await agent('/api/register', { method: 'POST', json: { name: `Moodora smoke ${index}`, email: emails[index], password } });
    assert.equal(signup.status, 201, 'Account signup must succeed');
    await login(agent, emails[index], password);
  }
  console.log('✓ Signup, credentials login, sessions, and protected routes');

  const today = new Date().toISOString().slice(0, 10);
  const entry = { title: 'Temporary integration check', content: `Private QA content ${suffix}`, date: today, mood: 'calm', tags: ['smoke-check'] };
  const created = await a('/api/diary', { method: 'POST', json: entry });
  assert.equal(created.status, 201, 'Diary creation must succeed');
  const id = created.data.id;
  assert.ok(id, 'Created entries need an ID');
  let data = await a('/api/data');
  assert.equal(data.data.entries[0]?.id, id, 'Diary must be persisted');
  assert.equal(data.data.entries[0]?.content, entry.content, 'Private content must round-trip');
  assert.ok(data.headers.get('cache-control')?.includes('no-store'), 'Private responses must not be cached');
  assert.equal('passwordHash' in data.data.user, false, 'Password hashes must never reach the client');

  const second = await b('/api/data');
  assert.equal(second.data.entries.length, 0, 'A second account must not see another diary');
  assert.equal((await b(`/api/diary/${id}`, { method: 'PUT', json: { ...entry, title: 'Unauthorized edit' } })).status, 404, 'Another account cannot edit a diary');
  assert.equal((await b(`/api/diary/${id}`, { method: 'DELETE' })).status, 404, 'Another account cannot delete a diary');
  assert.equal((await a(`/api/diary/${id}`, { method: 'PUT', json: { ...entry, title: 'Updated temporary entry' } })).status, 200, 'Owner can edit a diary');
  data = await a('/api/data');
  assert.equal(data.data.entries[0]?.title, 'Updated temporary entry', 'Edited title must persist');
  console.log('✓ Diary creation, reading, editing, and account isolation');

  assert.equal((await a('/api/moods', { method: 'POST', json: { date: today, mood: 'calm', note: 'Temporary check-in' } })).status, 200);
  assert.equal((await a('/api/moods', { method: 'POST', json: { date: today, mood: 'happy', note: 'Updated temporary check-in' } })).status, 200);
  data = await a('/api/data');
  assert.equal(data.data.moods.length, 1, 'Updating a daily mood must not create duplicates');
  assert.equal(data.data.moods[0].mood, 'happy', 'Mood update must persist');
  assert.equal((await b('/api/data')).data.moods.length, 0, 'Moods stay private');
  assert.equal((await a('/api/moods', { method: 'POST', json: { date: '2026-02-31', mood: 'happy' } })).status, 400, 'Impossible dates must be rejected');
  assert.equal((await a('/api/moods', { method: 'POST', requestOrigin: 'https://untrusted.example', json: { date: today, mood: 'sad' } })).status, 403, 'Cross-origin writes must be rejected');
  console.log('✓ Daily mood upsert, privacy, validation, and origin protection');
  await checkCouples({ a, b, anonymous, pool, entryId: id, moodId: data.data.moods[0].id, emails });

  for (let i = 0; i < 2; i++) assert.equal((await a('/api/favorites', { method: 'POST', json: { quoteId: 'q1', saved: true } })).status, 200);
  data = await a('/api/data');
  assert.deepEqual(data.data.favorites, ['q1'], 'Saving a quote twice must not duplicate it');
  assert.equal((await b('/api/data')).data.favorites.length, 0, 'Favorites stay private');
  assert.equal((await a('/api/favorites', { method: 'POST', json: { quoteId: 'q1', saved: false } })).status, 200);
  assert.equal((await a('/api/profile', { method: 'PUT', json: { name: 'Updated smoke profile', image: '', theme: 'dark' } })).status, 200);
  data = await a('/api/data');
  assert.equal(data.data.user.name, 'Updated smoke profile');
  assert.equal(data.data.user.theme, 'dark');
  assert.equal(data.data.favorites.length, 0);
  console.log('✓ Saved quotes and profile/theme persistence');

  assert.equal((await a('/api/moods', { method: 'DELETE', json: { date: today } })).status, 200);
  assert.equal((await a(`/api/diary/${id}`, { method: 'DELETE' })).status, 200);
  data = await a('/api/data');
  assert.equal(data.data.entries.length, 0);
  assert.equal(data.data.moods.length, 0);

  assert.equal((await a('/api/password', { method: 'PUT', json: { currentPassword: password, newPassword: nextPassword } })).status, 200);
  assert.equal((await a('/api/data')).status, 401, 'Password updates must revoke prior sessions');
  await login(a, emails[0], password, false);
  await login(a, emails[0], nextPassword);
  const csrf = await a('/api/auth/csrf');
  await a('/api/auth/signout', { method: 'POST', form: { csrfToken: csrf.data.csrfToken, callbackUrl: origin } });
  assert.equal((await a('/api/data')).status, 401, 'Logout must revoke the current session');
  console.log('✓ Deletion, password changes, session invalidation, and logout');
  passed = true;
} catch (error) {
  console.error(`Integration check failed: ${error.message}`);
  process.exitCode = 1;
} finally {
  try {
    if (!attemptedSignup) {
      console.log('No temporary test accounts were created.');
    } else {
    const rows = await pool.query('SELECT id FROM "User" WHERE email = ANY($1::text[])', [emails]);
    const keys = [...emails.flatMap(email => [`signup:${email}`, `login:${email}`]), ...rows.rows.flatMap(user => [`password:${user.id}`, `couple:${user.id}`])];
    await pool.query('DELETE FROM "Couple" WHERE id IN (SELECT "coupleId" FROM "CoupleMember" WHERE "userId" = ANY($1::text[]))', [rows.rows.map(user => user.id)]);
    await pool.query('DELETE FROM "User" WHERE email = ANY($1::text[])', [emails]);
    await pool.query('DELETE FROM "RateLimit" WHERE key = ANY($1::text[])', [keys]);
    console.log('Temporary test accounts and records removed.');
    }
  } catch (error) {
    console.error(`Temporary account cleanup could not finish: ${error.message}`);
    passed = false;
    process.exitCode = 1;
  }
  await pool.end();
  process.off('SIGINT', interrupt);
  process.off('SIGTERM', interrupt);
}
if (passed) console.log('\nAll live integration checks passed. Your own account data was not modified.\n');

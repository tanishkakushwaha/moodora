import test from 'node:test';
import assert from 'node:assert/strict';
import { testingEnvironment, testingEnvironmentErrors, applyTestingEnvironment } from '../scripts/lib/testing-environment.mjs';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const fixture = {
  TESTING_DATABASE_URL: 'postgresql://testing_user:testing_fixture@localhost:55440/moodora_testing',
  TESTING_AUTH_SECRET: 'isolated-offline-testing-secret-at-least-32-characters',
  TESTING_AUTH_URL: 'http://localhost:3100',
};

test('testing cannot fall back to inherited production variables', () => {
  assert.throws(() => testingEnvironment({ DATABASE_URL: 'postgresql://live:private@live.invalid/live', AUTH_SECRET: 'live-secret' }), /Testing configuration blocked/);
  const isolated = testingEnvironment({ ...fixture, DATABASE_URL: 'postgresql://live:private@live.invalid/live', AUTH_SECRET: 'live-secret', STRIPE_SECRET_KEY: 'sk_live_fixture', DIRECT_DATABASE_URL: 'live', DATABASE_URL_UNPOOLED: 'live' });
  assert.equal(isolated.DATABASE_URL, fixture.TESTING_DATABASE_URL);
  assert.equal(isolated.AUTH_SECRET, fixture.TESTING_AUTH_SECRET);
  assert.equal(isolated.STRIPE_SECRET_KEY, undefined);
  assert.equal(isolated.DIRECT_DATABASE_URL, undefined);
  assert.equal(isolated.DATABASE_URL_UNPOOLED, undefined);
});

test('database guard requires the named separate test database for runtime and migrations', () => {
  for (const db of ['production', 'bloom', 'neondb', 'moodora']) assert.throws(() => testingEnvironment({ ...fixture, TESTING_DATABASE_URL: `postgresql://u:p@host.invalid/${db}` }));
  assert.throws(() => testingEnvironment({ ...fixture, TESTING_DIRECT_DATABASE_URL: 'postgresql://u:p@host.invalid/live' }));
  assert.deepEqual(testingEnvironmentErrors(fixture), []);
});

test('testing rejects live Stripe keys and partial billing configuration', () => {
  const billing = { ...fixture, TESTING_STRIPE_WEBHOOK_SECRET: 'whsec_testing_fixture', TESTING_STRIPE_MONTHLY_PRICE_ID: 'price_testing_fixture' };
  assert.throws(() => testingEnvironment({ ...billing, TESTING_STRIPE_SECRET_KEY: 'sk_live_fixture' }), /sandbox/);
  assert.throws(() => testingEnvironment({ ...fixture, TESTING_STRIPE_SECRET_KEY: 'sk_test_fixture' }));
  assert.equal(testingEnvironment({ ...billing, TESTING_STRIPE_SECRET_KEY: 'sk_test_fixture' }).STRIPE_SECRET_KEY, 'sk_test_fixture');
});

test('testing rejects production app origins, live analytics IDs and main deployments', () => {
  assert.throws(() => testingEnvironment({ ...fixture, TESTING_AUTH_URL: 'https://my-moodora.vercel.app' }));
  assert.throws(() => testingEnvironment({ ...fixture, NEXT_PUBLIC_TESTING_TRFYX_WEBSITE_ID: 'wwfhn43v8pg5' }));
  assert.throws(() => testingEnvironment({ ...fixture, NEXT_PUBLIC_TESTING_TRFYX_DOMAIN: 'my-moodora.vercel.app' }));
  assert.throws(() => testingEnvironment({ ...fixture, VERCEL_GIT_COMMIT_REF: 'main' }));
});

test('hosted testing accepts only hosted database and HTTPS app configuration', () => {
  assert.throws(() => testingEnvironment({ ...fixture, VERCEL: '1' }));
  const hosted = testingEnvironment({ ...fixture, VERCEL: '1', VERCEL_GIT_COMMIT_REF: 'testing', TESTING_DATABASE_URL: 'postgresql://u:p@test-db.invalid/moodora_testing', TESTING_AUTH_URL: 'https://testing.trfyx.com' });
  assert.equal(hosted.AUTH_URL, 'https://testing.trfyx.com');
});

test('missing custom domain uses this deployment URL, without a production fallback', () => {
  const resolved = testingEnvironment({ ...fixture, TESTING_AUTH_URL: undefined, VERCEL_URL: 'moodora-git-testing.example.vercel.app' });
  assert.equal(resolved.AUTH_URL, 'https://moodora-git-testing.example.vercel.app');
});

test('applying testing config deletes inherited production-only canonical fields', () => {
  const env = { ...fixture, STRIPE_SECRET_KEY: 'sk_live_fixture', DATABASE_URL_UNPOOLED: 'live' };
  applyTestingEnvironment(env);
  assert.equal(env.DATABASE_URL, fixture.TESTING_DATABASE_URL);
  assert.equal('STRIPE_SECRET_KEY' in env, false);
  assert.equal('DATABASE_URL_UNPOOLED' in env, false);
});

test('configuration errors never disclose credentials', () => {
  const messages = testingEnvironmentErrors({ ...fixture, TESTING_DATABASE_URL: 'postgresql://never-show-user:never-show-password@host.invalid/production', TESTING_AUTH_SECRET: 'never-show-secret' }).join(' ');
  for (const secret of ['never-show-user', 'never-show-password', 'never-show-secret']) assert.equal(messages.includes(secret), false);
});

test('the actual hosted build stops before migrations when testing credentials are absent', { skip: process.env.CODEX_SANDBOX_NETWORK_DISABLED === '1' ? 'Nested Node execution is restricted here; checked directly in the terminal.' : false }, () => {
  const result = spawnSync(process.execPath, ['scripts/build-testing.mjs'], {
    encoding: 'utf8',
    env: { ...process.env, TESTING_DATABASE_URL: '', TESTING_AUTH_SECRET: '', TESTING_DIRECT_DATABASE_URL: '' },
  });
  assert.equal(result.status, 1);
  const output = result.stdout + result.stderr;
  assert.match(output, /Testing configuration blocked/);
  assert.equal(output.includes('Prisma schema loaded'), false);
});

test('the actual push helper refuses main before contacting a remote', { skip: process.env.CODEX_SANDBOX_NETWORK_DISABLED === '1' ? 'Nested Node execution is restricted here; checked directly in the terminal.' : false }, () => {
  const directory = mkdtempSync(join(tmpdir(), 'moodora-push-guard-'));
  try {
    const init = spawnSync('git', ['init', '-b', 'main', directory], { encoding: 'utf8' });
    assert.equal(init.status, 0);
    const result = spawnSync(process.execPath, [fileURLToPath(new URL('../scripts/push-testing.mjs', import.meta.url))], { cwd: directory, encoding: 'utf8' });
    assert.equal(result.status, 1);
    assert.match(result.stderr, /Refusing to push/);
  } finally { rmSync(directory, { recursive: true, force: true }); }
});

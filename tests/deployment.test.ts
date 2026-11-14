import test from 'node:test';
import assert from 'node:assert/strict';
import { trustedOrigins, usesSecureCookies, vercelEnvironmentErrors, type DeploymentEnvironment } from '../src/lib/deployment.ts';

const hosted: DeploymentEnvironment = {
  VERCEL: '1',
  VERCEL_ENV: 'production',
  VERCEL_URL: 'moodbloom-build-123.vercel.app',
  VERCEL_PROJECT_PRODUCTION_URL: 'moodbloom.example',
  DATABASE_URL: 'postgresql://app:fixture-password@db.example/journal?sslmode=require',
  AUTH_SECRET: 'test-only-secret-that-is-at-least-32-characters',
};

test('local origin checks preserve the configured localhost URL', () => {
  assert.deepEqual(trustedOrigins('http://127.0.0.1:3000/api/moods', { AUTH_URL: 'http://localhost:3000' }), ['http://localhost:3000']);
  assert.deepEqual(trustedOrigins('http://localhost:3001/api/moods', {}), ['http://localhost:3001']);
});

test('production accepts only configured deployment and production domains', () => {
  const origins = trustedOrigins('http://internal-server/api/moods', hosted);
  assert.ok(origins.includes('https://moodbloom-build-123.vercel.app'));
  assert.ok(origins.includes('https://moodbloom.example'));
  assert.equal(origins.includes('https://attacker.vercel.app'), false);
  assert.equal(origins.includes('http://internal-server'), false);
  assert.equal(origins.includes('https://moodbloom.example.attacker.test'), false);
});

test('previews do not implicitly accept the production domain', () => {
  const origins = trustedOrigins('http://internal/api/diary', { ...hosted, VERCEL_ENV: 'preview', VERCEL_BRANCH_URL: 'moodbloom-git-preview.vercel.app' });
  assert.ok(origins.includes('https://moodbloom-git-preview.vercel.app'));
  assert.equal(origins.includes('https://moodbloom.example'), false);
});

test('custom HTTPS domain can be explicitly configured', () => {
  assert.ok(trustedOrigins('https://journal.example/api/data', { ...hosted, AUTH_URL: 'https://journal.example/' }).includes('https://journal.example'));
});

test('Vercel cookies remain secure without an explicit AUTH_URL', () => {
  assert.equal(usesSecureCookies(hosted), true);
  assert.equal(usesSecureCookies({ NODE_ENV: 'production', AUTH_URL: 'http://localhost:3000' }), false);
  assert.equal(usesSecureCookies({ AUTH_URL: 'https://journal.example' }), true);
});

test('hosted database and fresh auth secret pass preflight', () => {
  assert.deepEqual(vercelEnvironmentErrors(hosted), []);
  assert.deepEqual(vercelEnvironmentErrors({ ...hosted, DATABASE_URL_UNPOOLED: 'postgresql://app:fixture-password@direct-db.example/journal?sslmode=require' }), []);
});

test('preflight rejects local database hosts before any migrations', () => {
  for (const host of ['localhost', '127.0.0.1', '[::1]', '0.0.0.0', 'db.localhost']) {
    assert.ok(vercelEnvironmentErrors({ ...hosted, DATABASE_URL: `postgresql://app:fixture-password@${host}:55439/journal` }).some(error => error.includes('local database')));
  }
  assert.ok(vercelEnvironmentErrors({ ...hosted, DIRECT_DATABASE_URL: 'postgresql://app:fixture-password@localhost/journal' }).length);
});

test('preflight rejects missing, malformed, and non-PostgreSQL connections', () => {
  for (const value of ['', 'invalid', 'https://db.example/journal', 'postgresql://db.example/journal']) {
    assert.ok(vercelEnvironmentErrors({ ...hosted, DATABASE_URL: value }).length);
  }
});

test('preflight rejects short secrets and local production AUTH_URL', () => {
  assert.ok(vercelEnvironmentErrors({ ...hosted, AUTH_SECRET: 'short' }).some(error => error.includes('AUTH_SECRET')));
  assert.ok(vercelEnvironmentErrors({ ...hosted, AUTH_SECRET: 'generate-with-openssl-rand-base64-32' }).length);
  assert.ok(vercelEnvironmentErrors({ ...hosted, AUTH_URL: 'http://localhost:3000' }).some(error => error.includes('AUTH_URL')));
  assert.ok(vercelEnvironmentErrors({ ...hosted, AUTH_URL: 'https://journal.example/api/auth' }).length);
});

test('preflight requires domain configuration and complete optional Google settings', () => {
  assert.ok(vercelEnvironmentErrors({ ...hosted, VERCEL_URL: undefined, VERCEL_PROJECT_PRODUCTION_URL: undefined }).length);
  assert.ok(vercelEnvironmentErrors({ ...hosted, AUTH_GOOGLE_ID: 'only-one-variable' }).some(error => error.includes('both Google')));
});

test('preflight messages do not disclose database credentials or auth secrets', () => {
  const messages = vercelEnvironmentErrors({ ...hosted, DATABASE_URL: 'postgresql://app:never-print-this-password@localhost/journal', AUTH_SECRET: 'sensitive-short' }).join('\n');
  assert.equal(messages.includes('never-print-this-password'), false);
  assert.equal(messages.includes('sensitive-short'), false);
});

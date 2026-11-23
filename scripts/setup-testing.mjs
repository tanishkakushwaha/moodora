import { existsSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { config } from 'dotenv';
import { testingEnvironment } from './lib/testing-environment.mjs';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
function run(command, args, env) {
  const result = spawnSync(command, args, { cwd: root, env, stdio: 'inherit', shell: false });
  if (result.error || result.status !== 0) throw new Error('Testing setup stopped. See preceding output.');
}
try {
  const branch = spawnSync('git', ['branch', '--show-current'], { cwd: root, encoding: 'utf8' });
  if (branch.stdout.trim() !== 'testing') throw new Error('Run setup only in the testing checkout.');
  const envFile = resolve(root, '.env');
  if (!existsSync(envFile)) writeFileSync(envFile, [
    `TESTING_DATABASE_URL="postgresql://moodora_testing_user:${randomBytes(24).toString('hex')}@127.0.0.1:55440/moodora_testing?schema=public"`,
    `TESTING_AUTH_SECRET="${randomBytes(32).toString('hex')}"`,
    'TESTING_AUTH_URL="http://localhost:3100"',
    'NEXT_PUBLIC_TESTING_TRFYX_WEBSITE_ID=""',
    'NEXT_PUBLIC_TESTING_TRFYX_DOMAIN="testing.trfyx.com"', '',
  ].join('\n'), { mode: 0o600 });
  config({ path: envFile, quiet: true });
  const values = testingEnvironment(process.env);
  const env = Object.fromEntries(Object.entries(values).filter(([, value]) => value !== undefined));
  console.log('Using testing-only credentials. Local database port: 55440; application: 3100.');
  run(process.execPath, ['scripts/database.mjs', 'start'], env);
  run('npx', ['--no-install', 'prisma', 'generate'], env);
  run('npx', ['--no-install', 'prisma', 'migrate', 'deploy'], env);
  console.log('Testing database ready. No production database or credentials were used.');
} catch (error) {
  console.error(error instanceof Error ? error.message : 'Testing setup failed.');
  process.exitCode = 1;
}

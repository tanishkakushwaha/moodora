import { existsSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const [major, minor] = process.versions.node.split('.').map(Number);
if (major < 24 || (major === 24 && minor < 11)) {
  console.error('Moodora needs Node.js 24.11 or newer. This computer already has Node 24.19 under ~/.nvm.');
  process.exit(1);
}

function run(bin, args) {
  const result = spawnSync(bin, args, { cwd: root, stdio: 'inherit', shell: false });
  if (result.error || result.status !== 0) {
    console.error(result.error?.message || `${args.join(' ')} failed. See the message above.`);
    process.exit(1);
  }
}

if (!existsSync(resolve(root, '.env'))) {
  writeFileSync(resolve(root, '.env'), [
    `DATABASE_URL="postgresql://bloom:${randomBytes(24).toString('hex')}@127.0.0.1:55439/bloom?schema=public"`,
    `AUTH_SECRET="${randomBytes(32).toString('hex')}"`,
    'AUTH_URL="http://localhost:3000"',
    'AUTH_TRUST_HOST="true"',
    '',
  ].join('\n'), { mode: 0o600 });
}

console.log('\n[1/3] Installing Moodora dependencies, including charts, motion, and forms…');
console.log('Existing environment settings and personal data will be preserved.');
run('npm', ['install', '--no-audit', '--no-fund', '--fetch-retries=1', '--fetch-timeout=20000']);
console.log('\n[2/3] Starting the project’s PostgreSQL database…');
run(process.execPath, ['scripts/database.mjs', 'start']);
console.log('\n[3/3] Applying committed database migrations…');
run('npm', ['run', 'db:deploy']);
console.log('\nSetup complete. Your account and journal data are preserved.');

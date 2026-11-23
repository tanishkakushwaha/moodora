import { existsSync, mkdirSync, readFileSync, writeFileSync, unlinkSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { config } from 'dotenv';
import { applyTestingEnvironment } from './lib/testing-environment.mjs';
import { testingPostgresConfiguration } from './lib/testing-postgres-config.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
config({ path: resolve(root, '.env'), quiet: true });
applyTestingEnvironment();
const data = resolve(root, '.data/postgres');
const log = resolve(root, '.data/postgres.log');
const bin = process.env.POSTGRES_BIN || '/usr/lib/postgresql/16/bin';
const mode = process.argv[2] || 'start';

function run(command, args, options = {}) {
  const result = spawnSync(command, args, { cwd: root, encoding: 'utf8', timeout: 60000, ...options });
  if (result.error || result.status !== 0) {
    throw new Error(result.error?.message || result.stderr || result.stdout || `${command} failed`);
  }
  return result.stdout;
}

try {
  if (!['start', 'stop'].includes(mode)) throw new Error('Use db:start or db:stop.');
  if (mode === 'start' && !process.env.DATABASE_URL) throw new Error('DATABASE_URL is missing. Run npm run setup.');
  const url = process.env.DATABASE_URL ? new URL(process.env.DATABASE_URL) : null;
  if (mode === 'start' && (!['localhost', '127.0.0.1'].includes(url.hostname) || url.port !== '55440')) {
    console.log('Using your configured PostgreSQL service. Local cluster startup skipped.');
    process.exit(0);
  }
  if (!existsSync(resolve(bin, 'pg_ctl'))) {
    throw new Error('PostgreSQL binaries are missing. Install PostgreSQL 16 or set POSTGRES_BIN to its bin directory. For a hosted database, configure DATABASE_URL.');
  }
  if (mode === 'stop') {
    if (existsSync(resolve(data, 'postmaster.pid'))) console.log(run(resolve(bin, 'pg_ctl'), ['-D', data, '-w', 'stop', '-m', 'fast']));
    else console.log('Local PostgreSQL is already stopped.');
    process.exit(0);
  }

  mkdirSync(resolve(root, '.data'), { recursive: true, mode: 0o700 });
  if (!existsSync(resolve(data, 'PG_VERSION'))) {
    const passwordFile = resolve(root, '.data/.init-password');
    writeFileSync(passwordFile, randomBytes(32).toString('hex'), { mode: 0o600 });
    try {
      console.log(run(resolve(bin, 'initdb'), ['-D', data, '--auth-local=peer', '--auth-host=scram-sha-256', `--pwfile=${passwordFile}`, '--encoding=UTF8', '--no-locale']));
    } finally {
      unlinkSync(passwordFile);
    }
  }

  // PG_VERSION can already exist after an interrupted initialization. Restore
  // the managed test-only settings even when initdb does not need to run again.
  const settingsPath = resolve(data, 'postgresql.auto.conf');
  const previousSettings = existsSync(settingsPath) ? readFileSync(settingsPath, 'utf8') : '';
  writeFileSync(settingsPath, testingPostgresConfiguration(previousSettings), { mode: 0o600 });

  const status = spawnSync(resolve(bin, 'pg_ctl'), ['-D', data, 'status'], { encoding: 'utf8' });
  if (status.status !== 0) console.log(run(resolve(bin, 'pg_ctl'), ['-D', data, '-l', log, '-w', 'start']));
  const user = decodeURIComponent(url.username);
  const password = decodeURIComponent(url.password);
  const database = decodeURIComponent(url.pathname.slice(1));
  const literal = value => "'" + value.replaceAll("'", "''") + "'";
  const sql = [
    `SELECT format('CREATE ROLE %I LOGIN PASSWORD %L', ${literal(user)}, ${literal(password)}) WHERE NOT EXISTS (SELECT FROM pg_roles WHERE rolname=${literal(user)})`,
    '\\gexec',
    `SELECT format('CREATE DATABASE %I OWNER %I', ${literal(database)}, ${literal(user)}) WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname=${literal(database)})`,
    '\\gexec',
    '',
  ].join('\n');
  // Peer-authenticated cluster owner provisions the dedicated application role.
  // The password travels through stdin and the child environment, never argv.
  run(resolve(bin, 'psql'), ['-h', '/tmp', '-p', '55440', '-d', 'postgres', '-v', 'ON_ERROR_STOP=1'], { input: sql });
  run(resolve(bin, 'psql'), ['-h', '127.0.0.1', '-p', '55440', '-U', user, '-d', database, '-v', 'ON_ERROR_STOP=1', '-c', 'SELECT 1;'], {
    env: { ...process.env, PGPASSWORD: password, PGCONNECT_TIMEOUT: '5' },
  });
  console.log('PostgreSQL is ready and the application credentials work on 127.0.0.1:55440.');
} catch (error) {
  console.error(`Database setup: ${error.message}`);
  if (existsSync(log)) console.error(readFileSync(log, 'utf8').split('\n').slice(-12).join('\n'));
  process.exitCode = 1;
}

// Reuse a running local Moodora, or own a temporary Next.js server for the test.
// Never stop a server that was already running before this command.
import { existsSync } from 'node:fs';
import { spawn, spawnSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { config } from 'dotenv';
import { findPort, localEndpoint, probeBloom, describeFetchError } from './lib/local-server.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
config({ path: resolve(root, '.env'), quiet: true });
let ownedServer;
let checks;
let interrupted = false;
const interrupt = () => { interrupted = true; checks?.kill('SIGINT'); ownedServer?.kill('SIGINT'); };
process.on('SIGINT', interrupt);
process.on('SIGTERM', interrupt);

function run(command, args, env = process.env) {
  const result = spawnSync(command, args, { cwd: root, env, stdio: 'inherit', shell: false });
  if (result.error || result.status !== 0) throw new Error(result.error?.message || `${args.join(' ')} failed. See the error above.`);
}

async function runChecks(origin) {
  console.log(`\nRunning live checks against ${origin}\n`);
  checks = spawn(process.execPath, ['scripts/smoke.mjs'], {
    cwd: root, env: { ...process.env, BLOOM_SMOKE_ORIGIN: origin }, stdio: 'inherit', shell: false,
  });
  return new Promise((resolveCode, reject) => {
    checks.once('error', reject);
    checks.once('exit', code => resolveCode(code ?? 1));
  });
}

async function stopOwnedServer() {
  if (!ownedServer?.pid || ownedServer.exitCode !== null || ownedServer.signalCode !== null) return;
  const done = new Promise(resolveDone => ownedServer.once('exit', resolveDone));
  ownedServer.kill('SIGTERM');
  const force = setTimeout(() => ownedServer.kill('SIGKILL'), 5000);
  await done;
  clearTimeout(force);
  console.log('Temporary test server stopped. PostgreSQL and existing app servers were left running.');
}

try {
  const explicit = process.env.BLOOM_SMOKE_ORIGIN;
  const origins = explicit ? [explicit] : [...new Set([
    ...(process.env.AUTH_URL && /^http:\/\/(localhost|127\.0\.0\.1)(:|\/|$)/.test(process.env.AUTH_URL) ? [process.env.AUTH_URL] : []),
    ...Array.from({ length: 11 }, (_, i) => `http://localhost:${3000 + i}`),
  ])];
  for (const origin of origins) localEndpoint(origin);
  const probes = await Promise.allSettled(origins.map(origin => probeBloom(origin)));
  const candidates = probes.map(result => result.status === 'fulfilled' ? result.value : null);
  const running = candidates.find(candidate => candidate?.healthy) || candidates.find(Boolean);
  let origin = running?.origin;

  if (!running?.healthy) {
    if (!origin) {
      // Do this before changing anything so sandbox denials fail clearly.
      const preferredPort = explicit ? Number(new URL(explicit).port || 80) : 3000;
      const port = await findPort(preferredPort, explicit ? preferredPort : 3010);
      origin = explicit ? new URL(explicit).origin : `http://localhost:${port}`;
    }
    run(process.execPath, ['scripts/database.mjs', 'start']);
    run('npm', ['run', 'db:deploy']);
    if (!running) {
      const env = { ...process.env, AUTH_URL: origin };
      if (!existsSync(resolve(root, '.next/BUILD_ID'))) run('npm', ['run', 'build'], env);
      console.log(`No running Moodora found. Starting a temporary app server at ${origin}…`);
      ownedServer = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'start', '--hostname', '127.0.0.1', '--port', String(new URL(origin).port || 80)], {
        cwd: root, env, stdio: 'inherit', shell: false,
      });
      let startupError;
      ownedServer.on('error', error => { startupError = error; });
      const deadline = Date.now() + 45000;
      let ready = false;
      while (Date.now() < deadline && !interrupted) {
        if (startupError) throw startupError;
        if (ownedServer.exitCode !== null || ownedServer.signalCode !== null) throw new Error('The temporary Next.js server exited. See its error above.');
        try { if ((await probeBloom(origin))?.healthy) { ready = true; break; } } catch { /* wait for startup */ }
        await new Promise(resolveWait => setTimeout(resolveWait, 300));
      }
      if (!ready) throw new Error('Moodora did not become ready within 45 seconds. See the server output above.');
    } else if (!(await probeBloom(origin, 5000))?.healthy) {
      throw new Error(`Moodora at ${origin} is running, but PostgreSQL is unhealthy. See database setup output above.`);
    }
  }
  if (interrupted) throw new Error('Integration checks were interrupted.');
  process.exitCode = await runChecks(origin);
} catch (error) {
  if (['EPERM', 'EACCES'].includes(error.code)) {
    console.error(describeFetchError(error, 'LISTEN', 'local Moodora test server'));
    console.error('Run npm run test:integration from your normal Linux terminal.');
  } else {
    console.error(`Could not run integration checks: ${error.message}`);
  }
  process.exitCode = 1;
} finally {
  await stopOwnedServer();
  process.off('SIGINT', interrupt);
  process.off('SIGTERM', interrupt);
}

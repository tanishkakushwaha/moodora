import 'dotenv/config';
import { spawn, spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { testingEnvironment } from './lib/testing-environment.mjs';
import { findPort, probeBloom } from './lib/local-server.mjs';
let server;
try {
  const port = await findPort(3100, 3110);
  const origin = `http://localhost:${port}`;
  const values = testingEnvironment({ ...process.env, TESTING_AUTH_URL: origin, BLOOM_SMOKE_ORIGIN: origin });
  if (!['localhost', '127.0.0.1'].includes(new URL(values.DATABASE_URL).hostname)) throw new Error('Automated destructive smoke checks may run only against the local moodora_testing database. Use the manual guide for the hosted testing site.');
  if (values.STRIPE_SECRET_KEY) throw new Error('Run automated local smoke checks with Stripe disabled; test provider flows separately in the dedicated sandbox.');
  const env = Object.fromEntries(Object.entries(values).filter(([, value]) => value !== undefined));
  function run(command, args) {
    const result = spawnSync(command, args, { env, stdio: 'inherit', shell: false });
    if (result.error || result.status !== 0) throw new Error('Testing integration stopped. See preceding output.');
  }
  run(process.execPath, ['scripts/database.mjs', 'start']);
  run('npx', ['--no-install', 'prisma', 'migrate', 'deploy']);
  if (!existsSync('.next/BUILD_ID')) run('npm', ['run', 'build']);
  server = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'start', '--hostname', '127.0.0.1', '--port', String(port)], { env, stdio: 'inherit' });
  server.on('error', () => {});
  let ready = false;
  for (let attempt = 0; attempt < 100; attempt++) {
    if (server.exitCode !== null) throw new Error('The temporary testing server exited.');
    try { if ((await probeBloom(origin, 500))?.healthy) { ready = true; break; } } catch { /* wait */ }
    await new Promise(resolve => setTimeout(resolve, 300));
  }
  if (!ready) throw new Error('The isolated testing server did not become ready.');
  run(process.execPath, ['scripts/smoke.mjs']);
} catch (error) {
  console.error(error instanceof Error ? error.message : 'Testing integration failed.');
  process.exitCode = 1;
} finally {
  if (server?.pid && server.exitCode === null) {
    const stopped = new Promise(resolve => server.once('exit', resolve));
    server.kill('SIGTERM');
    const timer = setTimeout(() => server.kill('SIGKILL'), 5000);
    await stopped;
    clearTimeout(timer);
  }
}

import { spawn, spawnSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { findPort } from './lib/local-server.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

function run(bin, args, env) {
  const result = spawnSync(bin, args, { cwd: root, stdio: 'inherit', shell: false, env });
  if (result.error || result.status !== 0) {
    throw new Error(result.error?.message || `${args.join(' ')} did not complete. The error is printed above.`);
  }
}

try {
  console.log(`\nMoodora\nProject: ${root}\n`);
  // Test before installing or changing anything. A denied socket cannot be
  // repaired by editing application files or changing database credentials.
  const port = await findPort();
  const url = `http://localhost:${port}`;
  const env = { ...process.env, AUTH_URL: url };
  if (port !== 3000) console.log(`Port 3000 is occupied. Moodora will use ${url}; the existing app stays running.`);

  run(process.execPath, ['scripts/setup.mjs'], env);
  console.log('\nChecking forms, types, passwords, and the production build…');
  run('npm', ['run', 'typecheck'], env);
  run('npm', ['test'], env);
  run('npm', ['run', 'build'], env);

  console.log(`\nStarting your app at ${url}\nKeep this terminal open. Press Ctrl+C to stop Moodora.\n`);
  const server = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'start', '--hostname', '127.0.0.1', '--port', String(port)], {
    cwd: root, env, stdio: 'inherit', shell: false,
  });
  let exited = false;
  let opened = false;
  let checks;
  const interrupt = () => { checks?.kill('SIGINT'); if (!exited) server.kill('SIGINT'); };
  const terminate = () => { checks?.kill('SIGTERM'); if (!exited) server.kill('SIGTERM'); };
  process.on('SIGINT', interrupt);
  process.on('SIGTERM', terminate);

  const readinessTimer = setInterval(async () => {
    if (exited || opened) return;
    try {
      const response = await fetch(`http://127.0.0.1:${port}/api/health`, { signal: AbortSignal.timeout(1500) });
      if (!response.ok || opened || exited) return;
      const health = await response.json();
      if (health.app !== 'bloom-mood-diary' || health.database !== true) return;
      opened = true;
      clearInterval(readinessTimer);
      console.log('\nMoodora and PostgreSQL are responding. Checking real account and diary flows…\n');
      checks = spawn(process.execPath, ['scripts/smoke.mjs'], {
        cwd: root, env: { ...env, BLOOM_SMOKE_ORIGIN: url }, stdio: 'inherit', shell: false,
      });
      checks.once('error', error => console.error(`Live checks could not start: ${error.message}`));
      checks.once('exit', code => {
        if (exited) return;
        if (code !== 0) {
          console.error(`Live integration checks failed. Moodora is running at ${url}; review the error above.`);
          return;
        }
        console.log(`\nMoodora is ready: ${url}\n`);
        const browser = spawn('xdg-open', [url], { stdio: 'ignore' });
        browser.on('error', () => console.log(`Open ${url} in your browser.`));
        browser.unref();
      });
    } catch {
      // Allow the server to become ready without treating startup as a failure.
    }
  }, 1000);

  const timeout = setTimeout(() => {
    if (!opened && !exited) {
      clearInterval(readinessTimer);
      console.error(`The server has not responded yet. Review the Next.js error above, or open ${url}.`);
    }
  }, 120000);
  timeout.unref();

  server.once('error', error => {
    exited = true;
    checks?.kill('SIGTERM');
    clearInterval(readinessTimer);
    clearTimeout(timeout);
    console.error(`Could not start Next.js: ${error.message}`);
    process.exitCode = 1;
  });
  server.once('exit', (code, signal) => {
    exited = true;
    checks?.kill('SIGTERM');
    clearInterval(readinessTimer);
    clearTimeout(timeout);
    process.off('SIGINT', interrupt);
    process.off('SIGTERM', terminate);
    process.exitCode = signal === 'SIGINT' || signal === 'SIGTERM' ? 0 : (code ?? 1);
  });
} catch (error) {
  if (error.code === 'EPERM' || error.code === 'EACCES') {
    console.error('This terminal’s policy blocks local servers. Run the launcher from your normal Linux terminal:');
    console.error('bash "$HOME/Desktop/My Moodora/scripts/launch.sh"');
    console.error('Application code cannot change this terminal’s sandbox permissions.');
  } else {
    console.error(`Moodora could not start: ${error.message}`);
  }
  process.exitCode = 1;
}

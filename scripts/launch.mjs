import { spawnSync, spawn } from 'node:child_process';
const setup = spawnSync(process.execPath, ['scripts/setup-testing.mjs'], { stdio: 'inherit' });
if (setup.status !== 0) process.exit(setup.status || 1);
console.log('Open http://localhost:3100 — isolated Moodora testing.');
const app = spawn('npm', ['run', 'dev', '--', '--hostname', '127.0.0.1', '--port', '3100'], { stdio: 'inherit' });
app.on('exit', code => { process.exitCode = code ?? 1; });

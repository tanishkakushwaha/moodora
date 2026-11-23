import { spawnSync } from 'node:child_process';
const branch = spawnSync('git', ['branch', '--show-current'], { encoding: 'utf8' });
if (branch.status !== 0 || branch.stdout.trim() !== 'testing') {
  console.error('Refusing to push: run this only from the testing checkout.');
  process.exitCode = 1;
} else {
  const result = spawnSync('git', ['push', '--set-upstream', 'origin', 'HEAD:refs/heads/testing'], { stdio: 'inherit', shell: false });
  process.exitCode = result.status ?? 1;
}

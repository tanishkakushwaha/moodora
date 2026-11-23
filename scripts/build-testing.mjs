import 'dotenv/config';
import { spawnSync } from 'node:child_process';
import { testingEnvironment } from './lib/testing-environment.mjs';
try {
  const values = testingEnvironment(process.env);
  const env = Object.fromEntries(Object.entries(values).filter(([, value]) => value !== undefined));
  for (const args of [['prisma', 'generate'], ['prisma', 'migrate', 'deploy'], ['next', 'build', '--webpack']]) {
    const result = spawnSync('npx', ['--no-install', ...args], { env, stdio: 'inherit', shell: false });
    if (result.error || result.status !== 0) throw new Error('Testing build stopped. Review the preceding error; do not bypass configuration checks.');
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : 'Testing configuration failed.');
  process.exitCode = 1;
}

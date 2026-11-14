import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, copyFile, writeFile, symlink, access, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const run = promisify(execFile);
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

test('Prisma client generation works during install without database environment variables', { timeout: 60000 }, async () => {
  const fixture = await mkdtemp(join(tmpdir(), 'mood-dairy-prisma-install-'));
  try {
    await mkdir(join(fixture, 'prisma'));
    await copyFile(join(root, 'prisma.config.ts'), join(fixture, 'prisma.config.ts'));
    await copyFile(join(root, 'prisma/schema.prisma'), join(fixture, 'prisma/schema.prisma'));
    await writeFile(join(fixture, 'package.json'), JSON.stringify({ private: true, type: 'module' }));
    await symlink(join(root, 'node_modules'), join(fixture, 'node_modules'), 'dir');
    const env = { ...process.env, DOTENV_CONFIG_PATH: join(fixture, '.env') };
    delete env.DATABASE_URL;
    delete env.DIRECT_DATABASE_URL;
    delete env.DATABASE_URL_UNPOOLED;
    await run(process.execPath, [join(root, 'node_modules/prisma/build/index.js'), 'generate', '--config', join(fixture, 'prisma.config.ts')], {
      cwd: fixture, env, timeout: 45000,
    });
    await assert.doesNotReject(access(join(fixture, 'src/generated/prisma/client.ts')));
  } finally {
    await rm(fixture, { recursive: true, force: true });
  }
});

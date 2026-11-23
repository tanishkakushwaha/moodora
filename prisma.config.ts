import 'dotenv/config';
import { defineConfig } from 'prisma/config';

// Generate is safe without a connection. Every database operation in this
// branch ignores generic production variables and requires a named test DB.
const migrationUrl = process.env.TESTING_DIRECT_DATABASE_URL || process.env.TESTING_DATABASE_URL;
if (migrationUrl) {
  try {
    const database = new URL(migrationUrl);
    if (!['postgres:', 'postgresql:'].includes(database.protocol) || decodeURIComponent(database.pathname.slice(1)) !== 'moodora_testing') throw new Error();
  } catch { throw new Error('Testing Prisma operations require a valid separate moodora_testing database URL.'); }
}

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: { path: 'prisma/migrations' },
  ...(migrationUrl ? { datasource: { url: migrationUrl } } : {}),
});

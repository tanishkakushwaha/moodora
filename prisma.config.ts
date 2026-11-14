import 'dotenv/config';
import { defineConfig } from 'prisma/config';

// Generating the client during npm install does not connect to a database.
// Migration commands use the hosted direct URL when one is configured.
const migrationUrl = process.env.DIRECT_DATABASE_URL
  || process.env.DATABASE_URL_UNPOOLED
  || process.env.DATABASE_URL;

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: { path: 'prisma/migrations' },
  ...(migrationUrl ? { datasource: { url: migrationUrl } } : {}),
});

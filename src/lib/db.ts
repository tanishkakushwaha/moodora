import 'server-only';
import { PrismaClient } from '@/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
const globalDb = globalThis as unknown as {
    prisma: PrismaClient | undefined;
};
export const db = globalDb.prisma ?? new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL, max: process.env.VERCEL === '1' ? 3 : 10, connectionTimeoutMillis: 10000, idleTimeoutMillis: 10000 }) });
if (process.env.NODE_ENV !== 'production')
    globalDb.prisma = db;

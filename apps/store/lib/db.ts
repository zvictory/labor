import { PrismaClient } from '@prisma/client';

// PrismaClient singleton. In dev, Next.js HMR re-evaluates modules on every edit,
// which would otherwise spawn a new PrismaClient (and a new connection pool) on
// each reload until Postgres refuses connections. Cache the instance on globalThis.

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const db: PrismaClient =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasources: {
      db: {
        url: process.env.DATABASE_URL || 'file:./dev.db',
      },
    },
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = db;
}

export default db;

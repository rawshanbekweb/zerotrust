import { PrismaClient } from '@prisma/client';
import { log } from '../utils/logger.js';
import { config } from '../config/index.js';

// Prisma singleton — one connection pool for the entire process.
// Re-instantiating PrismaClient per-request would exhaust DB connections fast.
// In development we attach it to globalThis to survive hot-reloads (tsx watch).

declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
}

function createPrismaClient(): PrismaClient {
  return new PrismaClient({
    log: config.app.isDevelopment
      ? [
          { emit: 'event', level: 'query' },
          { emit: 'event', level: 'warn' },
          { emit: 'event', level: 'error' },
        ]
      : [{ emit: 'event', level: 'error' }],
  });
}

export const prisma: PrismaClient =
  config.app.isDevelopment
    ? (globalThis.__prisma ?? (globalThis.__prisma = createPrismaClient()))
    : createPrismaClient();

if (config.app.isDevelopment) {
  // @ts-expect-error — prisma event typing is complex, this is only for dev logging
  prisma.$on('query', (e: { query: string; duration: number }) => {
    if (e.duration > 100) {
      log.warn(`Slow query (${e.duration}ms): ${e.query}`);
    }
  });
}

export async function connectDatabase(): Promise<void> {
  try {
    await prisma.$connect();
    log.info('Database connected successfully');
  } catch (error) {
    log.error('Failed to connect to database', { error });
    process.exit(1);
  }
}

export async function disconnectDatabase(): Promise<void> {
  await prisma.$disconnect();
  log.info('Database disconnected');
}

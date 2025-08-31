import { PrismaClient, Prisma, $Enums, User } from '@prisma/client';
import { PrismaNeon } from '@prisma/adapter-neon';
import { neonConfig } from '@neondatabase/serverless';
import ws from 'ws';

// configure WebSocket for Neon
neonConfig.webSocketConstructor = ws;
// enable querying over fetch for edge environments (Vercel)
neonConfig.poolQueryViaFetch = true;

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL is not defined');
}

const adapter = new PrismaNeon({ connectionString });

const globalForPrisma = global as unknown as { prisma: PrismaClient };

const prismaClientSingleton = () =>
  new PrismaClient({
    adapter,
    log:
      process.env.NODE_ENV === 'development'
        ? [{ emit: 'event', level: 'query' }]
        : undefined,
  });

export const db = globalForPrisma.prisma || prismaClientSingleton();

export type { $Enums, Prisma, User };

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db;

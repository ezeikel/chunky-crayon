import { PrismaClient } from "../generated/prisma";
import { PrismaNeon } from "@prisma/adapter-neon";
import { neonConfig } from "@neondatabase/serverless";
import ws from "ws";

// Configure WebSocket for Neon (required for Node.js environments)
neonConfig.webSocketConstructor = ws;

// IMPORTANT: Do NOT enable poolQueryViaFetch for this app
// - poolQueryViaFetch uses HTTP fetch internally, which conflicts with
//   Next.js Cache Components during static generation (prerender)
// - This app runs on Node.js serverless (not Edge), so WebSocket works fine
// - WebSocket connections are more efficient for serverless anyway
// - Only enable poolQueryViaFetch if you're using Vercel Edge Functions
//
// If you need Edge support in the future, you can conditionally enable it:
// if (process.env.NEXT_RUNTIME === 'edge') {
//   neonConfig.poolQueryViaFetch = true;
// }

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is not defined");
}

const adapter = new PrismaNeon({ connectionString });

const globalForPrisma = global as unknown as { prisma: PrismaClient };

const prismaClientSingleton = () =>
  new PrismaClient({
    adapter,
    log:
      process.env.NODE_ENV === "development"
        ? [{ emit: "event", level: "query" }]
        : undefined,
  });

export const prisma = globalForPrisma.prisma || prismaClientSingleton();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

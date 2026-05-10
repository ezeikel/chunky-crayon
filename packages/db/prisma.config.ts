import path from "node:path";
import dotenv from "dotenv";
import { defineConfig } from "prisma/config";

// Load .env.local from apps/chunky-crayon-web (for local development)
// On Vercel, env vars are injected directly into process.env
dotenv.config({
  path: path.resolve(__dirname, "../../apps/chunky-crayon-web/.env.local"),
});

// Migrations need a session-mode Postgres connection. Neon's pooled
// host runs PgBouncer in transaction mode, which doesn't support the
// advisory locks Prisma Migrate uses — pooled connections error out
// with `P1017 Server has closed the connection`. So:
//
//   - prisma.config.ts datasource (this file) = unpooled URL,
//     used only by CLI commands like `prisma migrate dev/deploy`.
//   - Runtime app (packages/db/src/client.ts) keeps reading
//     `process.env.DATABASE_URL` = pooled URL via @prisma/adapter-neon.
//
// Fall back to `DATABASE_URL` when the unpooled var isn't set so
// preview environments or test setups that don't distinguish still
// work — at the cost of failing exactly the same way the pooled URL
// would on actual migrations.
const migrationUrl =
  process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;

// Shadow DB is only used by `prisma migrate diff --from-migrations ...`
// in the CI drift-check job. Local dev + `prisma migrate deploy` don't
// need it, so we only set it when the env var is present.
const shadowDatabaseUrl = process.env.SHADOW_DATABASE_URL;

export default defineConfig({
  schema: "./prisma/schema.prisma",
  migrations: {
    path: "./prisma/migrations",
  },
  datasource: {
    url: migrationUrl,
    ...(shadowDatabaseUrl ? { shadowDatabaseUrl } : {}),
  },
});

import path from "node:path";
import dotenv from "dotenv";
import { defineConfig } from "prisma/config";

// Load .env.local from apps/chunky-crayon-web (for local development)
// On Vercel, env vars are injected directly into process.env
dotenv.config({
  path: path.resolve(__dirname, "../../apps/chunky-crayon-web/.env.local"),
});

// Get DATABASE_URL from process.env (works both locally and on Vercel)
const databaseUrl = process.env.DATABASE_URL;

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
    url: databaseUrl,
    ...(shadowDatabaseUrl ? { shadowDatabaseUrl } : {}),
  },
});

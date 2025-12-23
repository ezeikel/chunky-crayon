import path from "node:path";
import dotenv from "dotenv";
import { defineConfig, env } from "prisma/config";

// Load .env.local from apps/web (where Vercel pulls env vars)
dotenv.config({ path: path.resolve(__dirname, "../../apps/web/.env.local") });

export default defineConfig({
  schema: "./prisma/schema.prisma",
  migrations: {
    path: "./prisma/migrations",
  },
  datasource: {
    url: env("DATABASE_URL"),
  },
});

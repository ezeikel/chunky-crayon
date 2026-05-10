/**
 * Run the region-store backfill against the PROD environment.
 *
 * Thin wrapper: parses `--prod-env-file=<path>`, loads it with
 * `override: true` BEFORE the backfill module's imports resolve, then
 * delegates to the regular backfill via dynamic `import()`.
 *
 * Why a separate file: `backfill-region-stores.ts` imports the shared
 * `@one-colored-pixel/db` singleton, which reads `process.env.DATABASE_URL`
 * at module load time (inside Prisma's adapter constructor). To target a
 * different DB, the env has to be set before that import resolves.
 * Dynamic import inside this wrapper is the cleanest way to defer it.
 *
 * Usage (from apps/chunky-crayon-web):
 *
 *   # Pull a prod env file once per session:
 *   vercel env pull .env.production.local --environment=production
 *
 *   # Dry-run against prod:
 *   pnpm tsx scripts/backfill-region-stores-prod.ts \
 *     --prod-env-file=.env.production.local \
 *     --bundle=dino-dance-party \
 *     --dry-run
 *
 *   # Real run:
 *   pnpm tsx scripts/backfill-region-stores-prod.ts \
 *     --prod-env-file=.env.production.local \
 *     --bundle=dino-dance-party
 *
 * All other flags (--bundle, --dry-run, --limit, --id, --force) pass
 * through to the underlying script.
 */

import { config as dotenvConfig } from 'dotenv';

const prodEnvFlag = process.argv.find((a) => a.startsWith('--prod-env-file='));
if (!prodEnvFlag) {
  console.error(
    'Missing required flag: --prod-env-file=<path-to-pulled-prod-env>',
  );
  process.exit(1);
}
const prodEnvPath = prodEnvFlag.split('=').slice(1).join('=');

const result = dotenvConfig({ path: prodEnvPath, override: true });
if (result.error) {
  console.error(`Could not load ${prodEnvPath}: ${result.error.message}`);
  process.exit(1);
}

// Sanity check: confirm we're actually pointed at prod, not dev.
const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) {
  console.error('DATABASE_URL not set after loading prod env file.');
  process.exit(1);
}
const host = dbUrl.match(/@([^/]+)/)?.[1] ?? '<unknown>';
const bucket = process.env.R2_BUCKET ?? '<unknown>';

console.log(`[backfill-prod] PROD environment loaded:`);
console.log(`[backfill-prod]   DB host: ${host}`);
console.log(`[backfill-prod]   R2 bucket: ${bucket}`);
console.log(`[backfill-prod] Continuing in 3 seconds (Ctrl+C to abort)...\n`);

await new Promise((r) => setTimeout(r, 3000));

// Strip our wrapper-only flag from argv so the underlying script's parser
// doesn't choke on it.
process.argv = process.argv.filter((a) => !a.startsWith('--prod-env-file='));

// Dynamic import — ALL the env-reading happens after this line.
await import('./backfill-region-stores');

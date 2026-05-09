/**
 * Smoke-test fulfilBundlePurchase against the existing test purchase
 * row. Confirms the action runs end-to-end (PDF render + R2 upload +
 * download URL log) without needing the Stripe webhook in the loop.
 *
 * Prerequisites:
 *   - test_purchase_dino_001 BundlePurchase row exists in dev DB
 *   - .env.local has R2 + DATABASE_URL pointing at dev
 *
 * Usage:
 *   cd apps/chunky-crayon-web
 *   pnpm tsx -r dotenv/config scripts/test-bundle-fulfilment.ts \
 *     dotenv_config_path=.env.local
 */

import { fulfilBundlePurchase } from '@/app/actions/bundle-fulfilment';
import { db } from '@one-colored-pixel/db';

const PURCHASE_ID = 'test_purchase_dino_001';

async function run() {
  console.log(`[test] fulfilBundlePurchase('${PURCHASE_ID}')...`);
  const start = Date.now();
  const result = await fulfilBundlePurchase(PURCHASE_ID);
  const elapsed = ((Date.now() - start) / 1000).toFixed(1);
  console.log(`[test] returned in ${elapsed}s:`, result);
}

run()
  .catch((e) => {
    console.error('[test]', e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());

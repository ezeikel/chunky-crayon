/**
 * Idempotent Stripe Product + Price creation for a bundle.
 *
 * For a given bundle slug, this script:
 *   1. Loads the Bundle row + its 5 listing image URLs from R2
 *   2. Creates (or updates) a Stripe Product with the bundle metadata,
 *      images, and a slug-based stable lookup key
 *   3. Creates (or reuses) a one-time Price at bundle.pricePence
 *   4. Writes stripeProductId + stripePriceId back to the Bundle row
 *   5. Generates a test-mode Checkout Session URL for manual smoke test
 *
 * Idempotency: re-running won't create duplicate Products. We look up
 * the existing Product by Stripe metadata.bundleSlug. Prices are
 * immutable once created, so if the bundle's pricePence changes, the
 * old Price is archived and a new active one is created.
 *
 * Usage:
 *   cd apps/chunky-crayon-web
 *   pnpm tsx -r dotenv/config scripts/create-stripe-bundle-product.ts \
 *     --slug=dino-dance-party \
 *     dotenv_config_path=.env.local
 *
 *   --dry           Preview what would be created/updated, no writes
 *   --no-checkout   Skip the test Checkout Session at the end
 */

import { stripe } from '../lib/stripe';
import { db } from '@one-colored-pixel/db';

const args = process.argv.slice(2);
const slug = args.find((a) => a.startsWith('--slug='))?.split('=')[1];
const dry = args.includes('--dry');
const skipCheckout = args.includes('--no-checkout');

if (!slug) throw new Error('--slug=<bundle> required');

// Description Stripe shows on the product page + checkout. Long enough to
// matter for SEO + Stripe-hosted checkout, short enough to read at a
// glance. Keep US/UK-neutral and don't mention "AI".
function buildDescription(bundleName: string, tagline: string): string {
  return `${tagline}\n\n${bundleName} is a 10-page coloring bundle for ages 3-8. Print at home, color online, replay forever. Instant download after checkout. PDF + online access.`;
}

async function findExistingProduct(bundleSlug: string) {
  // Stripe doesn't index by metadata directly — we have to search.
  // search() supports `metadata['bundleSlug']:'value'` syntax.
  const result = await stripe.products.search({
    query: `metadata['bundleSlug']:'${bundleSlug}' AND active:'true'`,
    limit: 1,
  });
  return result.data[0] ?? null;
}

async function findExistingPrice(productId: string, pricePence: number) {
  const prices = await stripe.prices.list({
    product: productId,
    active: true,
    limit: 100,
  });
  return prices.data.find(
    (p) =>
      p.unit_amount === pricePence &&
      p.currency === 'gbp' &&
      p.type === 'one_time',
  );
}

async function run() {
  if (!process.env.STRIPE_SECRET) throw new Error('STRIPE_SECRET not set');

  const bundle = await db.bundle.findUnique({ where: { slug: slug! } });
  if (!bundle) throw new Error(`Bundle not found: ${slug}`);

  const listingImages = [
    bundle.listingHeroUrl,
    bundle.listingPageGrid1Url,
    bundle.listingPageGrid2Url,
    bundle.listingPageGrid3Url,
    bundle.listingBrandCardUrl,
  ].filter((u): u is string => Boolean(u));

  if (listingImages.length === 0) {
    throw new Error(
      `Bundle has no listing images yet — generate them first via build-listing-* scripts.`,
    );
  }

  console.log(`[stripe] bundle: ${bundle.name} (${bundle.slug})`);
  console.log(
    `[stripe]   price: £${(bundle.pricePence / 100).toFixed(2)} ${bundle.currency.toUpperCase()}`,
  );
  console.log(`[stripe]   listing images: ${listingImages.length}`);

  if (dry) {
    console.log('[stripe] DRY RUN — no Stripe API calls');
    await db.$disconnect();
    return;
  }

  const existingProduct = await findExistingProduct(bundle.slug);

  const productData = {
    name: bundle.name,
    description: buildDescription(bundle.name, bundle.tagline),
    images: listingImages.slice(0, 8), // Stripe caps at 8
    metadata: {
      bundleSlug: bundle.slug,
      bundleId: bundle.id,
      pageCount: String(bundle.pageCount),
      brand: bundle.brand,
    },
    tax_code: 'txcd_10000000', // General — Services (digital good)
  };

  let product: Awaited<ReturnType<typeof stripe.products.retrieve>>;
  if (existingProduct) {
    console.log(`[stripe] updating existing product ${existingProduct.id}`);
    product = await stripe.products.update(existingProduct.id, productData);
  } else {
    console.log('[stripe] creating new product...');
    product = await stripe.products.create(productData);
    console.log(`[stripe]   created ${product.id}`);
  }

  // Look for existing matching Price. If found, reuse. If not, create.
  let price = await findExistingPrice(product.id, bundle.pricePence);
  if (price) {
    console.log(`[stripe] reusing existing price ${price.id}`);
  } else {
    // If a different active price exists, archive it before creating new
    // (Stripe doesn't let you mutate Prices, only deactivate + create).
    const allPrices = await stripe.prices.list({
      product: product.id,
      active: true,
      limit: 100,
    });
    for (const p of allPrices.data) {
      console.log(
        `[stripe]   archiving stale price ${p.id} (${p.unit_amount}p)`,
      );
      await stripe.prices.update(p.id, { active: false });
    }

    console.log('[stripe] creating new price...');
    price = await stripe.prices.create({
      product: product.id,
      unit_amount: bundle.pricePence,
      currency: bundle.currency,
      metadata: {
        bundleSlug: bundle.slug,
        bundleId: bundle.id,
      },
    });
    console.log(`[stripe]   created ${price.id}`);
  }

  await db.bundle.update({
    where: { id: bundle.id },
    data: {
      stripeProductId: product.id,
      stripePriceId: price.id,
    },
  });
  console.log(
    '[stripe] Bundle row updated with stripeProductId + stripePriceId',
  );

  if (skipCheckout) {
    await db.$disconnect();
    return;
  }

  // Smoke test — generate a test Checkout Session URL so we can buy it
  // ourselves end-to-end. We don't persist the session anywhere; this
  // is purely a "click this link to verify the flow works" output.
  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    line_items: [{ price: price.id, quantity: 1 }],
    success_url: `https://chunkycrayon.com/products/digital/${bundle.slug}/thank-you?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `https://chunkycrayon.com/products/digital/${bundle.slug}`,
    metadata: {
      bundleSlug: bundle.slug,
      bundleId: bundle.id,
    },
  });

  console.log('\n[stripe] ✅ Smoke-test Checkout URL (test mode):');
  console.log(`   ${session.url}`);
  console.log(
    '\n   Open in browser, use 4242 4242 4242 4242 with any future date + CVC.',
  );

  await db.$disconnect();
}

run().catch((e) => {
  console.error('[stripe]', e);
  db.$disconnect();
  process.exit(1);
});

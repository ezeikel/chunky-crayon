import { cacheLife, cacheTag } from 'next/cache';
import { db } from '@one-colored-pixel/db';
import { getBundleProfile } from '@one-colored-pixel/coloring-core';
import { BRAND } from '@/lib/db';

/**
 * Public-facing bundle data layer. All reads are cached aggressively
 * because bundle content (name, tagline, listing images, price) only
 * changes via deliberate admin action — much like ColoringImage.
 *
 * cacheLife('max') = 1 week cache, 30 day expiration. We invalidate via
 * cacheTag when a bundle is updated (admin endpoint will revalidateTag
 * once it exists).
 */

export type PublicBundle = {
  id: string;
  slug: string;
  name: string;
  tagline: string;
  pageCount: number;
  pricePence: number;
  currency: string;
  stripePriceId: string | null;
  // Listing images — already 1200x1200 JPEG on R2.
  listingHeroUrl: string | null;
  listingPageGrid1Url: string | null;
  listingPageGrid2Url: string | null;
  listingPageGrid3Url: string | null;
  listingBrandCardUrl: string | null;
};

/**
 * List every published bundle for the current brand, ordered by most
 * recently published. Drives /bundles index. Excludes drafts.
 */
export async function listPublishedBundles(): Promise<PublicBundle[]> {
  'use cache';
  cacheLife('max');
  cacheTag('bundles', 'bundles-list');

  const rows = await db.bundle.findMany({
    where: { brand: BRAND, published: true },
    orderBy: { publishedAt: 'desc' },
    select: {
      id: true,
      slug: true,
      name: true,
      tagline: true,
      pageCount: true,
      pricePence: true,
      currency: true,
      stripePriceId: true,
      listingHeroUrl: true,
      listingPageGrid1Url: true,
      listingPageGrid2Url: true,
      listingPageGrid3Url: true,
      listingBrandCardUrl: true,
    },
  });
  return rows;
}

/**
 * Fetch a single published bundle by slug for the brand. Returns null
 * if the bundle is draft, missing, or belongs to a different brand.
 */
export async function getPublishedBundle(
  slug: string,
): Promise<PublicBundle | null> {
  'use cache';
  cacheLife('max');
  cacheTag('bundles', `bundle-${slug}`);

  const row = await db.bundle.findFirst({
    where: { slug, brand: BRAND, published: true },
    select: {
      id: true,
      slug: true,
      name: true,
      tagline: true,
      pageCount: true,
      pricePence: true,
      currency: true,
      stripePriceId: true,
      listingHeroUrl: true,
      listingPageGrid1Url: true,
      listingPageGrid2Url: true,
      listingPageGrid3Url: true,
      listingBrandCardUrl: true,
    },
  });
  return row;
}

/**
 * Variant of getPublishedBundle that ignores the published flag — used
 * by admin preview routes so unpublished bundles can be staged before
 * the buy button is wired up. Public callers MUST use the published
 * version above.
 */
export async function getBundleForAdminPreview(
  slug: string,
): Promise<PublicBundle | null> {
  'use cache';
  cacheLife('hours');
  cacheTag('bundles', `bundle-${slug}-admin`);

  const row = await db.bundle.findFirst({
    where: { slug, brand: BRAND },
    select: {
      id: true,
      slug: true,
      name: true,
      tagline: true,
      pageCount: true,
      pricePence: true,
      currency: true,
      stripePriceId: true,
      listingHeroUrl: true,
      listingPageGrid1Url: true,
      listingPageGrid2Url: true,
      listingPageGrid3Url: true,
      listingBrandCardUrl: true,
    },
  });
  return row;
}

/**
 * Helper used in route handlers + product page UI to assemble the array
 * of listing images in carousel order, dropping any null URLs.
 */
export function listingImagesForBundle(bundle: PublicBundle): string[] {
  return [
    bundle.listingHeroUrl,
    bundle.listingPageGrid1Url,
    bundle.listingPageGrid2Url,
    bundle.listingPageGrid3Url,
    bundle.listingBrandCardUrl,
  ].filter((u): u is string => Boolean(u));
}

export type ThankYouPurchase = {
  /** BundlePurchase id — used to construct download tokens. */
  id: string;
  /** When refunded, the page shows a refund-state message instead of
   *  the download CTA. */
  refundedAt: Date | null;
  /** Snapshot price + currency at purchase time. */
  pricePence: number;
  currency: string;
  /** Bundle metadata needed to render the page. */
  bundle: {
    slug: string;
    name: string;
    tagline: string;
    pageCount: number;
    listingHeroUrl: string | null;
  };
  /** Buyer — used for the "Thanks, {firstName}!" greeting + auth check. */
  user: {
    id: string;
    email: string | null;
    name: string | null;
  };
};

/**
 * Look up the purchase Stripe redirected to via success_url. Stripe
 * fires checkout.session.completed asynchronously (typically within a
 * second or two), so the row may not exist yet when the buyer hits
 * the success page. Returning null lets the page render a "processing"
 * fallback that auto-refreshes.
 *
 * Not cached — each session id is unique to a single purchase, and
 * cache-by-session-id would just inflate the cache for one-time hits.
 */
export async function getBundlePurchaseBySessionId(
  sessionId: string,
): Promise<ThankYouPurchase | null> {
  return db.bundlePurchase.findUnique({
    where: { stripeCheckoutSessionId: sessionId },
    select: {
      id: true,
      refundedAt: true,
      pricePence: true,
      currency: true,
      bundle: {
        select: {
          slug: true,
          name: true,
          tagline: true,
          pageCount: true,
          listingHeroUrl: true,
        },
      },
      user: { select: { id: true, email: true, name: true } },
    },
  });
}

export type BundleCastMember = {
  id: string;
  name: string;
  species: string;
  imageUrl: string;
  funFact: string;
};

/**
 * If the hero has a hand-written funFact, use it. Otherwise format the
 * first signatureDetail into a sentence so we always have *something* to
 * show on the cast switcher. signatureDetails are written for the QA
 * prompt (lowercase, descriptive) so we capitalise + add a period.
 */
function deriveFunFact(hero: {
  name: string;
  funFact?: string;
  signatureDetails: readonly string[];
}): string {
  if (hero.funFact) return hero.funFact;
  const first = hero.signatureDetails[0];
  if (!first) return '';
  const capitalised = first.charAt(0).toUpperCase() + first.slice(1);
  return `${hero.name} has ${capitalised.toLowerCase()}.`;
}

/**
 * Build the "Meet the cast" data for a bundle by combining the static
 * hero profile (id/name/species lives in @one-colored-pixel/coloring-core)
 * with the transparent PNG URL on R2. Returns [] for bundles that don't
 * have a hero profile registered yet.
 *
 * Image path convention is set by scripts/remove-bundle-hero-backgrounds.ts:
 * `bundles/{slug}/hero-refs/{heroId}-transparent.png`. Run that script
 * after a bundle's hero refs are seeded so this URL resolves.
 */
export function bundleHeroesForCast(slug: string): BundleCastMember[] {
  const profile = getBundleProfile(slug);
  if (!profile) return [];

  const r2Public = process.env.R2_PUBLIC_URL;
  if (!r2Public) return [];

  return profile.heroes.map((hero) => ({
    id: hero.id,
    name: hero.name,
    species: hero.species,
    imageUrl: `${r2Public}/bundles/${slug}/hero-refs/${hero.id}-transparent.png`,
    funFact: deriveFunFact(hero),
  }));
}

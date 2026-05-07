import { cacheLife, cacheTag } from 'next/cache';
import { db } from '@one-colored-pixel/db';
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

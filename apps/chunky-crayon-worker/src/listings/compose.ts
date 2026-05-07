/**
 * Compose + persist a listing image variant. Renders the JSX template via
 * Satori, rasterises via sharp, uploads to R2, and updates the matching
 * field on the Bundle row.
 *
 * Today supports BrandCard. Hero + PageGrid templates land next.
 */

import sharp from "sharp";
import { db } from "@one-colored-pixel/db";
import { put } from "@one-colored-pixel/storage";
import { LISTING_SIZE } from "./palette";
import { loadFonts } from "./fonts";
import { loadAssets } from "./assets";
import { renderBrandCard } from "./templates/BrandCard";
import { renderHero } from "./templates/Hero";
import { renderPageGrid } from "./templates/PageGrid";
import { loadBundlePageThumbnails } from "./page-thumbnails";

export type ListingVariant =
  | "hero"
  | "pageGrid1"
  | "pageGrid2"
  | "pageGrid3"
  | "brandCard";

const VARIANT_TO_FIELD: Record<ListingVariant, string> = {
  hero: "listingHeroUrl",
  pageGrid1: "listingPageGrid1Url",
  pageGrid2: "listingPageGrid2Url",
  pageGrid3: "listingPageGrid3Url",
  brandCard: "listingBrandCardUrl",
};

export type ComposeBrandCardOptions = {
  bundleSlug: string;
  bundleId: string;
  bundleName: string;
  /** R2 URL of the polished colored bundle character. Null = fall back to Colo. */
  brandCharacterUrl?: string | null;
};

export type ComposeResult = {
  variant: ListingVariant;
  url: string;
  bytes: number;
};

async function rasterise(svg: string): Promise<Buffer> {
  // density=144 because Satori produces SVG at logical px and Sharp's
  // default 72 DPI rasterisation washes out fine type. 144 keeps text
  // crisp at the rendered LISTING_SIZE.
  return sharp(Buffer.from(svg), { density: 144 })
    .resize(LISTING_SIZE, LISTING_SIZE)
    .jpeg({ quality: 90, mozjpeg: true })
    .toBuffer();
}

async function uploadAndPersist(
  bundleId: string,
  bundleSlug: string,
  variant: ListingVariant,
  imageBuffer: Buffer,
): Promise<ComposeResult> {
  const key = `bundles/${bundleSlug}/listings/${variant}.jpg`;
  const { url } = await put(key, imageBuffer, {
    access: "public",
    contentType: "image/jpeg",
    allowOverwrite: true,
  });
  await db.bundle.update({
    where: { id: bundleId },
    data: { [VARIANT_TO_FIELD[variant]]: url },
  });
  return { variant, url, bytes: imageBuffer.length };
}

export type ComposeHeroOptions = {
  bundleSlug: string;
  bundleId: string;
  bundleName: string;
  tagline: string;
  pageCount: number;
  /** Optional Wyo-style prefix shown above the bundle name. */
  bundlePrefix?: string;
};

export async function composeHero(
  opts: ComposeHeroOptions,
): Promise<ComposeResult> {
  const [fonts, assets, thumbnails] = await Promise.all([
    loadFonts(),
    loadAssets(),
    loadBundlePageThumbnails(opts.bundleId),
  ]);

  if (thumbnails.length === 0) {
    throw new Error(
      `[hero] no page thumbnails found for bundle ${opts.bundleSlug} — generate pages first`,
    );
  }

  const svg = await renderHero({
    bundleName: opts.bundleName,
    bundlePrefix: opts.bundlePrefix,
    tagline: opts.tagline,
    pageCount: opts.pageCount,
    bgDataUri: assets.tiledBackgroundDataUri,
    ccLogoDataUri: assets.ccLogoDataUri,
    thumbnails,
    fonts,
  });
  const png = await rasterise(svg);
  return uploadAndPersist(opts.bundleId, opts.bundleSlug, "hero", png);
}

export type ComposePageGridOptions = {
  bundleSlug: string;
  bundleId: string;
  bundleName: string;
  /** 1, 2, or 3. Drives which 4-page slice + which DB field to update. */
  sheetIndex: 1 | 2 | 3;
};

const PAGE_GRID_FIELD: Record<
  1 | 2 | 3,
  "pageGrid1" | "pageGrid2" | "pageGrid3"
> = {
  1: "pageGrid1",
  2: "pageGrid2",
  3: "pageGrid3",
};

const SHEET_RANGES: Record<1 | 2 | 3, [number, number]> = {
  1: [1, 4], // pages 1-4
  2: [5, 8], // pages 5-8
  3: [9, 10], // pages 9-10 (last sheet has 2 + decoration)
};

export async function composePageGrid(
  opts: ComposePageGridOptions,
): Promise<ComposeResult> {
  const [fonts, assets, allThumbnails] = await Promise.all([
    loadFonts(),
    loadAssets(),
    loadBundlePageThumbnails(opts.bundleId),
  ]);

  const [from, to] = SHEET_RANGES[opts.sheetIndex];
  const slice = allThumbnails.filter(
    (t) => t.bundleOrder >= from && t.bundleOrder <= to,
  );
  if (slice.length === 0) {
    throw new Error(
      `[pageGrid] no thumbnails for sheet ${opts.sheetIndex} (pages ${from}-${to}) of ${opts.bundleSlug}`,
    );
  }

  const svg = await renderPageGrid({
    bundleName: opts.bundleName,
    bgDataUri: assets.tiledBackgroundDataUri,
    ccLogoDataUri: assets.ccLogoDataUri,
    thumbnails: slice,
    sheetIndex: opts.sheetIndex,
    totalSheets: 3,
    fonts,
  });
  const png = await rasterise(svg);
  return uploadAndPersist(
    opts.bundleId,
    opts.bundleSlug,
    PAGE_GRID_FIELD[opts.sheetIndex],
    png,
  );
}

export async function composeBrandCard(
  opts: ComposeBrandCardOptions,
): Promise<ComposeResult> {
  const [fonts, assets] = await Promise.all([loadFonts(), loadAssets()]);

  // Prefer the bundle's polished colored character (e.g. Rex for
  // Dino Dance Party). Fall back to Colo if not generated yet.
  let characterDataUri = assets.coloWelcomeDataUri;
  if (opts.brandCharacterUrl) {
    const res = await fetch(opts.brandCharacterUrl);
    if (res.ok) {
      const buf = Buffer.from(await res.arrayBuffer());
      const mime = opts.brandCharacterUrl.endsWith(".png")
        ? "image/png"
        : opts.brandCharacterUrl.endsWith(".webp")
          ? "image/webp"
          : "image/png";
      characterDataUri = `data:${mime};base64,${buf.toString("base64")}`;
    } else {
      console.warn(
        `[brand-card] failed to fetch brandCharacterUrl (${res.status}), falling back to Colo`,
      );
    }
  }

  const svg = await renderBrandCard({
    bundleName: opts.bundleName,
    bgDataUri: assets.tiledBackgroundDataUri,
    characterDataUri,
    ccLogoDataUri: assets.ccLogoDataUri,
    fonts,
  });
  const png = await rasterise(svg);
  return uploadAndPersist(opts.bundleId, opts.bundleSlug, "brandCard", png);
}

/**
 * Batch generator: produce all 10 pages of a bundle sequentially.
 *
 * Sequential, not parallel, on purpose:
 *   - OpenAI rate limits are real
 *   - Cheaper to fail-fast on auth/config issues at page 1
 *   - Predictable Sentry breadcrumbs
 *
 * Idempotent per page — if a page already exists with status READY, skip
 * unless `forceRegenerate=true`. FAILED rows aren't currently created
 * (generate-page throws instead) but if we ever change that, this still
 * regenerates them.
 */

import { db } from "@one-colored-pixel/db";
import { generateBundlePage, BundlePageQAFailedError } from "./generate-page";
import type { HeroBundle } from "@one-colored-pixel/coloring-core";

export type GenerateAllPagesOptions = {
  bundle: HeroBundle;
  bundleId: string;
  pagePrompts: readonly string[]; // length === bundle.pageCount, indexed 0-based for page 1-N
  heroRefsBaseUrl: string;
  startFrom?: number; // 1-indexed; defaults to 1
  stopAt?: number; // 1-indexed inclusive; defaults to bundle.pageCount
  forceRegenerate?: boolean;
};

export type PageRunResult = {
  pageNumber: number;
  status: "GENERATED" | "SKIPPED_EXISTING" | "FAILED";
  coloringImageId?: string;
  attempts?: number;
  topIssue?: string | null;
  errorMessage?: string;
};

export type GenerateAllPagesResult = {
  bundleSlug: string;
  generated: number;
  skipped: number;
  failed: number;
  pages: PageRunResult[];
};

export async function generateAllBundlePages({
  bundle,
  bundleId,
  pagePrompts,
  heroRefsBaseUrl,
  startFrom = 1,
  stopAt,
  forceRegenerate = false,
}: GenerateAllPagesOptions): Promise<GenerateAllPagesResult> {
  const last = stopAt ?? pagePrompts.length;
  const results: PageRunResult[] = [];

  for (let pageNumber = startFrom; pageNumber <= last; pageNumber++) {
    const pagePrompt = pagePrompts[pageNumber - 1];
    if (!pagePrompt) {
      results.push({
        pageNumber,
        status: "FAILED",
        errorMessage: `No prompt for page ${pageNumber}`,
      });
      continue;
    }

    if (!forceRegenerate) {
      const existing = await db.coloringImage.findFirst({
        where: {
          bundleId,
          bundleOrder: pageNumber,
          status: "READY",
        },
        select: { id: true },
      });
      if (existing) {
        console.log(
          `[bundle-all] page ${pageNumber} already READY (${existing.id}), skipping`,
        );
        results.push({
          pageNumber,
          status: "SKIPPED_EXISTING",
          coloringImageId: existing.id,
        });
        continue;
      }
    }

    try {
      const result = await generateBundlePage({
        bundle,
        bundleId,
        pageNumber,
        pagePrompt,
        heroRefsBaseUrl,
      });
      results.push({
        pageNumber,
        status: "GENERATED",
        coloringImageId: result.coloringImageId,
        attempts: result.qaAttempts,
        topIssue: result.qaTopIssue,
      });
    } catch (err) {
      if (err instanceof BundlePageQAFailedError) {
        console.error(
          `[bundle-all] page ${pageNumber} QA-failed after retries: ${err.lastQA.topIssue}`,
        );
        results.push({
          pageNumber,
          status: "FAILED",
          attempts: 3,
          topIssue: err.lastQA.topIssue,
          errorMessage: `QA exhausted: ${err.lastQA.topIssue ?? "see logs"}`,
        });
      } else {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(`[bundle-all] page ${pageNumber} threw:`, msg);
        results.push({
          pageNumber,
          status: "FAILED",
          errorMessage: msg,
        });
      }
    }
  }

  const generated = results.filter((r) => r.status === "GENERATED").length;
  const skipped = results.filter((r) => r.status === "SKIPPED_EXISTING").length;
  const failed = results.filter((r) => r.status === "FAILED").length;

  console.log(
    `[bundle-all] ${bundle.slug} done — generated=${generated} skipped=${skipped} failed=${failed}`,
  );

  return {
    bundleSlug: bundle.slug,
    generated,
    skipped,
    failed,
    pages: results,
  };
}

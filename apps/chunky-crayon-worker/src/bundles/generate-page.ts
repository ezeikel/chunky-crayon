/**
 * Per-page bundle generation with QA-gated retry loop.
 *
 * Algorithm per page:
 *   1. Build reference set: hero refs (from R2) + 4 brand style refs
 *      (existing REFERENCE_IMAGES from web app's prompt config)
 *   2. Call gpt-image-2 images.edit with up to 16 refs
 *   3. Run Opus 4.7 QA gate
 *   4. If pass: persist as ColoringImage (bundleId/bundleOrder/purposeKey)
 *   5. If fail and attempts < 3: augment prompt with QA top issue, retry
 *   6. If fail after MAX_QA_RETRIES attempts: throw — caller logs to admin queue
 *
 * Retry feedback loop matters: gpt-image-2 isn't deterministic, so the
 * same prompt rerun with QA's top-issue appended ("missing wrist bands")
 * often clears on attempt 2. Without feedback we'd just keep generating
 * the same broken result.
 */

import OpenAI from "openai";
import {
  qaBundlePage,
  type HeroBundle,
  type QAResult,
} from "@one-colored-pixel/coloring-core";
import { put } from "@one-colored-pixel/storage";
import { persistBundlePage } from "./persist";

// Brand style references — copied from apps/chunky-crayon-web/lib/ai/prompts.ts
// REFERENCE_IMAGES. The worker can't import from the web app, so the URLs
// are inlined. If they ever rotate, update both places.
const BRAND_STYLE_REFS = [
  "https://assets.chunkycrayon.com/reference-images/birthdays-8uiLmIVecHAw1yjqNRQ2OCYHoaa8gW.webp",
  "https://assets.chunkycrayon.com/reference-images/dinosaur-bfmBtp1o0kVeIZtuVVNhmKTMJXOgS7.webp",
  "https://assets.chunkycrayon.com/reference-images/family-and-friends-g4vlGFNcWXrcHQ7sB4y8LLYiO3PIAG.webp",
  "https://assets.chunkycrayon.com/reference-images/farm-animals-knAdbOJKhulPhb7xnaCkMXycTunbNi.webp",
] as const;

// GPT_IMAGE_STYLE_BLOCK — copied from web's lib/ai/prompts.ts. Same reason
// as BRAND_STYLE_REFS: worker can't reach into the web app.
const GPT_IMAGE_STYLE_BLOCK = `Style: children's coloring book page, clean line art, thick black outlines on a pure white background.
Medium: thick black ink outlines only, completely unfilled, white interior on every shape.
Audience: simple enough for a child aged 3-8 years old to color with chunky crayons.

Composition: a single centered subject with a simple, relevant background. Large shapes, minimal detail, maximum 5-7 distinct colorable areas. Every element drawn with bold, uniform-weight outlines.

Characters: cartoon-like, friendly, approachable faces. Hair and fur rendered as simple flowing lines. All clothing and accessories drawn as outlines only, matching the same line weight.

Technical: high contrast between black outlines and white space. Every enclosed shape left completely white and unfilled. Smooth, continuous line work suitable for printing on standard paper. No duplicate elements unless the description asks for them.

Outlines must be CLOSED CONTOURS — every shape is fully sealed, with no breaks, gaps, or unconnected line endings. Where one region meets another, the boundary line is unbroken from end to end. This is critical: every region must be fully enclosed so the page can be filled in cleanly without colour bleeding across shapes.

My prompt has full detail so no need to add more.`;

const MODEL_ID = "gpt-image-2";
// 5 attempts at strict QA. Bundle generation cost is amortised across
// every sale of the bundle; strict identity consistency matters more than
// per-page generation cost.
const MAX_QA_RETRIES = 5;
const SIZE = "1024x1024" as const;

async function fetchAsFile(url: string, name: string): Promise<File> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Reference image fetch failed (${res.status}) for ${url}`);
  }
  const buf = await res.arrayBuffer();
  const ext = url.endsWith(".webp")
    ? "webp"
    : url.endsWith(".png")
      ? "png"
      : "png";
  return new File([buf], `${name}.${ext}`, { type: `image/${ext}` });
}

/**
 * Build the prompt fed to gpt-image-2. On retries, augment with the
 * previous attempt's QA failure so the model knows what to fix.
 */
function buildScenePrompt(
  pagePrompt: string,
  bundle: HeroBundle,
  pageNumber: number,
  prevQA?: QAResult,
): string {
  const heroIds = bundle.pageCast[pageNumber] ?? [];
  const heroes = heroIds
    .map((id) => bundle.heroes.find((h) => h.id === id))
    .filter((h): h is NonNullable<typeof h> => h !== undefined);

  const continuityBlock = heroes.length
    ? `\n\nCharacter continuity — the following recurring characters MUST match their reference images exactly:\n${heroes
        .map(
          (h) =>
            `- ${h.name} (${h.species}): ${h.signatureDetails.join("; ")}.`,
        )
        .join(
          "\n",
        )}\n\nThese are the same characters appearing across multiple pages of this coloring book; preserve every signature detail.`
    : "";

  // Retry block is emphatic + count-explicit because gpt-image-2 routinely
  // ignores soft "fix this" instructions. We need it to override its prior
  // visual habits, which means short, repetitive, count-loud language that
  // matches what the QA gate is checking. "Three" gets repeated; "EXACTLY"
  // gets capitalised; the failure-mode reason is included so the model
  // knows what its prior output looked like wrong.
  const failedDetails = prevQA
    ? prevQA.heroChecks.flatMap((hc) =>
        hc.signatureDetails
          .filter((d) => !d.present)
          .map((d) => ({
            heroId: hc.heroId,
            detail: d.detail,
            notes: d.notes,
          })),
      )
    : [];

  const retryBlock = prevQA
    ? `\n\nCRITICAL FIX REQUIRED — previous render was rejected. ${prevQA.topIssue ?? ""}\n\nThe following details were rendered WRONG and MUST be fixed in this regeneration:\n${failedDetails
        .map(
          (f) =>
            `- ${f.heroId}: render this EXACTLY as specified — "${f.detail}". Previous attempt was wrong because: ${f.notes}. Render it correctly this time, paying close attention to specific counts and anatomy.`,
        )
        .join(
          "\n",
        )}\n\nCount carefully. Match the character reference sheets exactly for these details — the same number of features, the same shapes, the same anatomy. Do not embellish.`
    : "";

  return `Scene: ${pagePrompt}${continuityBlock}${retryBlock}\n\n${GPT_IMAGE_STYLE_BLOCK}`;
}

export type GenerateBundlePageOptions = {
  bundle: HeroBundle;
  bundleId: string; // Bundle.id from DB
  pageNumber: number; // 1-indexed
  pagePrompt: string; // page-specific scene description
  /** Base R2 URL pattern for hero refs: e.g. https://x.r2.dev/bundles/{slug}/hero-refs */
  heroRefsBaseUrl: string;
};

export type AttemptDebugRecord = {
  attempt: number;
  url: string; // R2 debug URL for this attempt's raw output
  passed: boolean;
  topIssue: string | null;
  /**
   * The full styled prompt sent to gpt-image-2 for this attempt. Lets us
   * post-mortem which retry-feedback patterns actually moved the model
   * (vs which ones produced visually-identical re-rolls).
   */
  prompt: string;
};

export type GenerateBundlePageResult = {
  coloringImageId: string;
  url: string;
  svgUrl: string;
  qaPassed: boolean;
  qaAttempts: number;
  qaTopIssue: string | null;
  /** Per-attempt R2 URLs for diagnostic inspection. */
  attemptUrls: AttemptDebugRecord[];
};

/**
 * Generate one bundle page with QA-gated retry. Returns the persisted row
 * if QA passes within MAX_QA_RETRIES, otherwise throws with the last QA
 * verdict.
 */
export async function generateBundlePage({
  bundle,
  bundleId,
  pageNumber,
  pagePrompt,
  heroRefsBaseUrl,
}: GenerateBundlePageOptions): Promise<GenerateBundlePageResult> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is not set");
  }

  const heroIds = bundle.pageCast[pageNumber] ?? [];
  const client = new OpenAI();

  // Resolve hero ref images once at the top — reused across QA retries
  // since the refs don't change per attempt.
  const heroRefFiles: File[] = await Promise.all(
    heroIds.map((id) =>
      fetchAsFile(`${heroRefsBaseUrl}/${id}.png`, `hero-${id}`),
    ),
  );
  const groupRef =
    heroIds.length > 1
      ? await fetchAsFile(`${heroRefsBaseUrl}/group.png`, "hero-group").catch(
          () => null,
        )
      : null;

  // Brand style refs — pre-fetched once; reused across retries.
  const styleRefFiles: File[] = await Promise.all(
    BRAND_STYLE_REFS.map((url, i) => fetchAsFile(url, `style-${i}`)),
  );

  // Hero ref Buffers for the QA gate (separate from File objects above).
  const heroRefBuffers = await Promise.all(
    heroIds.map(async (id) => ({
      heroId: id,
      image: Buffer.from(
        await (await fetch(`${heroRefsBaseUrl}/${id}.png`)).arrayBuffer(),
      ),
    })),
  );

  const refImages: File[] = [
    ...heroRefFiles,
    ...(groupRef ? [groupRef] : []),
    ...styleRefFiles,
  ];
  // OpenAI cap: 16 refs. We'll never exceed this with ≤2 heroes per page +
  // group + 4 style refs = 7 max, but assert to make the constraint explicit.
  if (refImages.length > 16) {
    throw new Error(
      `[bundle-gen] ref count ${refImages.length} exceeds OpenAI limit of 16`,
    );
  }

  let lastQA: QAResult | undefined;
  let imageBuffer: Buffer | undefined;
  // Track every attempt's R2 URL + QA verdict so we can surface them on
  // failure (humans want to see what was rejected, not just be told it
  // failed). Pass-through attempt is also uploaded for archival.
  const attemptUrls: AttemptDebugRecord[] = [];

  for (let attempt = 1; attempt <= MAX_QA_RETRIES; attempt++) {
    console.log(
      `[bundle-gen] page ${pageNumber} of ${bundle.slug} — attempt ${attempt}/${MAX_QA_RETRIES} (refs=${refImages.length})`,
    );

    const scene = buildScenePrompt(pagePrompt, bundle, pageNumber, lastQA);
    const styledPrompt = `The provided images are character reference sheets and brand style references. The characters drawn on this page MUST match their reference sheets — same body shapes, same signature details, same friendly faces.\n\n${scene}`;

    const start = Date.now();
    const result = await client.images.edit({
      model: MODEL_ID,
      image: refImages,
      prompt: styledPrompt,
      size: SIZE,
      quality: "high",
    });
    const elapsed = ((Date.now() - start) / 1000).toFixed(1);
    console.log(`[bundle-gen]   gpt-image-2 done in ${elapsed}s`);

    const b64 = result.data?.[0]?.b64_json;
    if (!b64) {
      throw new Error(
        `[bundle-gen] gpt-image-2 returned no image (page ${pageNumber}, attempt ${attempt})`,
      );
    }
    imageBuffer = Buffer.from(b64, "base64");

    // Upload every attempt to R2 under a debug path. Lets us inspect
    // what was rejected even when the final persist never runs. Path is
    // segregated from the canonical persisted-page path so a failed
    // attempt never gets mistaken for a shipped page.
    const debugPath = `bundles/${bundle.slug}/qa-debug/page-${pageNumber}-attempt-${attempt}.png`;
    const { url: debugUrl } = await put(debugPath, imageBuffer, {
      access: "public",
      contentType: "image/png",
      allowOverwrite: true,
    });

    const qaStart = Date.now();
    const qa = await qaBundlePage(
      imageBuffer,
      bundle,
      pageNumber,
      heroRefBuffers,
    );
    const qaElapsed = ((Date.now() - qaStart) / 1000).toFixed(1);
    console.log(
      `[bundle-gen]   QA in ${qaElapsed}s — ${qa.passed ? "PASS" : "FAIL: " + qa.topIssue} (debug: ${debugUrl})`,
    );

    attemptUrls.push({
      attempt,
      url: debugUrl,
      passed: qa.passed,
      topIssue: qa.topIssue,
      prompt: styledPrompt,
    });

    if (qa.passed) {
      const persisted = await persistBundlePage({
        bundleId,
        bundleSlug: bundle.slug,
        bundleOrder: pageNumber,
        imageBuffer,
        sourcePrompt: pagePrompt,
      });
      return {
        coloringImageId: persisted.coloringImageId,
        url: persisted.url,
        svgUrl: persisted.svgUrl,
        qaPassed: true,
        qaAttempts: attempt,
        qaTopIssue: null,
        attemptUrls,
      };
    }

    lastQA = qa;
    // loop continues with augmented prompt
  }

  // All retries exhausted — persist nothing, throw with last QA so caller
  // can log to admin queue. We deliberately don't write a FAILED row;
  // the caller decides whether to surface this in admin or just log.
  throw new BundlePageQAFailedError(
    pageNumber,
    bundle.slug,
    lastQA!,
    imageBuffer,
    attemptUrls,
  );
}

export class BundlePageQAFailedError extends Error {
  constructor(
    public readonly pageNumber: number,
    public readonly bundleSlug: string,
    public readonly lastQA: QAResult,
    public readonly lastImageBuffer: Buffer | undefined,
    public readonly attemptUrls: AttemptDebugRecord[] = [],
  ) {
    super(
      `[bundle-gen] Page ${pageNumber} of ${bundleSlug} failed QA after ${MAX_QA_RETRIES} attempts: ${lastQA.topIssue ?? "see hero checks"}`,
    );
    this.name = "BundlePageQAFailedError";
  }
}

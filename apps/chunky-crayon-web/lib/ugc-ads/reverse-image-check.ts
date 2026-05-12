/**
 * Reverse-image-search gate for persona PFPs.
 *
 * Why this exists: AI-generated faces sometimes collide with real images
 * in the model's training data. If a persona's PFP reverse-image-searches
 * to a real person's account, the persona is dead on arrival — anyone
 * running OSINT on the account spots it immediately, and the cross-link
 * risk goes up (the same generated face might already be in use by
 * another AI-creator builder).
 *
 * Provider: Google Vision Web Detection via the official
 * `@google-cloud/vision` SDK with service-account auth. Same pattern as
 * PTP's apps/web/app/actions/ocr.ts. Decision rationale + the alternative
 * options considered live in docs/ugc-ads/README.md.
 *
 * The check is a HARD GATE in the persona-launch script: a full-match
 * hit throws. The orchestrator catches the throw and retries with a
 * regenerated PFP (up to N times), then warns the operator and stops.
 * Silent-pass on API failures is forbidden — if we can't verify the PFP
 * we don't ship the persona.
 *
 * Credentials note (v1): GOOGLE_APPLICATION_CREDENTIALS_BASE64 is
 * currently a service account from PTP's `pcn-ai` GCP project. Before
 * scaling beyond a few personas we should provision a dedicated CC GCP
 * project — flagged with a TODO in .env.local.
 */

import { ImageAnnotatorClient, type protos } from '@google-cloud/vision';

// ─────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────

export type ReverseImageHit = {
  /** URL of the matching image somewhere on the web. */
  url: string;
  /** Match strength — full = identical pixels, partial = similar but not exact. */
  source: 'full' | 'partial';
  /** Optional page URL (when Google attributes a page, not just an image). */
  pageUrl?: string;
};

export type ReverseImageResult = {
  /** Hard-fail signals — exact image matches. Any entry here = persona is dead. */
  fullMatches: ReverseImageHit[];
  /**
   * Soft-warning signals — close-but-not-identical images. Common with AI
   * faces (the model saw similar training data); on its own, doesn't kill
   * the persona but is worth surfacing to the operator for review.
   */
  partialMatches: ReverseImageHit[];
  /** Raw count fields, useful for logs without iterating the arrays. */
  fullCount: number;
  partialCount: number;
};

// ─────────────────────────────────────────────────────────────────────
// Client — lazy-initialized so importing this module doesn't crash when
// the env var is missing (only fails at call time).
// ─────────────────────────────────────────────────────────────────────

let _client: ImageAnnotatorClient | null = null;

function getVisionClient(): ImageAnnotatorClient {
  if (_client) return _client;

  const credentialsBase64 = process.env.GOOGLE_APPLICATION_CREDENTIALS_BASE64;
  if (!credentialsBase64) {
    throw new Error(
      '[ugc-rev-image] GOOGLE_APPLICATION_CREDENTIALS_BASE64 not set — PFP gate cannot run, refusing to silently skip',
    );
  }

  const serviceAccountJson = JSON.parse(
    Buffer.from(credentialsBase64, 'base64').toString('utf8'),
  ) as Record<string, string>;

  _client = new ImageAnnotatorClient({
    credentials: serviceAccountJson,
  });
  return _client;
}

// ─────────────────────────────────────────────────────────────────────
// Core call
// ─────────────────────────────────────────────────────────────────────

type WebDetection = protos.google.cloud.vision.v1.IWebDetection;

/**
 * Run Google Vision Web Detection against a publicly-fetchable image URL.
 *
 * Pass the persona's PFP **R2 URL** (already mirrored from Higgsfield's
 * CDN to our R2 by the still generator). Google Vision needs to GET the
 * image so it has to be public — our R2 public URL works.
 *
 * Throws on:
 *   - missing GOOGLE_APPLICATION_CREDENTIALS_BASE64
 *   - per-image `error` field in the response (Google sometimes returns
 *     success with a per-image error nested inside).
 *
 * Returns the structured result even when the image is clean. Callers
 * decide whether to fail on `fullMatches`.
 */
export async function reverseImageSearch(
  imageUrl: string,
): Promise<ReverseImageResult> {
  const client = getVisionClient();

  const [response] = await client.webDetection({
    image: { source: { imageUri: imageUrl } },
  });

  if (response.error?.message) {
    throw new Error(
      `[ugc-rev-image] per-image error: ${response.error.code ?? '?'} ${response.error.message}`,
    );
  }

  const webDetection: WebDetection = response.webDetection ?? {};

  // Top-level full/partial — direct image matches.
  const fullMatches: ReverseImageHit[] = (
    webDetection.fullMatchingImages ?? []
  ).flatMap((h) => (h.url ? [{ url: h.url, source: 'full' as const }] : []));

  const partialMatches: ReverseImageHit[] = (
    webDetection.partialMatchingImages ?? []
  ).flatMap((h) => (h.url ? [{ url: h.url, source: 'partial' as const }] : []));

  // Page-level matches sometimes turn up matches the top-level fields miss
  // (Google nests them under the page that contains them). Merge those in
  // with the page URL attached so the operator can click through to see
  // the host.
  for (const page of webDetection.pagesWithMatchingImages ?? []) {
    for (const m of page.fullMatchingImages ?? []) {
      if (m.url) {
        fullMatches.push({
          url: m.url,
          source: 'full',
          pageUrl: page.url ?? undefined,
        });
      }
    }
    for (const m of page.partialMatchingImages ?? []) {
      if (m.url) {
        partialMatches.push({
          url: m.url,
          source: 'partial',
          pageUrl: page.url ?? undefined,
        });
      }
    }
  }

  return {
    fullMatches,
    partialMatches,
    fullCount: fullMatches.length,
    partialCount: partialMatches.length,
  };
}

// ─────────────────────────────────────────────────────────────────────
// Hard-gate helper — call site reads like a guardrail
// ─────────────────────────────────────────────────────────────────────

export class ReverseImageGateError extends Error {
  readonly hits: ReverseImageHit[];
  readonly imageUrl: string;
  constructor(imageUrl: string, hits: ReverseImageHit[]) {
    super(
      `[ugc-rev-image] PFP gate failed: ${hits.length} full match(es) for ${imageUrl}`,
    );
    this.name = 'ReverseImageGateError';
    this.hits = hits;
    this.imageUrl = imageUrl;
  }
}

/**
 * Guardrail: throws ReverseImageGateError if the PFP has any full-image
 * matches on the web. Used by the persona-launch script's retry loop —
 * the orchestrator catches this specific error, regenerates the PFP,
 * and re-runs the gate (up to N retries) before surfacing to operator.
 *
 * Partial matches are logged but NOT fatal — they're soft signals.
 */
export async function assertPfpIsUnique(
  imageUrl: string,
): Promise<ReverseImageResult> {
  const result = await reverseImageSearch(imageUrl);

  if (result.partialCount > 0) {
    console.warn(
      `[ugc-rev-image] PFP ${imageUrl} has ${result.partialCount} partial match(es) — soft signal, logged for review.`,
    );
  }

  if (result.fullCount > 0) {
    throw new ReverseImageGateError(imageUrl, result.fullMatches);
  }

  return result;
}

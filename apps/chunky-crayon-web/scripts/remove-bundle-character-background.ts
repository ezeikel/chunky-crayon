/**
 * Strip the white background from a bundle's brandCharacterUrl using
 * 851-labs/background-remover on Replicate. Outputs an RGBA PNG.
 *
 * Why we need this: gpt-image-2 doesn't support transparent backgrounds
 * natively. Our generated colored character (e.g. Rex) has a white bg
 * that creates a visible rectangle when composited onto the BrandCard's
 * cream tile background. A purpose-built bg-remover gives clean alpha.
 *
 * Cost: ~$0.0004 per call (T4 GPU, ~2s). Trivial.
 *
 * Usage:
 *   cd apps/chunky-crayon-web
 *   pnpm tsx -r dotenv/config scripts/remove-bundle-character-background.ts \
 *     --slug=dino-dance-party \
 *     dotenv_config_path=.env.local
 */

import { db } from '@one-colored-pixel/db';
import { put } from '@one-colored-pixel/storage';

const args = process.argv.slice(2);
const slug = args.find((a) => a.startsWith('--slug='))?.split('=')[1];
if (!slug) throw new Error('--slug=<bundle> required');

const REPLICATE_TOKEN = process.env.REPLICATE_API_TOKEN;
if (!REPLICATE_TOKEN) throw new Error('REPLICATE_API_TOKEN not set');

// 851-labs/background-remover — same model the OpenAI community thread
// recommends for this exact gpt-image-2 + transparent-bg workaround.
// Pinned to a known-good version hash so we don't drift if 851-labs ships
// a regression.
const MODEL_VERSION =
  'a029dff38972b5fda4ec5d75d7d1cd25aeff621d2cf4946a41055d7db66b80bc';

type ReplicatePrediction = {
  id: string;
  status: 'starting' | 'processing' | 'succeeded' | 'failed' | 'canceled';
  output?: string;
  error?: string;
};

async function startPrediction(imageUrl: string): Promise<string> {
  const res = await fetch('https://api.replicate.com/v1/predictions', {
    method: 'POST',
    headers: {
      Authorization: `Token ${REPLICATE_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      version: MODEL_VERSION,
      input: { image: imageUrl },
    }),
  });
  if (!res.ok) {
    throw new Error(
      `Replicate start failed: ${res.status} ${await res.text()}`,
    );
  }
  const json = (await res.json()) as ReplicatePrediction;
  return json.id;
}

async function pollPrediction(id: string): Promise<string> {
  // 60s budget. Background-remover usually completes in ~2-5s.
  const deadline = Date.now() + 60_000;
  while (Date.now() < deadline) {
    const res = await fetch(`https://api.replicate.com/v1/predictions/${id}`, {
      headers: { Authorization: `Token ${REPLICATE_TOKEN}` },
    });
    const json = (await res.json()) as ReplicatePrediction;
    if (json.status === 'succeeded') {
      if (!json.output) throw new Error('Succeeded but no output URL');
      return json.output;
    }
    if (json.status === 'failed' || json.status === 'canceled') {
      throw new Error(
        `Prediction ${json.status}: ${json.error ?? '(no error)'}`,
      );
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
  throw new Error('Prediction timed out after 60s');
}

async function run() {
  const bundle = await db.bundle.findUnique({
    where: { slug: slug! },
    select: { id: true, brandCharacterUrl: true },
  });
  if (!bundle) throw new Error(`Bundle not found: ${slug}`);
  if (!bundle.brandCharacterUrl) {
    throw new Error(
      `Bundle.brandCharacterUrl not set — generate the colored character first.`,
    );
  }

  console.log(`[bg-rm] source: ${bundle.brandCharacterUrl}`);

  console.log('[bg-rm] starting Replicate prediction...');
  const start = Date.now();
  const predictionId = await startPrediction(bundle.brandCharacterUrl);
  const outputUrl = await pollPrediction(predictionId);
  const elapsed = ((Date.now() - start) / 1000).toFixed(1);
  console.log(`[bg-rm] done in ${elapsed}s → ${outputUrl}`);

  console.log('[bg-rm] downloading RGBA PNG...');
  const fetched = await fetch(outputUrl);
  if (!fetched.ok) throw new Error(`Output fetch failed: ${fetched.status}`);
  const buf = Buffer.from(await fetched.arrayBuffer());
  console.log(`[bg-rm]   ${(buf.length / 1024).toFixed(0)}KB`);

  // Re-upload to OUR R2 (Replicate output URLs expire). Overwrite the
  // existing brand-character.png at the canonical path so the BrandCard
  // template just picks up the new file.
  const r2Path = `bundles/${slug}/brand-character.png`;
  const { url } = await put(r2Path, buf, {
    access: 'public',
    contentType: 'image/png',
    allowOverwrite: true,
  });
  // brandCharacterUrl already points at this path; no DB write needed
  // unless the URL pattern changed. Logging for confirmation.
  console.log(`[bg-rm] uploaded RGBA: ${url}`);

  // R2 returns the same URL as before (path is identical), but the
  // underlying bytes changed. The Bundle row already has the right URL
  // so we don't need to update it — but if something cached the URL,
  // a cache-buster query string is what they'd need.
  if (url !== bundle.brandCharacterUrl) {
    await db.bundle.update({
      where: { id: bundle.id },
      data: { brandCharacterUrl: url },
    });
    console.log(`[bg-rm] Bundle.brandCharacterUrl updated`);
  }
}

run()
  .catch((e) => {
    console.error('[bg-rm]', e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());

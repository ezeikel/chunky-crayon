/**
 * Strip white backgrounds from each hero ref in a bundle. Reads the heroes
 * from packages/coloring-core profile config, runs each hero's reference
 * PNG through 851-labs/background-remover on Replicate, and writes the
 * transparent RGBA result back to R2 at:
 *
 *   bundles/{slug}/hero-refs/{heroId}-transparent.png
 *
 * Why: gpt-image-2 outputs the hero refs on a white background. The Meet
 * the Cast section on the bundle product page composes the heroes onto
 * coloured cards — the white bg becomes a visible rectangle. Bg removal
 * gives clean alpha so the same files can also be reused for stickers,
 * marketing cameos, etc. without re-generation.
 *
 * Cost: ~$0.0004 per call (T4 GPU). 4 heroes ≈ $0.0016. Run once per bundle.
 *
 * Usage:
 *   cd apps/chunky-crayon-web
 *   pnpm tsx -r dotenv/config scripts/remove-bundle-hero-backgrounds.ts \
 *     --slug=dino-dance-party \
 *     dotenv_config_path=.env.local
 */

import { put } from '@one-colored-pixel/storage';
import { getBundleProfile } from '@one-colored-pixel/coloring-core';

const args = process.argv.slice(2);
const slug = args.find((a) => a.startsWith('--slug='))?.split('=')[1];
if (!slug) throw new Error('--slug=<bundle> required');

const REPLICATE_TOKEN = process.env.REPLICATE_API_TOKEN;
if (!REPLICATE_TOKEN) throw new Error('REPLICATE_API_TOKEN not set');

const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL;
if (!R2_PUBLIC_URL) throw new Error('R2_PUBLIC_URL not set');

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

async function removeOne(heroId: string): Promise<void> {
  const sourceUrl = `${R2_PUBLIC_URL}/bundles/${slug}/hero-refs/${heroId}.png`;
  const r2Path = `bundles/${slug}/hero-refs/${heroId}-transparent.png`;

  console.log(`\n[bg-rm:${heroId}] source: ${sourceUrl}`);
  const start = Date.now();
  const predictionId = await startPrediction(sourceUrl);
  const outputUrl = await pollPrediction(predictionId);
  const elapsed = ((Date.now() - start) / 1000).toFixed(1);
  console.log(`[bg-rm:${heroId}] replicate done in ${elapsed}s`);

  const fetched = await fetch(outputUrl);
  if (!fetched.ok) {
    throw new Error(`Output fetch failed: ${fetched.status}`);
  }
  const buf = Buffer.from(await fetched.arrayBuffer());
  console.log(`[bg-rm:${heroId}]   ${(buf.length / 1024).toFixed(0)}KB`);

  const { url } = await put(r2Path, buf, {
    access: 'public',
    contentType: 'image/png',
    allowOverwrite: true,
  });
  console.log(`[bg-rm:${heroId}] uploaded → ${url}`);
}

async function run() {
  const profile = getBundleProfile(slug!);
  if (!profile) throw new Error(`Bundle profile not found: ${slug}`);

  console.log(`[bg-rm] processing ${profile.heroes.length} heroes for ${slug}`);

  for (const hero of profile.heroes) {
    await removeOne(hero.id);
  }

  console.log(`\n[bg-rm] all done.`);
}

run().catch((e) => {
  console.error('[bg-rm]', e);
  process.exit(1);
});

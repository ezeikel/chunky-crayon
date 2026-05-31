/**
 * One-off asset: generate the illustrated credit "coin" mascot for the
 * mobile credit-pack paywalls (ColorAsYouGoModal / TopUpPackModal), in
 * the SAME brand style as the profile avatars + Colo (flat 2D mascot,
 * warm-brown outlines, pink cheek blush) — NOT the coloring-page line
 * art. Sibling of generate-profile-avatars.ts; same gpt-image-2 `high`
 * recipe + magenta bg → Replicate bg-strip → transparent PNG.
 *
 * No dollar sign (UK/US-neutral), no scene clutter — just a friendly
 * chunky gold coin / small coin stack, centered, that reads at row size.
 *
 * Usage (from apps/chunky-crayon-web):
 *   # dry run — preview to scripts/out/paywall-coin/coin.png
 *   pnpm tsx -r dotenv/config scripts/generate-paywall-coin.ts \
 *     dotenv_config_path=.env.local
 *
 *   # generate + bg-strip (writes transparent PNG to out dir)
 *   pnpm tsx -r dotenv/config scripts/generate-paywall-coin.ts \
 *     --commit dotenv_config_path=.env.local
 */

import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import OpenAI from 'openai';
import { put, exists } from '@one-colored-pixel/storage';
import { removeBackground } from '../lib/replicate-bg-remove';

const args = process.argv.slice(2);
const COMMIT = args.includes('--commit');

const MODEL = 'gpt-image-2';
const SIZE = '1024x1024' as const;
const QUALITY = 'high' as const;
const R2_KEY = 'paywall-assets/credit-coin.png';
const OUT_DIR = join(process.cwd(), 'scripts', 'out', 'paywall-coin');

const SUBJECT =
  'a friendly chunky gold coin mascot — a single round gold coin with a ' +
  'happy face (two simple oval eyes, tiny smile), sitting on top of a ' +
  'short neat stack of 2 to 3 gold coins. A small sparkle or two beside ' +
  'it. No letters, numbers, currency symbols, or text on the coins.';

const buildPrompt = (subject: string): string =>
  `A simple flat 2D illustration of ${subject} in the style of a ` +
  `friendly children's mascot. ` +
  `Thick warm dark-brown outlines (around #5a3a1f), not pure black. ` +
  `Bright flat colour fills, warm golden-yellow coins, no gradients, ` +
  `no shading. Two simple oval eyes (no highlights inside), a tiny ` +
  `smiling mouth, small soft pink circular cheek blushes. ` +
  `Chunky stocky proportions, centered composition, single subject ` +
  `filling about 70% of the frame with comfortable padding so nothing ` +
  `gets clipped. Plain solid bright magenta (#ff00ff) background, no ` +
  `gradient, no texture. No text, no words, no letters, no numbers, ` +
  `no currency symbols, no logos.`;

const main = async () => {
  if (!process.env.OPENAI_API_KEY) throw new Error('OPENAI_API_KEY not set');
  if (COMMIT && !process.env.REPLICATE_API_TOKEN) {
    throw new Error('REPLICATE_API_TOKEN not set — needed for bg-strip');
  }
  const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL;
  if (COMMIT && !R2_PUBLIC_URL) throw new Error('R2_PUBLIC_URL not set');

  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  mkdirSync(OUT_DIR, { recursive: true });

  const start = Date.now();
  const result = await client.images.generate({
    model: MODEL,
    prompt: buildPrompt(SUBJECT),
    size: SIZE,
    quality: QUALITY,
  });
  const b64 = result.data?.[0]?.b64_json;
  if (!b64) throw new Error('No image returned');
  const buf = Buffer.from(b64, 'base64');
  const elapsed = ((Date.now() - start) / 1000).toFixed(1);

  const opaquePreview = join(OUT_DIR, 'coin-opaque.png');
  writeFileSync(opaquePreview, buf);
  console.log(`[coin] generated in ${elapsed}s -> ${opaquePreview}`);

  if (!COMMIT) {
    console.log(
      'Dry run. Re-run with --commit to bg-strip into a transparent PNG.',
    );
    return;
  }

  // Two-step: upload opaque so Replicate can fetch it, strip, save RGBA.
  await put(R2_KEY, buf, { contentType: 'image/png', allowOverwrite: true });
  const publicUrl = `${R2_PUBLIC_URL}/${R2_KEY}?t=${Date.now()}`;
  const stripStart = Date.now();
  const rgbaBuf = await removeBackground(publicUrl);
  const stripElapsed = ((Date.now() - stripStart) / 1000).toFixed(1);

  const transparent = join(OUT_DIR, 'credit-coin.png');
  writeFileSync(transparent, rgbaBuf);
  console.log(
    `[coin] bg-strip ${stripElapsed}s -> ${transparent} (${(rgbaBuf.length / 1024).toFixed(0)}KB RGBA)`,
  );
  console.log(
    'Copy credit-coin.png into apps/chunky-crayon-mobile/assets/paywall/',
  );
};

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

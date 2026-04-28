#!/usr/bin/env tsx
/**
 * Phase 0 spike — confirm OpenAI's partial_images streaming actually
 * delivers visibly progressive frames before we commit to the full
 * worker + SSE pipeline.
 *
 * If partials look like "blurry blob -> blurry blob -> done", streaming
 * won't fix the perceived-latency problem and we should drop it. If
 * partials show real progressive detail, we proceed to Phase 1+.
 *
 * Run with:
 *   cd apps/chunky-crayon-web
 *   OPENAI_API_KEY=<key> pnpm tsx scripts/spike-image-streaming.ts
 */
import { config } from 'dotenv';
config({ path: '.env.local' });

import OpenAI from 'openai';
import { writeFile, mkdir } from 'node:fs/promises';
import { execSync } from 'node:child_process';
import { createColoringImagePrompt, REFERENCE_IMAGES } from '@/lib/ai';

// Pass quality as first CLI arg, defaults to 'medium' for partial-cadence test.
const QUALITY = (process.argv[2] ?? 'medium') as 'high' | 'medium' | 'low';
const OUT_DIR = `/tmp/spike-image-streaming-${QUALITY}`;
const PROMPT_DESC =
  'a friendly elephant wearing a party hat, throwing confetti';

const main = async () => {
  if (!process.env.OPENAI_API_KEY) {
    console.error('OPENAI_API_KEY not set');
    process.exit(1);
  }

  await mkdir(OUT_DIR, { recursive: true });
  const client = new OpenAI();

  // Same style-reference + prompt format the prod pipeline uses, so the
  // streaming behavior we observe here matches what the worker will do.
  console.log('[spike] fetching style references…');
  const styleFiles = await Promise.all(
    REFERENCE_IMAGES.slice(0, 4).map(async (url, i) => {
      const r = await fetch(url);
      const buf = await r.arrayBuffer();
      const ext = url.endsWith('.webp') ? 'webp' : 'png';
      return new File([buf], `ref-${i}.${ext}`, { type: `image/${ext}` });
    }),
  );

  const finalPrompt =
    'The provided images show the target coloring book style. Match their line weight, simplicity, and outline-only aesthetic.\n\n' +
    createColoringImagePrompt(PROMPT_DESC);

  console.log(`[spike] starting stream for: "${PROMPT_DESC}"`);
  const startedAt = Date.now();
  let lastEventAt = startedAt;

  // openai SDK 6.33 returns an async iterable when stream:true.
  // Types:
  //   ImageEditPartialImageEvent { type: 'image_edit.partial_image'; b64_json; partial_image_index; ... }
  //   ImageEditCompletedEvent    { type: 'image_edit.completed'; b64_json; ... }
  console.log(`[spike] quality=${QUALITY}`);
  const stream = await client.images.edit({
    model: 'gpt-image-2',
    image: styleFiles,
    prompt: finalPrompt,
    size: '1024x1024',
    quality: QUALITY,
    stream: true,
    partial_images: 3,
  });

  let partialCount = 0;
  let finalSeen = false;

  // The async-iterable shape of the SDK gives us each event in order.
  for await (const event of stream) {
    const now = Date.now();
    const elapsedMs = now - startedAt;
    const sinceLastMs = now - lastEventAt;
    lastEventAt = now;

    // Hand-typed extraction since the union type makes property access
    // annoying — every variant has b64_json on a successful event.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const e = event as any;
    const type = e.type as string;

    console.log(
      `[spike] +${(elapsedMs / 1000).toFixed(1)}s (Δ ${(sinceLastMs / 1000).toFixed(1)}s)  type=${type}` +
        (typeof e.partial_image_index === 'number'
          ? ` index=${e.partial_image_index}`
          : ''),
    );

    if (type === 'image_edit.partial_image' && typeof e.b64_json === 'string') {
      partialCount += 1;
      const idx = e.partial_image_index ?? partialCount - 1;
      const path = `${OUT_DIR}/partial-${idx}.png`;
      const buf = Buffer.from(e.b64_json, 'base64');
      await writeFile(path, buf);
      console.log(
        `[spike]   saved ${path} (${(buf.byteLength / 1024).toFixed(0)}KB)`,
      );
    } else if (
      type === 'image_edit.completed' &&
      typeof e.b64_json === 'string'
    ) {
      finalSeen = true;
      const path = `${OUT_DIR}/final.png`;
      const buf = Buffer.from(e.b64_json, 'base64');
      await writeFile(path, buf);
      console.log(
        `[spike]   saved ${path} (${(buf.byteLength / 1024).toFixed(0)}KB)`,
      );
    }
  }

  const totalMs = Date.now() - startedAt;
  console.log(
    `\n[spike] done in ${(totalMs / 1000).toFixed(1)}s — ${partialCount} partials, final=${finalSeen}`,
  );

  if (partialCount === 0) {
    console.warn(
      '[spike] WARNING: zero partials emitted. Streaming may not be supported on this model+API combo, or partial_images=3 was silently ignored.',
    );
  }

  // Open the directory so we can flip through partials and judge whether
  // they're visibly progressive.
  try {
    execSync(`open ${OUT_DIR}`);
  } catch {
    /* ignore */
  }
};

main().catch((err) => {
  console.error('[spike] fatal:', err);
  process.exit(1);
});

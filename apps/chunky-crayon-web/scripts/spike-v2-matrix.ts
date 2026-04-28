#!/usr/bin/env tsx
/**
 * 4-config latency matrix for gpt-image-2.
 *
 * Tests whether endpoint (generate vs edit), reference image count,
 * and quality drive the 207s "Thinking mode-like" outlier we saw.
 *
 * All 4 fire in parallel. Each writes its own PNG + a row in the report.
 *
 * Run with:
 *   cd apps/chunky-crayon-web
 *   OPENAI_API_KEY=<key> pnpm tsx scripts/spike-v2-matrix.ts
 */
import { config } from 'dotenv';
config({ path: '.env.local' });

import OpenAI from 'openai';
import { writeFile, mkdir } from 'node:fs/promises';
import { execSync } from 'node:child_process';
import { createColoringImagePrompt, REFERENCE_IMAGES } from '@/lib/ai';

const OUT_DIR = '/tmp/spike-v2-matrix';
const PROMPT_DESC =
  'a friendly elephant wearing a party hat, throwing confetti';

type Config = {
  id: string;
  endpoint: 'generate' | 'edit';
  refCount: 0 | 1 | 4;
  quality: 'low' | 'medium' | 'high';
};

const CONFIGS: Config[] = [
  {
    id: '01-generate-norefs-high',
    endpoint: 'generate',
    refCount: 0,
    quality: 'high',
  },
  {
    id: '02-generate-norefs-medium',
    endpoint: 'generate',
    refCount: 0,
    quality: 'medium',
  },
  { id: '03-edit-1ref-high', endpoint: 'edit', refCount: 1, quality: 'high' },
  { id: '04-edit-4refs-high', endpoint: 'edit', refCount: 4, quality: 'high' },
];

type Result = {
  config: Config;
  ok: boolean;
  durationMs: number;
  fileBytes?: number;
  error?: string;
};

const STYLE_PROMPT_PREFIX =
  'The provided images show the target coloring book style. Match their line weight, simplicity, and outline-only aesthetic.\n\n';

let cachedRefs: File[] | null = null;
const getRefs = async (n: number): Promise<File[]> => {
  if (n === 0) return [];
  if (!cachedRefs) {
    const urls = REFERENCE_IMAGES.slice(0, 4);
    cachedRefs = await Promise.all(
      urls.map(async (url, i) => {
        const r = await fetch(url);
        const buf = await r.arrayBuffer();
        const ext = url.endsWith('.webp') ? 'webp' : 'png';
        return new File([buf], `ref-${i}.${ext}`, { type: `image/${ext}` });
      }),
    );
  }
  return cachedRefs.slice(0, n);
};

const runOne = async (client: OpenAI, config: Config): Promise<Result> => {
  const refs = await getRefs(config.refCount);
  const corePrompt = createColoringImagePrompt(PROMPT_DESC);
  const startedAt = Date.now();

  try {
    let b64: string | undefined;

    if (config.endpoint === 'generate') {
      // generate: prompt-only. No style refs go in. Style block carries
      // the look-and-feel via the prompt itself.
      const resp = await client.images.generate({
        model: 'gpt-image-2',
        prompt: corePrompt,
        size: '1024x1024',
        quality: config.quality,
      });
      b64 = resp.data?.[0]?.b64_json;
    } else {
      // edit: needs at least 1 image. With refCount=1 we send 1 style
      // ref; with refCount=4 we send 4. Same prompt format as prod.
      if (refs.length === 0) {
        throw new Error('edit endpoint requires at least 1 ref');
      }
      const styledPrompt = STYLE_PROMPT_PREFIX + corePrompt;
      const resp = await client.images.edit({
        model: 'gpt-image-2',
        image: refs,
        prompt: styledPrompt,
        size: '1024x1024',
        quality: config.quality,
      });
      b64 = resp.data?.[0]?.b64_json;
    }

    const durationMs = Date.now() - startedAt;
    if (!b64) throw new Error('no image returned');

    const buf = Buffer.from(b64, 'base64');
    const path = `${OUT_DIR}/${config.id}.png`;
    await writeFile(path, buf);

    return { config, ok: true, durationMs, fileBytes: buf.byteLength };
  } catch (err) {
    return {
      config,
      ok: false,
      durationMs: Date.now() - startedAt,
      error: err instanceof Error ? err.message : String(err),
    };
  }
};

const main = async () => {
  if (!process.env.OPENAI_API_KEY) {
    console.error('OPENAI_API_KEY not set');
    process.exit(1);
  }

  await mkdir(OUT_DIR, { recursive: true });
  const client = new OpenAI();

  console.log('[matrix] firing 4 configs in parallel…');
  const startedAt = Date.now();

  const results = await Promise.all(CONFIGS.map((c) => runOne(client, c)));

  const totalMs = Date.now() - startedAt;
  console.log(`\n[matrix] all done in ${(totalMs / 1000).toFixed(1)}s\n`);

  const lines: string[] = [];
  lines.push('# v2 Latency Matrix');
  lines.push('');
  lines.push(`Generated: ${new Date().toISOString()}`);
  lines.push(`Prompt: "${PROMPT_DESC}"`);
  lines.push(`Total wall-clock (parallel): ${(totalMs / 1000).toFixed(1)}s`);
  lines.push('');
  lines.push('| ID | Endpoint | Refs | Quality | Status | Duration | Size |');
  lines.push('| --- | --- | --- | --- | --- | --- | --- |');
  for (const r of results) {
    lines.push(
      `| ${r.config.id} | ${r.config.endpoint} | ${r.config.refCount} | ${r.config.quality} | ${r.ok ? 'OK' : 'FAIL'} | ${(r.durationMs / 1000).toFixed(1)}s | ${r.fileBytes ? `${(r.fileBytes / 1024).toFixed(0)}KB` : '-'} |`,
    );
    console.log(
      `[matrix] ${r.config.id.padEnd(28)} ${r.ok ? 'OK' : 'FAIL'.padEnd(4)}  ${(r.durationMs / 1000).toFixed(1)}s  ${r.fileBytes ? `(${(r.fileBytes / 1024).toFixed(0)}KB)` : ''}${r.error ? ` err=${r.error}` : ''}`,
    );
  }
  lines.push('');
  lines.push('## Outputs');
  lines.push('');
  for (const r of results) {
    if (r.ok) lines.push(`![${r.config.id}](./${r.config.id}.png)`);
  }

  await writeFile(`${OUT_DIR}/REPORT.md`, lines.join('\n'));
  console.log(`\n[matrix] wrote ${OUT_DIR}/REPORT.md`);

  try {
    execSync(`open ${OUT_DIR}`);
  } catch {
    /* ignore */
  }
};

main().catch((err) => {
  console.error('[matrix] fatal:', err);
  process.exit(1);
});

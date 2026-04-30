#!/usr/bin/env tsx
/**
 * A/B test: gpt-image-1.5 (current prod) vs gpt-image-2 (new).
 *
 * Generates the same 5 prompts through both models with identical inputs
 * (style reference files, size, quality, prompt format) so the only
 * variable is the model id.
 *
 * Outputs:
 *   /tmp/ab-image-models/<promptId>-1.5.png
 *   /tmp/ab-image-models/<promptId>-2.png
 *   /tmp/ab-image-models/REPORT.md
 *
 * Run with:
 *   cd apps/chunky-crayon-web
 *   DATABASE_URL='<prod>' OPENAI_API_KEY='<key>' pnpm tsx scripts/ab-image-models.ts
 */
import { config } from 'dotenv';

config({ path: '.env.local' });

import OpenAI from 'openai';
import { writeFile, mkdir } from 'node:fs/promises';
import { execSync } from 'node:child_process';
import { createColoringImagePrompt, REFERENCE_IMAGES } from '@/lib/ai';

const OUT_DIR = '/tmp/ab-image-models';

type Prompt = {
  id: string;
  description: string;
  notes?: string;
};

const PROMPTS: Prompt[] = [
  {
    id: '01-simple',
    description: 'a friendly bumblebee in a flower',
    notes: 'Simple subject, minimal scene complexity',
  },
  {
    id: '02-complex-scene',
    description:
      'a wildflower meadow with a stone bridge crossing a small stream',
    notes: 'Multi-element outdoor scene',
  },
  {
    id: '03-character-action',
    description: 'a firefighter bear cub riding a unicycle',
    notes: 'Character with prop, action pose',
  },
  {
    id: '04-photo-derived',
    description:
      'a cheerful labrador dog sitting in a backyard with daisies around it',
    notes: 'Mimics what photo-to-coloring produces',
  },
  {
    id: '05-detail-stress',
    description:
      'a cute dragon reading a book of recipes in a busy kitchen with pots, pans, and a window with curtains',
    notes: 'High-detail scene; tests gap-closing under complexity',
  },
];

const MODELS = ['gpt-image-1.5', 'gpt-image-2'] as const;

// Mirror coloring-core/src/image-providers.ts createOpenAIProvider exactly
// so we measure the model swap, not a config drift.
const STYLE_PROMPT_PREFIX =
  'The provided images show the target coloring book style. Match their line weight, simplicity, and outline-only aesthetic.\n\n';

let cachedStyleFiles: File[] | null = null;
const getStyleFiles = async (): Promise<File[]> => {
  if (cachedStyleFiles) return cachedStyleFiles;
  const urls = REFERENCE_IMAGES.slice(0, 4);
  const files = await Promise.all(
    urls.map(async (url, i) => {
      const response = await fetch(url);
      const arrayBuffer = await response.arrayBuffer();
      const ext = url.endsWith('.webp') ? 'webp' : 'png';
      return new File([arrayBuffer], `style-ref-${i}.${ext}`, {
        type: `image/${ext}`,
      });
    }),
  );
  cachedStyleFiles = files;
  return files;
};

type Result = {
  promptId: string;
  model: string;
  ok: boolean;
  error?: string;
  durationMs?: number;
  fileBytes?: number;
  filePath?: string;
};

const generate = async (
  client: OpenAI,
  model: string,
  prompt: Prompt,
  styleFiles: File[],
): Promise<Result> => {
  const finalPrompt =
    STYLE_PROMPT_PREFIX + createColoringImagePrompt(prompt.description);
  const filePath = `${OUT_DIR}/${prompt.id}-${model.replace('gpt-image-', '')}.png`;
  const startedAt = Date.now();
  try {
    const resp = await client.images.edit({
      model,
      image: styleFiles,
      prompt: finalPrompt,
      size: '1024x1024',
      quality: 'high',
    });
    const durationMs = Date.now() - startedAt;
    const b64 = resp.data?.[0]?.b64_json;
    if (!b64) throw new Error('no image returned');
    const buf = Buffer.from(b64, 'base64');
    await writeFile(filePath, buf);
    return {
      promptId: prompt.id,
      model,
      ok: true,
      durationMs,
      fileBytes: buf.byteLength,
      filePath,
    };
  } catch (err) {
    return {
      promptId: prompt.id,
      model,
      ok: false,
      error: err instanceof Error ? err.message : String(err),
      durationMs: Date.now() - startedAt,
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

  console.log('[ab] fetching style reference files…');
  const styleFiles = await getStyleFiles();
  console.log(`[ab] got ${styleFiles.length} style references`);

  const results: Result[] = [];
  for (const prompt of PROMPTS) {
    for (const model of MODELS) {
      console.log(`[ab] ${prompt.id} -> ${model}…`);
      const r = await generate(client, model, prompt, styleFiles);
      console.log(
        `[ab]   ${r.ok ? 'OK' : 'FAIL'} ${r.durationMs}ms ${r.fileBytes ? `(${(r.fileBytes / 1024).toFixed(0)}KB)` : ''}${r.error ? ` err=${r.error}` : ''}`,
      );
      results.push(r);
    }
  }

  // Build markdown report.
  const lines: string[] = [];
  lines.push('# Image Model A/B Report');
  lines.push('');
  lines.push(`Generated: ${new Date().toISOString()}`);
  lines.push('');
  lines.push('## Per-prompt timing + file size');
  lines.push('');
  lines.push('| Prompt | Model | Status | Duration | Size |');
  lines.push('| --- | --- | --- | --- | --- |');
  for (const r of results) {
    lines.push(
      `| ${r.promptId} | ${r.model} | ${r.ok ? 'OK' : 'FAIL'} | ${r.durationMs}ms | ${r.fileBytes ? `${(r.fileBytes / 1024).toFixed(0)}KB` : '-'} |`,
    );
  }
  lines.push('');
  lines.push('## Aggregate');
  lines.push('');
  for (const model of MODELS) {
    const ok = results.filter((r) => r.model === model && r.ok);
    const totalMs = ok.reduce((acc, r) => acc + (r.durationMs ?? 0), 0);
    const avgMs = ok.length ? Math.round(totalMs / ok.length) : 0;
    const totalBytes = ok.reduce((acc, r) => acc + (r.fileBytes ?? 0), 0);
    lines.push(
      `- **${model}** — ${ok.length}/${PROMPTS.length} ok, avg ${avgMs}ms, total ${(totalBytes / 1024).toFixed(0)}KB`,
    );
  }
  lines.push('');
  lines.push('## Prompts used');
  lines.push('');
  for (const p of PROMPTS) {
    lines.push(`### ${p.id}`);
    lines.push(`> ${p.description}`);
    if (p.notes) lines.push(`*Notes:* ${p.notes}`);
    lines.push('');
    lines.push(`![1.5](./${p.id}-1.5.png) ![2](./${p.id}-2.png)`);
    lines.push('');
  }

  const reportPath = `${OUT_DIR}/REPORT.md`;
  await writeFile(reportPath, lines.join('\n'));
  console.log(`\n[ab] wrote report: ${reportPath}`);

  // Open the directory so user can flip through.
  try {
    execSync(`open ${OUT_DIR}`);
  } catch {
    /* ignore */
  }
};

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

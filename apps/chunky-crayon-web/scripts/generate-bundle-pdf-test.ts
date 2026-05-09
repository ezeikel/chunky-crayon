/**
 * Render a bundle's PDF to /tmp and open it. Lets us iterate on the PDF
 * layout (cover, page chrome, fonts, footer, image quality) without any
 * webhook/email/R2 plumbing in the way.
 *
 * Usage (from apps/chunky-crayon-web):
 *   pnpm tsx -r dotenv/config scripts/generate-bundle-pdf-test.ts \
 *     --slug=dino-dance-party \
 *     dotenv_config_path=.env.local
 */

import { writeFile } from 'fs/promises';
import { spawn } from 'child_process';
import path from 'path';
import { generateBundlePDF } from '@/utils/generateBundlePDF';
import { db } from '@one-colored-pixel/db';

const args = process.argv.slice(2);
const slug = args.find((a) => a.startsWith('--slug='))?.split('=')[1];
if (!slug) throw new Error('--slug=<bundle> required');

async function run() {
  console.log(`[bundle-pdf] generating ${slug}...`);
  const start = Date.now();
  const { bundleName, pageCount, buffer } = await generateBundlePDF(slug!);
  const elapsed = ((Date.now() - start) / 1000).toFixed(1);
  console.log(
    `[bundle-pdf] done in ${elapsed}s — ${pageCount + 1} pages (1 cover + ${pageCount}), ${(buffer.length / 1024 / 1024).toFixed(2)}MB`,
  );

  const outPath = path.join('/tmp', `${slug}.pdf`);
  await writeFile(outPath, buffer);
  console.log(`[bundle-pdf] written to ${outPath}`);
  console.log(`[bundle-pdf] bundle: ${bundleName}`);

  // Open in macOS Preview (best-effort).
  if (process.platform === 'darwin') {
    spawn('open', [outPath], { detached: true });
  }
}

run()
  .catch((e) => {
    console.error('[bundle-pdf]', e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());

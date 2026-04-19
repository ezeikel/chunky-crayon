import { readdir, writeFile } from 'node:fs/promises';
import { join, extname, basename } from 'node:path';

const inputDir = process.argv[2];
if (!inputDir) {
  console.error('Usage: pnpm tsx build-photo-gallery.mts <input-dir>');
  process.exit(1);
}
const outputDir = join(inputDir, 'output');
const galleryPath = join(outputDir, 'index.html');

const supported = new Set(['.jpg', '.jpeg', '.png', '.webp', '.heic']);
const inputs = (await readdir(inputDir))
  .filter((f) => supported.has(extname(f).toLowerCase()))
  .sort();

const outputs = new Set(await readdir(outputDir));

const rows = inputs
  .map((f) => {
    const outName = `${basename(f, extname(f))}.coloring.png`;
    if (!outputs.has(outName)) return null;
    return { name: f, input: `../${f}`, output: outName };
  })
  .filter((r): r is { name: string; input: string; output: string } => !!r);

const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>Coloring page test — ${rows.length} images</title>
<style>
  :root { color-scheme: light dark; }
  body { font: 14px/1.4 system-ui, sans-serif; margin: 24px; background: #f5f5f5; }
  h1 { font-size: 18px; margin: 0 0 16px; }
  .meta { color: #666; margin-bottom: 24px; }
  .pair { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 24px; background: white; border-radius: 8px; padding: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.08); }
  .pair img { width: 100%; height: auto; display: block; border-radius: 4px; background: white; }
  .pair figcaption { font-size: 12px; color: #888; margin-top: 6px; word-break: break-all; }
  .name { font-weight: 600; font-size: 13px; margin-bottom: 8px; word-break: break-all; }
  @media (prefers-color-scheme: dark) {
    body { background: #111; color: #eee; }
    .pair { background: #1c1c1c; }
    .pair figcaption { color: #999; }
  }
</style>
</head>
<body>
<h1>Coloring page test — ${rows.length} images</h1>
<div class="meta">Left: original photo. Right: GPT Image 1.5 output with production prompt.</div>
${rows
  .map(
    (r) => `
<section class="pair">
  <div>
    <div class="name">${r.name}</div>
    <figure><img src="${r.input}" alt="original" loading="lazy" /><figcaption>original</figcaption></figure>
  </div>
  <div>
    <div class="name">&nbsp;</div>
    <figure><img src="${r.output}" alt="coloring page" loading="lazy" /><figcaption>coloring page</figcaption></figure>
  </div>
</section>`,
  )
  .join('\n')}
</body>
</html>`;

await writeFile(galleryPath, html);
console.log(`[gallery] ${rows.length} pairs → ${galleryPath}`);
console.log(`[gallery] open: file://${galleryPath}`);

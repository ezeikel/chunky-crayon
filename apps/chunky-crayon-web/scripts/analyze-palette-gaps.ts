/**
 * Quantify WHY auto-colour isn't exact: is the constrained palette too sparse
 * (real gaps → high snap ΔE) or is it just inherent quantisation (~5 ΔE)?
 *
 * For a set of images: colourise the line art, sample each region's dominant
 * colour the same way the pipeline does (boostChroma), measure CIEDE2000 from
 * that colour to the NEAREST palette entry. Histogram the snap ΔE and report
 * the worst-snapped colours so we can see which families are missing.
 *
 * Usage (from apps/chunky-crayon-web):
 *   pnpm tsx -r dotenv/config scripts/analyze-palette-gaps.ts \
 *     dotenv_config_path=.env.local --id=<id> [--id=<id> ...]
 */
import { gunzipSync } from 'node:zlib';
import { Resvg } from '@resvg/resvg-js';
import {
  colorizeLineArt,
  createColourisePrompt,
  sampleRegionColoursFromRender,
  nearestPaletteColor,
  boostChroma,
  rgbToHex,
  type RegionStoreJson,
} from '@one-colored-pixel/coloring-core';
import { db } from '@one-colored-pixel/db';
import { BRAND } from '@/lib/db';
import { ALL_COLORING_COLORS_EXTENDED } from '@/constants';

const PALETTE = ALL_COLORING_COLORS_EXTENDED.filter(
  (c) => c.hex !== '#FFFFFF' && c.hex !== '#212121',
).map((c) => ({ hex: c.hex, name: c.name }));

const ids = process.argv
  .filter((a) => a.startsWith('--id='))
  .map((a) => a.slice(5));

type Snap = {
  img: string;
  region: number;
  label: string;
  sampledHex: string;
  boostedHex: string;
  snappedName: string;
  snappedHex: string;
  dE: number;
};

const main = async () => {
  const images = await db.coloringImage.findMany({
    where: ids.length
      ? { id: { in: ids }, brand: BRAND }
      : { brand: BRAND, regionsJson: { not: null }, svgUrl: { not: null } },
    take: ids.length ? undefined : 6,
    orderBy: ids.length ? undefined : { regionsGeneratedAt: 'desc' },
    select: {
      id: true,
      title: true,
      svgUrl: true,
      description: true,
      regionsJson: true,
      regionMapUrl: true,
      regionMapWidth: true,
      regionMapHeight: true,
    },
  });

  const all: Snap[] = [];

  for (const img of images) {
    if (
      !img.svgUrl ||
      !img.regionsJson ||
      !img.regionMapUrl ||
      !img.regionMapWidth ||
      !img.regionMapHeight
    ) {
      console.log(`[${img.id}] skipped (no region store)`);
      continue;
    }
    const rj = JSON.parse(img.regionsJson) as RegionStoreJson;
    const labelById = new Map(rj.regions.map((r) => [r.id, r.label]));

    const gz = Buffer.from(
      await (await fetch(img.regionMapUrl)).arrayBuffer(),
    );
    const raw = gunzipSync(gz);
    const pixelToRegion = new Uint16Array(
      raw.buffer,
      raw.byteOffset,
      raw.byteLength / 2,
    );
    const w = img.regionMapWidth;
    const h = img.regionMapHeight;

    const svg = Buffer.from(await (await fetch(img.svgUrl)).arrayBuffer());
    // Rasterise the SVG to a PNG at the region-map width, exactly as the
    // pipeline does, so colourise gets the same input it normally would.
    const lineArtPng = Buffer.from(
      new Resvg(svg, {
        fitTo: { mode: 'width', value: w },
        background: 'white',
      })
        .render()
        .asPng(),
    );

    const sceneHint = `This is: "${img.title}". ${img.description ?? ''}`;
    const render = await colorizeLineArt(
      lineArtPng,
      createColourisePrompt('realistic', sceneHint),
      'gemini',
    );
    if (!render.success) {
      console.log(`[${img.id}] colourise failed: ${render.error}`);
      continue;
    }
    const samples = await sampleRegionColoursFromRender(
      render.pngBuffer,
      pixelToRegion,
      rj.regions.map((r) => r.id),
      w,
      h,
    );

    for (const r of rj.regions) {
      const s = samples.get(r.id);
      if (!s || !s.rgb || s.coverage < 0.2 || s.confidence < 0.45) continue;
      const boosted = boostChroma(s.rgb);
      const snap = nearestPaletteColor(boosted, PALETTE);
      if (!snap) continue;
      all.push({
        img: img.title ?? img.id,
        region: r.id,
        label: labelById.get(r.id) ?? '?',
        sampledHex: rgbToHex(s.rgb),
        boostedHex: rgbToHex(boosted),
        snappedName: snap.name,
        snappedHex: snap.hex,
        dE: snap.deltaE,
      });
    }
    console.log(`[${img.id}] ${img.title} — sampled ${samples.size} regions`);
  }

  if (all.length === 0) {
    console.log('No regions analysed.');
    process.exit(1);
  }

  const des = all.map((a) => a.dE).sort((a, b) => a - b);
  const q = (p: number) => des[Math.min(des.length - 1, Math.floor(p * des.length))];
  const mean = des.reduce((t, x) => t + x, 0) / des.length;

  console.log(`\n===== SNAP ΔE (sampled→nearest palette) over ${all.length} regions =====`);
  console.log(`mean ${mean.toFixed(1)}  median ${q(0.5).toFixed(1)}  p75 ${q(0.75).toFixed(1)}  p90 ${q(0.9).toFixed(1)}  p99 ${q(0.99).toFixed(1)}  max ${des[des.length - 1].toFixed(1)}`);

  const bands = [
    ['exact-ish (≤5, just quantisation)', (d: number) => d <= 5],
    ['close (5–10)', (d: number) => d > 5 && d <= 10],
    ['noticeable (10–20)', (d: number) => d > 10 && d <= 20],
    ['WRONG family (>20, real gap)', (d: number) => d > 20],
  ] as const;
  for (const [name, test] of bands) {
    const n = des.filter(test).length;
    console.log(`  ${name}: ${n} (${((n / des.length) * 100).toFixed(0)}%)`);
  }

  console.log(`\nWorst 15 snaps (biggest palette gaps):`);
  for (const a of [...all].sort((x, y) => y.dE - x.dE).slice(0, 15)) {
    console.log(
      `  ΔE ${a.dE.toFixed(1).padStart(5)}  "${a.label}" sampled ${a.sampledHex} → boosted ${a.boostedHex} → snapped ${a.snappedName} ${a.snappedHex}  (${a.img})`,
    );
  }

  // Which palette entries are "magnets" for far-away colours (gap indicators)
  const byTarget = new Map<string, { n: number; sumDE: number }>();
  for (const a of all) {
    const k = `${a.snappedName} ${a.snappedHex}`;
    const c = byTarget.get(k) ?? { n: 0, sumDE: 0 };
    c.n++;
    c.sumDE += a.dE;
    byTarget.set(k, c);
  }
  console.log(`\nPalette entries receiving the worst-fitting colours (avg ΔE, count):`);
  for (const [k, v] of [...byTarget.entries()]
    .filter(([, v]) => v.n >= 3)
    .sort((a, b) => b[1].sumDE / b[1].n - a[1].sumDE / a[1].n)
    .slice(0, 12)) {
    console.log(`  ${k}: avg ΔE ${(v.sumDE / v.n).toFixed(1)} over ${v.n} regions`);
  }

  process.exit(0);
};

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

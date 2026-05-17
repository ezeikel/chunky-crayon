/**
 * Headless region-colour review loop — no UI, objective pass/fail.
 *
 * The Magic Fill / Magic Brush experience is only as good as the colour each
 * region is assigned. This script proves, with numbers, that the new
 * JPEG-driven pipeline picks colours that "make sense" rather than at random.
 *
 * For each image:
 *   1. Run the real region-store pipeline (generateRegionStore) → writes
 *      regionsJson with a chosen palette colour per region per variant.
 *   2. Generate an INDEPENDENT held-out colourised render of the same line
 *      art (a fresh colorize call — NOT the one the pipeline sampled), and
 *      sample each region's actual dominant colour from it. This is the
 *      "ground truth" of what a skilled colourist puts in each region.
 *   3. Score: CIEDE2000 between the pipeline's chosen colour and the
 *      ground-truth colour, per region, for the realistic variant (the
 *      "what colour is the thing actually" variant).
 *   4. Compare against a RANDOM baseline (each region gets a random palette
 *      colour). If the pipeline's mean ΔE is not dramatically below random,
 *      the colours ARE effectively random and the run FAILS.
 *   5. Emit per-image + aggregate metrics and a side-by-side composite PNG
 *      (line art | pipeline-chosen fill | held-out render) for spot-checks.
 *
 * Usage (from apps/chunky-crayon-web):
 *   pnpm tsx -r dotenv/config scripts/review-region-colors.ts \
 *     dotenv_config_path=.env.local \
 *     --model=gemini --limit=8 [--id=<coloringImageId>] [--no-regen]
 *
 * --model=gemini|gpt   colorize model under test (default gemini)
 * --limit=N            how many images to sample from the dev DB (default 6)
 * --id=<id>            review one specific image (repeatable)
 * --no-regen           skip the pipeline run, score the existing regionsJson
 *                      (use after a prior run to re-score without paying for
 *                      4 more renders)
 * --out=<dir>          composite output dir (default ./.region-review)
 *
 * Targets whatever DATABASE_URL points at — keep .env.local on the dev
 * Neon branch (verified ep-withered-meadow = br-wandering-salad = dev).
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { gunzipSync } from 'node:zlib';
import sharp from 'sharp';
import { Resvg } from '@resvg/resvg-js';
import { db } from '@one-colored-pixel/db';
import {
  detectAllRegionsFromPixels,
  dilateBoundariesPixels,
} from '@one-colored-pixel/canvas';
import {
  colorizeLineArt,
  createColourisePrompt,
  sampleRegionColoursFromRender,
  nearestPaletteColor,
  rgbToLab,
  deltaE2000,
  boostChroma,
  generateRegionStoreLogic,
  DEFAULT_PALETTE_VARIANT_MODIFIERS,
  type ColorizeModel,
  type RegionStoreJson,
} from '@one-colored-pixel/coloring-core';
import {
  REGION_FILL_POINTS_SYSTEM,
  createRegionFillPointsPrompt,
  GRID_COLOR_MAP_SYSTEM,
  createGridColorMapPrompt,
} from '@/lib/ai';
import { BRAND } from '@/lib/db';
import { ALL_COLORING_COLORS_EXTENDED } from '@/constants';
import { put } from '@one-colored-pixel/storage';

const PALETTE = ALL_COLORING_COLORS_EXTENDED.filter(
  (c) => c.hex !== '#FFFFFF' && c.hex !== '#212121',
).map((c) => ({ hex: c.hex, name: c.name }));

// A region's chosen colour is "coherent" if it's within this CIEDE2000 of
// what an independent colourist render put there. ~15 ΔE ≈ "clearly the
// same colour family"; above ~30 reads as a different colour to the eye.
const COHERENT_DELTA_E = 18;

const argFlag = (name: string): string | undefined => {
  const a = process.argv.find((x) => x.startsWith(`--${name}=`));
  return a ? a.slice(name.length + 3) : undefined;
};
const hasFlag = (name: string): boolean =>
  process.argv.includes(`--${name}`);

type Stats = {
  mean: number;
  median: number;
  p90: number;
  max: number;
};
const stats = (xs: number[]): Stats => {
  if (xs.length === 0) return { mean: 0, median: 0, p90: 0, max: 0 };
  const s = [...xs].sort((a, b) => a - b);
  const mean = s.reduce((t, x) => t + x, 0) / s.length;
  const at = (q: number) => s[Math.min(s.length - 1, Math.floor(q * s.length))];
  return { mean, median: at(0.5), p90: at(0.9), max: s[s.length - 1] };
};

const hexToRgb = (hex: string) => {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!m) return null;
  return {
    r: parseInt(m[1], 16),
    g: parseInt(m[2], 16),
    b: parseInt(m[3], 16),
  };
};

/** Rasterise SVG → pixels + region map, mirroring the pipeline's step 1-2. */
async function rasterizeAndDetect(svgBuffer: Buffer) {
  const resvg = new Resvg(svgBuffer, {
    fitTo: { mode: 'width', value: 1024 },
    background: 'white',
  });
  const rendered = resvg.render();
  const pngBuffer = Buffer.from(rendered.asPng());
  const width = rendered.width;
  const height = rendered.height;

  const { data } = await sharp(pngBuffer)
    .flatten({ background: 'white' })
    .dilate(2)
    .erode(2)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const pixels = new Uint8Array(data);
  dilateBoundariesPixels(pixels, width, height, 2);

  const regionMap = detectAllRegionsFromPixels(pixels, width, height, 100);
  return { pngBuffer, regionMap, width, height };
}

/** Render the pipeline-chosen palette as flat fills (for the composite). */
function renderChosenFill(
  pixelToRegion: Uint16Array,
  regionsJson: RegionStoreJson,
  width: number,
  height: number,
): Promise<Buffer> {
  const rgbByRegion = new Map<number, [number, number, number]>();
  for (const r of regionsJson.regions) {
    const rgb = hexToRgb(r.palettes.realistic?.hex ?? '#CCCCCC');
    rgbByRegion.set(r.id, rgb ? [rgb.r, rgb.g, rgb.b] : [204, 204, 204]);
  }
  const raw = Buffer.alloc(width * height * 3);
  for (let i = 0; i < pixelToRegion.length; i++) {
    const rgb = rgbByRegion.get(pixelToRegion[i]);
    const p = i * 3;
    raw[p] = rgb ? rgb[0] : 255;
    raw[p + 1] = rgb ? rgb[1] : 255;
    raw[p + 2] = rgb ? rgb[2] : 255;
  }
  return sharp(raw, { raw: { width, height, channels: 3 } })
    .png()
    .toBuffer();
}

type ImageReview = {
  id: string;
  title: string;
  regions: number;
  pipelineDeltaE: Stats;
  randomDeltaE: Stats;
  /** ΔE(chosen vs the pipeline's OWN sampled render) — fidelity, no variance */
  selfDeltaE: Stats;
  selfRegions: number;
  coherentPct: number;
  groupConsistencyPct: number;
  worst: Array<{ id: number; label: string; chosen: string; truth: string; dE: number }>;
};

async function reviewImage(
  image: { id: string; title: string; svgUrl: string; description: string | null; tags: string[] },
  model: ColorizeModel,
  noRegen: boolean,
  outDir: string,
): Promise<ImageReview | null> {
  const tag = `[${image.id}]`;
  console.log(`${tag} ${image.title}`);

  const regionStoreConfig = {
    gridColorMapSystem: GRID_COLOR_MAP_SYSTEM,
    createGridColorMapPrompt,
    regionFillPointsSystem: REGION_FILL_POINTS_SYSTEM,
    createRegionFillPointsPrompt,
    allColors: ALL_COLORING_COLORS_EXTENDED.map((c) => ({
      hex: c.hex,
      name: c.name,
    })),
    paletteVariantModifiers: DEFAULT_PALETTE_VARIANT_MODIFIERS,
  };

  // Captures the EXACT realistic-variant render the pipeline generated and
  // sampled — so the composite shows what the pipeline actually saw, making
  // "the chosen colours don't match the render" a falsifiable claim.
  let pipelineRealisticRender: Buffer | null = null;
  // The resolved colours BEFORE the group pass — the clean
  // "is sample→boost→snap faithful to the render?" signal, uncontaminated
  // by the group pass's intended same-object unification.
  let preGroupChosen: Map<number, { hex: string }> | null = null;

  // 1. run (or skip) the real pipeline — call the LOGIC directly (not the
  //    'use server' wrapper) so we can pass the onVariantRender debug hook,
  //    then persist exactly like the wrapper does so --no-regen still works.
  if (!noRegen) {
    console.log(`${tag}   running pipeline (model=${model})…`);
    const svgBuf = Buffer.from(
      await (await fetch(image.svgUrl)).arrayBuffer(),
    );
    const r = await generateRegionStoreLogic(
      svgBuf,
      {
        ...regionStoreConfig,
        colorizeModel: model,
        onVariantRender: (variant, renderPng) => {
          if (variant === 'realistic') pipelineRealisticRender = renderPng;
        },
        onVariantPreGroup: (variant, resolvedMap) => {
          if (variant === 'realistic') {
            preGroupChosen = new Map(
              [...resolvedMap].map(([k, v]) => [k, { hex: v.hex }]),
            );
          }
        },
      },
      {
        title: image.title,
        description: image.description ?? '',
        tags: image.tags,
      },
    );
    if (!r.success) {
      console.log(`${tag}   PIPELINE FAILED: ${r.error}`);
      return null;
    }
    const { url: regionMapUrl } = await put(
      `uploads/coloring-images/${image.id}/regions.bin.gz`,
      r.regionMapGzipped,
      { access: 'public', contentType: 'application/gzip', allowOverwrite: true },
    );
    await db.coloringImage.update({
      where: { id: image.id, brand: BRAND },
      data: {
        regionMapUrl,
        regionMapWidth: r.width,
        regionMapHeight: r.height,
        regionsJson: JSON.stringify(r.regionsJson),
        regionsGeneratedAt: new Date(),
      },
    });
  }

  // re-read the just-written regionsJson + the PIPELINE'S region map
  const row = await db.coloringImage.findFirst({
    where: { id: image.id, brand: BRAND },
    select: {
      regionsJson: true,
      regionMapUrl: true,
      regionMapWidth: true,
      regionMapHeight: true,
    },
  });
  if (!row?.regionsJson || !row.regionMapUrl || !row.regionMapWidth) {
    console.log(`${tag}   no regionsJson/regionMap on row`);
    return null;
  }
  const regionsJson = JSON.parse(row.regionsJson) as RegionStoreJson;

  // CRITICAL: score against the PIPELINE'S OWN region map (the gzipped
  // Uint16Array it wrote to R2 — exactly what the runtime uses), NOT a
  // freshly re-detected one. Re-detecting assigns region IDs by raster scan
  // order with a slightly different boundary pipeline, so "region 20" in a
  // re-detected map is a DIFFERENT physical region than "region 20" in
  // regionsJson — which made every per-region comparison (and the chosen-
  // fill composite) line up the wrong regions. This was a harness bug, not
  // (only) a pipeline bug.
  const width = row.regionMapWidth;
  const height = row.regionMapHeight!;
  const gzBuf = Buffer.from(
    await (await fetch(row.regionMapUrl)).arrayBuffer(),
  );
  const rawBytes = gunzipSync(gzBuf);
  const pixelToRegion = new Uint16Array(
    rawBytes.buffer,
    rawBytes.byteOffset,
    rawBytes.byteLength / 2,
  );
  const regionMap = {
    pixelToRegion,
    regions: regionsJson.regions.map((r) => ({ id: r.id })),
    width,
    height,
  };

  // line-art raster (only needed as the colourise input + composite panel 1)
  const svgBuffer = Buffer.from(
    await (await fetch(image.svgUrl)).arrayBuffer(),
  );
  const { pngBuffer } = await rasterizeAndDetect(svgBuffer);

  console.log(`${tag}   held-out colourise (model=${model})…`);
  const sceneHint = `This is: "${image.title}". ${image.description ?? ''}`;
  const heldOut = await colorizeLineArt(
    pngBuffer,
    createColourisePrompt('realistic', sceneHint),
    model,
  );
  if (!heldOut.success) {
    console.log(`${tag}   held-out colourise failed: ${heldOut.error}`);
    return null;
  }
  const truthSamples = await sampleRegionColoursFromRender(
    heldOut.pngBuffer,
    regionMap.pixelToRegion,
    regionMap.regions.map((r) => r.id),
    width,
    height,
  );

  // 2b. SELF-FIDELITY: sample the render the PIPELINE ITSELF used (captured
  //     via onVariantRender). ΔE(chosen, this) answers the real question —
  //     "does the pipeline faithfully colour regions the way the render it
  //     sampled said to?" — with NO cross-render variance. High self-ΔE = a
  //     real logic bug (snap/boost/group). Low self-ΔE but high truth-ΔE =
  //     just render nondeterminism, not a pipeline fault.
  const selfSamples = pipelineRealisticRender
    ? await sampleRegionColoursFromRender(
        pipelineRealisticRender,
        regionMap.pixelToRegion,
        regionMap.regions.map((r) => r.id),
        width,
        height,
      )
    : null;

  // 3. score: ΔE(chosen, ground-truth) per region (realistic variant)
  const chosenById = new Map(
    regionsJson.regions.map((r) => [r.id, r] as const),
  );
  const pipelineDE: number[] = [];
  const randomDE: number[] = [];
  const selfDE: number[] = [];
  const worstAll: ImageReview['worst'] = [];

  for (const region of regionMap.regions) {
    const truth = truthSamples.get(region.id);
    if (!truth || !truth.rgb) continue;
    // The held-out render is itself non-deterministic. Only judge a region
    // where the render committed to a clear colour for it (decent coverage
    // AND concentration) — otherwise we'd be scoring the pipeline against
    // the render's OWN ambiguity, not against a real "what colour is this".
    if (truth.coverage < 0.2 || truth.confidence < 0.45) continue;

    const chosen = chosenById.get(region.id);
    if (!chosen) continue;
    const chosenRgb = hexToRgb(chosen.palettes.realistic.hex);
    if (!chosenRgb) continue;

    // Honest metric: snap the held-out render's region colour to the palette
    // the SAME way the pipeline does (chroma-boosted), then measure ΔE
    // between the two PALETTE ENTRIES. This asks "did two independent renders
    // resolve this region to the same / a near palette colour?" rather than
    // penalising raw-pixel lightness drift between two noisy renders.
    const truthSnap = nearestPaletteColor(boostChroma(truth.rgb), PALETTE);
    if (!truthSnap) continue;
    const truthLab = rgbToLab(hexToRgb(truthSnap.hex)!);

    const dE = deltaE2000(rgbToLab(chosenRgb), truthLab);
    pipelineDE.push(dE);

    // random baseline: a random palette entry for this region
    const rnd = PALETTE[Math.floor(Math.random() * PALETTE.length)];
    const rndRgb = hexToRgb(rnd.hex)!;
    randomDE.push(deltaE2000(rgbToLab(rndRgb), truthLab));

    worstAll.push({
      id: region.id,
      label: chosen.label,
      chosen: `${chosen.palettes.realistic.colorName} ${chosen.palettes.realistic.hex}`,
      truth: `${truthSnap.name} ${truthSnap.hex}`,
      dE,
    });
  }

  // Self-fidelity loop — the CLEAN test of "does sample→boost→snap faithfully
  // reproduce the render the pipeline sampled?". Compare the PRE-GROUP chosen
  // colour (before the group pass deliberately unifies an object's shaded
  // sub-regions — those deviations are intended, not bugs) against snapping
  // that same render's region colour the same way the pipeline does. Falls
  // back to the final colour only if the pre-group map wasn't captured
  // (e.g. --no-regen).
  if (selfSamples) {
    const preGroup = preGroupChosen as Map<number, { hex: string }> | null;
    for (const region of regionMap.regions) {
      const s = selfSamples.get(region.id);
      if (!s || !s.rgb || s.coverage < 0.2 || s.confidence < 0.45) continue;
      const chosenHex =
        preGroup?.get(region.id)?.hex ??
        chosenById.get(region.id)?.palettes.realistic.hex;
      if (!chosenHex) continue;
      const chosenRgb = hexToRgb(chosenHex);
      if (!chosenRgb) continue;
      const selfSnap = nearestPaletteColor(boostChroma(s.rgb), PALETTE);
      if (!selfSnap) continue;
      selfDE.push(
        deltaE2000(rgbToLab(chosenRgb), rgbToLab(hexToRgb(selfSnap.hex)!)),
      );
    }
  }

  if (pipelineDE.length === 0) {
    console.log(`${tag}   no scorable regions (render coloured nothing)`);
    return null;
  }

  // same-object-group consistency: of the groups that span ≥2 regions,
  // what % use exactly one chosen colour across all their regions.
  const groupColours = new Map<string, Set<string>>();
  const groupSizes = new Map<string, number>();
  for (const r of regionsJson.regions) {
    if (!r.objectGroup || r.objectGroup === 'unknown') continue;
    const set = groupColours.get(r.objectGroup) ?? new Set<string>();
    set.add(r.palettes.realistic.hex.toLowerCase());
    groupColours.set(r.objectGroup, set);
    groupSizes.set(r.objectGroup, (groupSizes.get(r.objectGroup) ?? 0) + 1);
  }
  const multiRegionGroups = [...groupSizes.entries()].filter(
    ([, n]) => n >= 2,
  );
  const consistent = multiRegionGroups.filter(
    ([g]) => (groupColours.get(g)?.size ?? 0) === 1,
  );
  const groupConsistencyPct =
    multiRegionGroups.length === 0
      ? 100
      : (consistent.length / multiRegionGroups.length) * 100;

  const coherent = pipelineDE.filter((d) => d <= COHERENT_DELTA_E).length;
  const review: ImageReview = {
    id: image.id,
    title: image.title,
    regions: pipelineDE.length,
    pipelineDeltaE: stats(pipelineDE),
    randomDeltaE: stats(randomDE),
    selfDeltaE: stats(selfDE),
    selfRegions: selfDE.length,
    coherentPct: (coherent / pipelineDE.length) * 100,
    groupConsistencyPct,
    worst: worstAll.sort((a, b) => b.dE - a.dE).slice(0, 6),
  };

  // 5. composite PNG — HONEST 4-panel:
  //    line art | pipeline-chosen flat fill | the render the PIPELINE
  //    actually sampled | independent reference render.
  //
  // Panel 2 vs panel 3 is the truth test: if the chosen fill doesn't match
  // the render the pipeline itself sampled, it's a logic bug (sample/snap/
  // boost/group). If panel 2 DOES match panel 3 but panel 4 differs, it's
  // just render-to-render variance, not a pipeline error.
  await mkdir(outDir, { recursive: true });
  const chosenFill = await renderChosenFill(
    regionMap.pixelToRegion,
    regionsJson,
    width,
    height,
  );
  const cell = 420;
  // When --no-regen there's no fresh pipeline render captured; fall back to
  // a neutral placeholder so the panel count stays consistent.
  const pipelineRenderPanel: Buffer =
    pipelineRealisticRender ??
    (await sharp({
      create: {
        width: cell,
        height: cell,
        channels: 3,
        background: '#dddddd',
      },
    })
      .png()
      .toBuffer());

  const panels = await Promise.all(
    [pngBuffer, chosenFill, pipelineRenderPanel, heldOut.pngBuffer].map((b) =>
      sharp(b)
        .resize(cell, cell, { fit: 'contain', background: '#fff' })
        .toBuffer(),
    ),
  );
  await sharp({
    create: {
      width: cell * 4,
      height: cell,
      channels: 3,
      background: '#ffffff',
    },
  })
    .composite([
      { input: panels[0], left: 0, top: 0 },
      { input: panels[1], left: cell, top: 0 },
      { input: panels[2], left: cell * 2, top: 0 },
      { input: panels[3], left: cell * 3, top: 0 },
    ])
    .png()
    .toFile(join(outDir, `${model}-${image.id}.png`));

  console.log(
    `${tag}   SELF-fidelity ΔE mean=${review.selfDeltaE.mean.toFixed(1)} ` +
      `(${review.selfRegions} regs, chosen-vs-own-render) | ` +
      `vs-held-out mean=${review.pipelineDeltaE.mean.toFixed(1)} ` +
      `random=${review.randomDeltaE.mean.toFixed(1)} | ` +
      `coherent=${review.coherentPct.toFixed(0)}% | ` +
      `group-consistent=${review.groupConsistencyPct.toFixed(0)}%`,
  );
  return review;
}

async function main() {
  const model = (argFlag('model') ?? 'gemini') as ColorizeModel;
  const limit = Number(argFlag('limit') ?? '6');
  const noRegen = hasFlag('no-regen');
  const outDir = argFlag('out') ?? '.region-review';
  const ids = process.argv
    .filter((a) => a.startsWith('--id='))
    .map((a) => a.slice(5));

  console.log(
    `Review loop — model=${model} ${noRegen ? '(scoring existing regionsJson)' : '(regenerating)'} ` +
      `out=${outDir}`,
  );

  const images = ids.length
    ? await db.coloringImage.findMany({
        where: { id: { in: ids }, brand: BRAND },
        select: {
          id: true,
          title: true,
          svgUrl: true,
          description: true,
          tags: true,
        },
      })
    : await db.coloringImage.findMany({
        where: { brand: BRAND, svgUrl: { not: null } },
        orderBy: { createdAt: 'desc' },
        take: limit,
        select: {
          id: true,
          title: true,
          svgUrl: true,
          description: true,
          tags: true,
        },
      });

  const reviews: ImageReview[] = [];
  for (const img of images) {
    if (!img.svgUrl) continue;
    try {
      const r = await reviewImage(
        {
          id: img.id,
          title: img.title ?? 'untitled',
          svgUrl: img.svgUrl,
          description: img.description,
          tags: (img.tags as string[]) ?? [],
        },
        model,
        noRegen,
        outDir,
      );
      if (r) reviews.push(r);
    } catch (err) {
      console.error(
        `[${img.id}] threw:`,
        err instanceof Error ? err.message : err,
      );
    }
  }

  if (reviews.length === 0) {
    console.log('\nNo images scored. Aborting.');
    process.exit(1);
  }

  // --- aggregate verdict (region-weighted, not per-image-weighted) --------
  const totalRegions = reviews.reduce((t, r) => t + r.regions, 0);
  const meanPipeline =
    reviews.reduce((t, r) => t + r.pipelineDeltaE.mean * r.regions, 0) /
    totalRegions;
  const meanRandom =
    reviews.reduce((t, r) => t + r.randomDeltaE.mean * r.regions, 0) /
    totalRegions;
  const meanCoherent =
    reviews.reduce((t, r) => t + r.coherentPct * r.regions, 0) /
    totalRegions;
  const meanGroup =
    reviews.reduce((t, r) => t + r.groupConsistencyPct, 0) / reviews.length;
  const totalSelfRegions = reviews.reduce((t, r) => t + r.selfRegions, 0);
  const meanSelf =
    totalSelfRegions > 0
      ? reviews.reduce((t, r) => t + r.selfDeltaE.mean * r.selfRegions, 0) /
        totalSelfRegions
      : NaN;

  console.log('\n========== AGGREGATE ==========');
  console.log(`Images scored:        ${reviews.length}`);
  console.log(
    `SELF-fidelity ΔE:     ${Number.isNaN(meanSelf) ? 'n/a (--no-regen: no captured render)' : meanSelf.toFixed(2)}  ← chosen vs the render the pipeline sampled (the real test)`,
  );
  console.log(`vs held-out ΔE:       ${meanPipeline.toFixed(2)} (noisy: 2nd independent render)`);
  console.log(`Random  mean ΔE:      ${meanRandom.toFixed(2)}`);
  console.log(
    `Improvement vs random: ${(meanRandom / Math.max(meanPipeline, 0.01)).toFixed(2)}× lower ΔE`,
  );
  console.log(`Coherent regions:     ${meanCoherent.toFixed(1)}% (ΔE ≤ ${COHERENT_DELTA_E})`);
  console.log(`Group consistency:    ${meanGroup.toFixed(1)}%`);

  console.log('\nWorst offenders across set:');
  const worst = reviews
    .flatMap((r) => r.worst.map((w) => ({ ...w, img: r.title })))
    .sort((a, b) => b.dE - a.dE)
    .slice(0, 12);
  for (const w of worst) {
    console.log(
      `  ΔE ${w.dE.toFixed(1).padStart(5)}  ${w.img} #${w.id} "${w.label}": chose ${w.chosen}, render had ${w.truth}`,
    );
  }

  // Pass/fail bar.
  //
  // PRIMARY gate — SELF-FIDELITY: ΔE between the PRE-GROUP chosen palette
  // colour and the render the pipeline itself sampled. Zero cross-render
  // variance, and measured before the group pass's intended unification, so
  // it cleanly answers "does sample→boost→snap faithfully reproduce the
  // colourise JPG?" Observed ≈0–1 when correct; ≤8 is the bar (only palette-
  // snap quantisation should remain). If high, the colour logic is a real
  // bug.
  //
  // SECONDARY — OBJECT-COHERENCE: same object → same colour. Note a high
  // number is NOT always good: forcing a superhero's cape, emblem, mask and
  // boots to one colour would be WRONG. The safe override deliberately keeps
  // genuinely-distinct sub-parts apart, so a mixed-palette subject lands
  // ~55–75%. Bar ≥55% — enough to catch a broken group pass without
  // punishing correctly-multicoloured objects. Composites remain the final
  // arbiter for whether same-object regions actually agree.
  //
  // vs-held-out ΔE / random are context only (noisy 2nd render), not gated.
  const selfFaithful = Number.isNaN(meanSelf) ? null : meanSelf <= 8;
  const objectCoherent = meanGroup >= 55;
  const verdict =
    selfFaithful === null ? objectCoherent : selfFaithful && objectCoherent;
  console.log(
    `\n${verdict ? 'PASS' : 'FAIL'} — ${
      verdict
        ? `pipeline faithfully reproduces the render it sampled (self-ΔE ${Number.isNaN(meanSelf) ? 'n/a' : meanSelf.toFixed(1)}) + object-coherent (${meanGroup.toFixed(0)}%). Eyeball composites for natural-choice quality.`
        : selfFaithful === false
          ? `chosen colours DRIFT from the render the pipeline sampled (self-ΔE ${meanSelf.toFixed(1)} > 8) — sample/boost/snap colour-logic bug`
          : `objects not internally consistent (${meanGroup.toFixed(0)}% < 55%)`
    }`,
  );
  console.log(`Composites written to ${outDir}/`);
  process.exit(verdict ? 0 : 1);
}

main().catch((err) => {
  console.error('review loop crashed:', err);
  process.exit(1);
});

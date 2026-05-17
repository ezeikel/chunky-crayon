# Region palette (auto-color / Magic Brush colour selection)

How the colour for every region in a coloring page is decided — the thing the
user sees when they tap **Auto Color** / **Magic Fill** or use the **Magic
Brush**. Spans `packages/coloring-core`, the CC/CH web actions, the Hetzner
worker, and a headless review-loop script. This is a make-or-break feature and
is showcased in the auto demo reels.

## The contract (unchanged, backward compatible)

Every coloring image stores a **region store**:

- `regionMapUrl` → gzipped `Uint16Array` pixel→regionId lookup in R2
- `regionMapWidth` / `regionMapHeight`
- `regionsJson` → `{ sceneDescription, sourceWidth, sourceHeight,
  regionPixelCount, regions: [{ id, bounds, centroid, pixelCount, label,
  objectGroup, palettes: { realistic|pastel|cute|surprise: {hex,colorName} } }] }`

The client (`packages/coloring-ui/src/useRegionStore.ts`) reads
`regions[].palettes[variant].{hex,colorName}`. **Nothing about how colours are
chosen changes this shape** — the work below is purely "pick better colours".

## How colours are chosen (the pipeline)

`generateRegionStoreLogic` in
`packages/coloring-core/src/actions/generate-regions.ts`:

1. Rasterise the traced SVG (1024px), morphological gap-close, flood-fill
   detect regions → `pixelToRegion` + region list. (unchanged)
2. One AI labelling pass (Gemini): a coloured region-overlay PNG + the line
   art → a verified semantic `label` + `objectGroup` per region. (unchanged)
3. **Per variant (×4, in parallel) — the new bit:**
   1. **Colourise**: `colorizeLineArt()` paints the line art with a
      variant-specific flat-fill prompt (`colorise-prompts.ts`). Model is
      configurable (`gemini` default, or `gpt`). It has a **render-quality
      gate**: a muddy/desaturated render is re-rolled up to 3× and the most
      colourful attempt kept.
   2. **Sample**: `sampleRegionColoursFromRender()` resizes the render to the
      region-map raster and takes each region's **modal binned colour**
      (4-bit/channel, line-art-black + unfilled-white excluded), with
      `coverage` + `confidence`.
   3. **Chroma-boost + snap**: `boostChroma()` pulls the sampled colour toward
      full saturation (a washed-out green snaps to Grass Green, not grey
      Slate; true greys are left alone), then `nearestPaletteColor()` snaps to
      the constrained shipping palette via CIEDE2000.
   4. **Trust vs repair**: clean, confident, well-representable regions are
      kept. The rest go to **one AI repair call** that SEES the render and is
      told the locked colours, and only re-colours the outliers.
   5. **Object-group consistency**: every region in an `objectGroup` is forced
      to the group's **size-weighted pooled sampled colour** (so one
      mis-sampled sliver can't fragment a body) unless a region is *very*
      confidently a dramatically different colour (a red stripe on a white
      sail). This enforces "same object = same colour", the #1 rule.
4. Merge into `regionsJson`, gzip the region map. (unchanged)

### Why sample a render instead of asking the AI for colours directly

The old pipeline asked the AI to pick palette colours blind from text labels.
The review loop measured it as **barely better than random** (~1.1× vs a
random palette assignment). A colourise model, by contrast, produces coherent,
human-sensible colour *as a side effect of painting the scene* — we just read
those colours back. The catch: **render quality is the single point of
failure** — a muddy/over-shaded render samples to mud. The render-quality gate
+ `boostChroma` exist specifically to defend against that (the "grey
dinosaur" failure the review loop caught and that those two fixes solved).

## Where it runs (every generation path)

The region store is generated on **every** image-creation path, fired in
parallel with `colored-reference` / `fill-points` / `background-music`:

- Daily image: `apps/chunky-crayon-worker/src/coloring-image/daily-pipeline.ts`
  (`Promise.allSettled`) → `record/region-store.ts` →
  `generateRegionStoreLogic`.
- User / admin create: web `requestAllPipelineFromWorker` → worker
  `/generate/region-store` (`jobs.ts` fanout) → same.
- Dev re-run: `/[locale]/dev/region-store/[id]` viewer "Regenerate" button →
  `regenerate.ts` → web `generateRegionStore` action → same.

The pipeline generates its OWN colourise renders internally — it does **not**
depend on `coloredReferenceUrl` (that's a separate parallel job; depending on
it would create an ordering race). `realistic`'s render is functionally a
duplicate of `coloredReferenceUrl`; deduping them is a deferred cleanup.

### Colorize model is configurable

`GenerateRegionStoreConfig.colorizeModel` (`"gemini" | "gpt"`, default
`"gemini"`). Threaded through the web `generateRegionStore` action and worker
wrapper as an optional param; production callers leave it unset → Gemini. The
dev region-store viewer (CC + CH) has a Gemini/GPT toggle for side-by-side
comparison. Gemini is the default: it makes more naturally-expected colour
choices (green dinosaur) where GPT Image 2 sometimes drifts (blue dinosaur),
though GPT renders slightly flatter.

## The review loop (how we know it's good)

`apps/chunky-crayon-web/scripts/review-region-colors.ts` — headless, no UI:

```
cd apps/chunky-crayon-web
pnpm tsx -r dotenv/config scripts/review-region-colors.ts \
  dotenv_config_path=.env.local \
  --model=gemini --limit=6 [--id=<id> ...] [--no-regen] [--out=<dir>]
```

For each image it runs the real pipeline, then generates an **independent
held-out colourise** of the same line art and, per region, compares the
pipeline's chosen palette colour to the held-out render's region colour
(snapped the same chroma-boosted way). It reports mean/median/p90 ΔE, a
**random-assignment baseline**, % coherent, **object-group consistency**, the
worst offenders by label, and writes a 3-panel composite
(line art | pipeline fill | held-out render) per image.

Pass/fail gate is deliberately NOT absolute coherence — the held-out render is
a second non-deterministic colourise and on ambiguous subjects (an FBI agent's
jacket) Gemini colours it differently every run, so absolute ΔE is noisy.
The gate is: **≥1.4× better than random** (the literal "not random" test) AND
**≥70% object-group consistency** (deterministic, the user's #1 requirement).
Natural-choice quality (green dino, not blue) is judged by eyeballing the
always-written composites — no metric fully captures it.

`pnpm --filter @one-colored-pixel/coloring-core exec tsx
scripts/check-color-and-sampler.mts` is the fast offline guard (no AI/DB) for
the Lab maths, palette snapping, chroma boost, and sampler.

Always target the **development** Neon branch (`.env.local`,
`ep-withered-meadow` = `br-wandering-salad`). Re-run the loop after any
colour-logic change.

## Files

| Concern | File |
| --- | --- |
| Pipeline orchestration + trust/repair/group passes | `packages/coloring-core/src/actions/generate-regions.ts` |
| Colour maths (Lab, CIEDE2000, snap, chroma boost) | `packages/coloring-core/src/utils/color.ts` |
| Variant flat-fill prompts | `packages/coloring-core/src/actions/colorise-prompts.ts` |
| Colourise + render-quality gate (Gemini/GPT) | `packages/coloring-core/src/actions/colorize-line-art.ts` |
| Per-region modal-colour sampler | `packages/coloring-core/src/actions/sample-region-colours.ts` |
| Web action wrapper (CC + CH) | `apps/*/app/actions/generate-regions.ts` |
| Worker wrapper | `apps/chunky-crayon-worker/src/record/region-store.ts` |
| Dev viewer + model toggle (CC + CH) | `apps/*/app/[locale]/dev/region-store/[id]/` |
| Headless review loop | `apps/chunky-crayon-web/scripts/review-region-colors.ts` |
| Offline maths guard | `packages/coloring-core/scripts/check-color-and-sampler.mts` |

Backfill of existing images is intentionally **deferred** — new generations
get the new logic; the existing `scripts/backfill-region-stores*.ts` are
unchanged and can backfill later once the new output is trusted.

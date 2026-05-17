# Region palette (auto-color / Magic Brush colour selection)

How the colour for every region in a coloring page is decided — the thing the
user sees when they tap **Auto Color** / **Magic Fill** or use the **Magic
Brush**. Spans `packages/coloring-core`, the CC/CH web actions, the Hetzner
worker, and a headless review-loop script. This is a make-or-break feature and
is showcased in the auto demo reels.

## ⚠️ Flat per-region fill is INTENDED — do not "fix" it

Each region gets ONE flat colour. The colourise render the pipeline samples
is a smoothly-*shaded* painting; our output is flat blocks. **This gap is by
design, not a defect**, and was a deliberate product decision:

- It's a kids' coloring app. The output must look like *a child coloured a
  coloring book* (flat, bright, inside the lines), not a finished adult
  illustration. Flat is the on-brand, honest aesthetic for ages 3–8.
- Magic Brush only works flat: the child sweeps and *their chosen colour*
  appears — that's their accomplishment. Revealing a pre-shaded painting
  would mean uncovering an adult's artwork, not colouring.
- The palette/variant system (realistic/pastel/cute/surprise) only has
  meaning with flat, namable colours.

The review composite deliberately shows flat output next to the shaded
render. **The render is a reference for COLOUR SENSIBILITY ONLY** (is the
fur brown? the sky blue?), **never a shading/fidelity target.** Do not
re-chase "make it look like the render" — that path was explored, costed,
and rejected; reproducing the painting would make the product worse for its
audience. If output looks "not good enough" next to the render, check it's a
*colour* problem (wrong/random colours) before doing anything — flatness
itself is not the problem to solve.

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
   3. **Chroma-clean (NO palette snap for trusted regions)**: `boostChroma()`
      is rescue-only — it pulls a *washed-out* colour back toward its hue
      (muddy green → green) but a saturation window leaves already-good tones
      (fur, skin, tan) and true greys untouched. The cleaned colour is then
      kept **EXACTLY** (ΔE 0 vs the render). Nothing downstream requires
      palette membership — the canvas paints whatever hex we store — so
      snapping to ~50 crayons was self-imposed precision loss and is gone for
      the trusted path. `nearestPaletteColor()` is now only a FALLBACK for
      low-confidence / unsampleable regions (which go to AI repair anyway),
      and its name is kept as a human-readable `colorName` label while the
      `hex` stays exact.
   4. **Trust vs repair**: clean, confident regions keep their exact colour.
      The rest go to **one AI repair call** that SEES the render and is told
      the locked colours, and only re-colours the outliers.
   5. **Object-group consistency**: members are clustered by perceptual
      similarity (CIEDE2000 ≤ 10 — a body painted in 12 slightly-different
      greens is one cluster); the dominant cluster's largest-area member's
      exact colour becomes the group colour, unless a region is *very*
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

For each image it runs the real pipeline (via `generateRegionStoreLogic`
directly, with the `onVariantRender` + `onVariantPreGroup` debug hooks), then
writes a **4-panel composite**: line art | pipeline-chosen fill | **the render
the pipeline actually sampled** | an independent held-out render.

**self-fidelity ΔE** (pre-group chosen colour vs the colour the pipeline's
OWN render put in that region) is now ≈0 essentially **by construction** —
trusted regions store the exact sampled colour, so this confirms the wiring
is intact but is no longer the discriminating quality signal. The real
arbiters now are the **visual composites** (do the exact colours look like a
natural, kid-friendly coloring? — the "trust the render" bet) and
**object-group consistency**.

Two non-obvious requirements, learned the hard way:

- **Score against the pipeline's OWN stored region map** (gunzip
  `regionMapUrl`), NEVER a freshly re-detected one. `detectAllRegionsFromPixels`
  numbers regions by raster scan order; a re-detected map's "region 20" is a
  different physical region than `regionsJson`'s, so every per-region compare
  (and the chosen-fill composite) lines up the wrong regions. This masqueraded
  as a pipeline bug for a long time.
- **Measure self-fidelity PRE group-pass.** The group pass deliberately
  unifies an object's shaded sub-regions; counting that as "drift" inflates
  the number. The `onVariantPreGroup` hook exposes the pre-group map.

Gates: **self-fidelity ΔE ≤ 8** (≈0 expected now — exact colours; a non-zero
value means a wiring regression) AND **object-group consistency ≥ 55%** (NOT
higher — forcing a superhero's cape/emblem/mask to one colour would be
*wrong*; the safe override keeps
genuinely-distinct sub-parts apart, so mixed-palette subjects land 55–75%).
The vs-held-out ΔE and random baseline are reported for context only (the
held-out render is a noisy 2nd colourise) and are **not** gated on. Composites
remain the visual arbiter for natural-choice quality (green dino, not blue).

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

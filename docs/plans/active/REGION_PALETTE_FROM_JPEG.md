# Spike: Seed region palettes from the colored-reference JPEG

## Status

TODO — discovery / spike. No work scheduled.

## Why this matters

We have two parallel "what colors should this scene be?" pipelines that don't talk to each other:

1. **`coloredReferenceUrl`** (a JPEG written by `apps/chunky-crayon-worker/src/record/colored-reference.ts`) — straight diffusion model output. Painterly, anti-aliased, beautifully shaded. Looks like a finished painting. Not reproducible with flood-fill.

2. **`regionsJson` palette variants** (built in `packages/coloring-core/src/actions/generate-regions.ts`, four parallel Claude calls — realistic / pastel / cute / surprise) — flat color per detected region. This is what the in-app Magic Brush / Auto Color actually fills, so it's the ground truth of "what the user gets". But the AI picks colors blind from a constrained palette and the choices are sometimes underwhelming.

The JPEG consistently looks better than any of the four region variants — it's just that we can't ship the JPEG as the reproducible product. We're paying twice for color decisions and only using the worse one in the app.

The thesis: **sample the JPEG to inform the region palette**. Specifically the "realistic" variant, where the goal is "what color should this region actually be?" — exactly what the diffusion model already answered.

## Idea

Replace (or augment) the AI call for the **realistic** palette variant with a deterministic step that:

1. Loads `coloredReferenceUrl` and the region map (`regionMapUrl` — the gzipped Uint16Array pixel→regionId lookup).
2. For each region, reads the JPEG pixels at every pixel that belongs to that region.
3. Picks a representative color per region (k-means with k=1 over the region's pixels, or the modal binned color — _not_ the centroid pixel, which can land on a highlight or shadow).
4. Snaps that color to the nearest entry in `config.allColors` (the constrained palette we ship — keeps in-app rendering identical to today).
5. Writes that as the region's `realistic` palette entry.

`pastel`, `cute`, `surprise` stay AI-driven because their job is creative reinterpretation, not "what color is the thing actually". Only `realistic` benefits from the JPEG.

## Files involved

- `packages/coloring-core/src/actions/generate-regions.ts` — palette assignment lives here. Lines 389–633 (single-variant AI call → merge into per-region palette).
- `apps/chunky-crayon-worker/src/record/region-store.ts` — orchestrates region store generation; would call into the new sampler before the AI step.
- `apps/chunky-crayon-worker/src/record/colored-reference.ts` — already produces the JPEG; need to confirm it runs **before** region store generation in the pipeline, otherwise this spike re-orders the worker.
- `packages/canvas/src/regionDetection.ts` (or wherever the region map format is read) — need a way to iterate "all pixels with regionId = X" given the gzipped Uint16Array.
- `packages/db/prisma/schema.prisma` — no schema change required. `regionsJson` already holds palette variants per region.

## Open questions for the spike

1. **Sampling strategy.** Centroid-pixel is fastest but unreliable. Bounded-box dominant color (k-means k=1 inside the region's bounding box, masked by region membership) is more robust but ~10× more compute per region. Worth measuring on a few representative images before picking.
2. **Snap distance.** When the JPEG dominant color is far from any palette entry (e.g. JPEG says `#A87B45` muddy brown, our palette only has `#7B4B2A` and `#C49A6C`), how do we choose? Nearest in CIE Lab Δ*E*? With a fallback to AI if Δ*E* exceeds a threshold? Tuneable.
3. **Pipeline order.** Confirm `coloredReferenceUrl` is written before region store. If not, the worker steps need re-ordering or the region-store step needs to wait/fetch on demand.
4. **Backfill.** ~thousands of existing images already have `regionsJson`. Do we backfill (`scripts/backfill-region-stores.ts` already exists) or only apply to new generations? Probably backfill — the visual quality lift on the realistic variant should be immediately visible in the dev region-store viewer (`/dev/region-store/[id]`).
5. **Cost.** Today: 4 Claude calls per image. Spike: 3 Claude calls + 1 cheap deterministic step. So a small **reduction** in API cost.

## Why this is gated as a spike (not a "just ship it")

- Risk that region detection misalignments (e.g. region map computed at lower resolution than the JPEG) make pixel sampling noisy. Need to confirm the resolution math.
- Risk that "snap to palette" loses the JPEG's nuance entirely and produces something no better than the AI. Need a side-by-side eyeball test on 10–20 images before declaring it a win.
- The dev region-store viewer at `/dev/region-store/[id]` is the right tool to validate — it already shows the four variants. We could ship this gated behind a `?strategy=jpeg-sampled` query param first, eyeball the output on a curated set, then promote it to default if the lift is real.

## Related context

- OG images currently use line art (not the JPEG) so they honestly preview what the user gets. See `apps/chunky-crayon-web/lib/og/data.ts` `getFeaturedColoringImagesForOG` and `apps/chunky-crayon-web/app/[locale]/coloring-image/[id]/opengraph-image.tsx` — both deliberately reference this plan in inline comments.
- If this spike succeeds, a follow-up unlocks rendering a real "regions painted" PNG (line art + realistic palette flood-filled and rasterized) — at which point the OGs and `/admin/og` previews can switch to that for an even better card while staying honest.
- Memory: `feedback_generation_parity` — generated images need full post-processing pipeline (fill points, region store, colored reference). Both pipelines must keep running on every generation path; this spike doesn't change that requirement.

# Mobile canvas immediate-mode (the stroke-flash invariant)

> Read this before touching how committed strokes render on CC mobile
> (`apps/chunky-crayon-mobile/components/ImageCanvas/ImageCanvas.tsx`). It encodes
> a hard-won invariant. Breaking it brings back the intermittent stroke "flash"
> that took multiple days to diagnose and fix.

## The invariant

**A brush-stroke commit must not trigger a React-driven canvas redraw.**

Committed brush strokes are baked into a single retained `SkPicture` held in a
**shared value** (`committedPicture = useSharedValue<SkPicture>`), rendered with
`<Picture picture={committedPicture} />`. Finishing a stroke happens **on the UI
thread**, inside the pan gesture's `onFinalize` worklet: it builds a new picture
(`createPicture(c => { c.drawPicture(old); drawBakedStroke(c, livePath.value, …) })`),
assigns it to `committedPicture.value`, and clears `livePath` — all in **one
worklet tick → one Skia redraw**. `addAction` (the Zustand store write for
undo/persistence) still runs via `runOnJS`, but for baked brushes it feeds
nothing the canvas draws, so its React commit causes **no canvas redraw**.

This is web's model: in `packages/coloring-ui/src/ImageCanvas.tsx`, `pointerup`
records an action for undo/sync and **redraws nothing** — the stroke is already on
the persistent drawing bitmap. Mobile now matches that structurally.

## Why — the failure mode

The flash was: a just-finished stroke intermittently blinks once, after finger-up,
during steady continuous drawing (no navigation). Web never did this.

Root cause (device-measured, see `~/.claude/plans/cc-mobile-stroke-flash.md`): it
was **never a content/keying bug**. A stroke commit that went through React fired
**multiple Skia redraws in a ~3ms burst** — the committed `<Path>` appearing, a
frozen hand-off copy unmounting, the live path clearing, plus every other
`visibleActions` consumer (`renderPaths`, `renderStickers`, `renderReveals`,
`clearGeneration`, `isCanvasEmpty`, `useFillLayer`) re-evaluating. On
rn-skia 2.6.2 + reanimated 4.3.1 (Fabric/bridgeless), the renderer **races those
presents** — first-frame vs mapper#1 straddling a vsync — and occasionally shows an
intermediate frame. That one frame is the flash.

The signature in the `[FLASH_NATIVE]` instrumentation: three back-to-back
`redraw build draw#N/N+1/N+2` where the **middle one is missing its `mapper#1`
present** (its mapper was killed by the next redraw's `stopMapper` before it
painted). After the fix, every commit shows a single clean `draw#N` pair
(first-frame + mapper#1, sub-ms hop, both presents within ~0.1ms).

## What was tried and did NOT work (don't re-attempt)

1. **Frozen live→committed hand-off** (3 variants): copy livePath into a frozen
   shared value at finger-up, swap it for the committed `<Path>` in one React
   commit. All flashed — the swap is still a multi-`setState` React commit that
   produces a redraw burst.
2. **Offscreen `SkSurface` behind React state**: bake strokes into a mutable
   surface, publish a snapshot via `setState`. Still flashed — the commit still
   went through `addAction` render + the publish `setState` + the livePath clear =
   3 redraws raced. Moving the buffer off `<Path>` nodes is necessary but **not
   sufficient**; the commit itself must leave React.
3. Offscreen saveLayer toggle, stable-vs-index keys, disabling
   snapshots/autosave/server-sync — all device-tested, none was the cause.

The thing that worked was the only one that takes the commit **entirely off the
React channel**: the shared-value `SkPicture` mutated in the `onFinalize` worklet.

## Rules for future changes

- **Never** make a stroke commit go through a React `setState` / store write that a
  Canvas child reads. If you must record to the store (undo/persistence), do it via
  `runOnJS` AFTER the worklet has already updated `committedPicture`, and ensure no
  Canvas node depends on the stroke action that was just added.
- **The live stroke clears in the same worklet tick** the picture gains it — never
  on a later JS-thread callback (that reopens the vanish gap).
- **Undo / redo / clear / restore / 409-merge** are the only times the picture is
  rebuilt from `visibleActions` (`rebuildCommittedPicture`, off the hot path). The
  commit hot path is append-one detected (`bakedIdsRef`) and **skips** the rebuild.
- `drawBakedStroke` and the `createPicture` callback are `"worklet"` and must use
  only synchronous Skia primitives (Paint/Color/MaskFilter/drawPath/drawPicture).
  No store reads, no async, no JS-only helpers that aren't workletized.
- Paint must match the **declarative `renderPaths`/`renderLivePreviewPath`** inline
  paints exactly (NOT `createBrushPaint` — it uses different blend modes:
  marker Multiply, glow Screen, width bumps). The live preview and the baked commit
  must look identical or the stroke visibly changes the instant it commits.
- Always **device-verify** a 1-frame flash with your own eyes at 120Hz — the sim
  records at ~2.4fps and the `[FLASH_NATIVE]` UI-thread logs, not screenshots, are
  the real instrument. "Not fixed until tested on device."

## Diagnostics (kept, off by default)

- `[FLASH_NATIVE]` logs live in a patched copy of rn-skia's
  `Container.native.ts` + `Recorder/ReanimatedRecorder.ts` (src, NOT lib/module —
  Metro bundles Skia from its `react-native: src/index.ts` field). They log every
  Skia present: draw id, source (`first-frame`/`mapper#1`), JS-build→UI-present
  `hop` ms, and a path-count fingerprint.
- `[FLASH_DIAG]` JS logs + `STROKE_BAKE_LOG` (commit/rebuild trace) + the
  `DIAG_DISABLE_*` bisect toggles live in `ImageCanvas.tsx`, all off/false by
  default. Flip one flag to re-diagnose instead of rebuilding the harness.

## Status / scope

v1 baked **crayon + marker** and collapsed the **magic-brush** hand-off (its SrcIn
coverage is idempotent, so no frozen copy is needed).

v2 expanded the baked set to **all additive brushes**:
crayon/marker/pencil/paintbrush/rainbow/glow/neon — every brush whose paint is
color + alpha + an optional blur `MaskFilter` (`bakedBrushParams` returns
`{alpha, blurSigma, blurStyle}` matched to `renderPaths`; `drawBakedStroke` applies
them, worklet-safe). These now commit burst-free on the UI thread.

Still **React `<Path>` nodes** (not baked), so their commit goes through React and
can still flash — both are niche:

- **eraser** — its `dstOut` must cut the FILL image beneath, which only works as a
  node sibling in the erasable saveLayer, not inside the strokes picture. Baking it
  would require baking the fill layer into the picture too (couples to the async
  flood-fill layer). Deferred. It also has the interleave z-order caveat (a baked
  picture is one layer drawn before the eraser node, so the eraser cuts the whole
  picture regardless of commit order).
- **glitter** — sparkle particle sub-paths via JS utils (`generateGlitterParticles`
  / `createSparklePath`) that aren't trivially worklet-safe.
- **textured crayon/pencil** — shader paint via `createBrushPaint`, not worklet-safe;
  gated behind the `texturedBrushes` flag, which is OFF by default (dead path).

Because eraser/glitter render as nodes ABOVE the baked picture, mixing them with
additive strokes has a z-order edge (e.g. glitter-then-crayon). Rare; documented.

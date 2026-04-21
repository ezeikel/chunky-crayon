# Ad system (Chunky Crayon)

Config-driven static + video ads. Adding a new ad = push one `Campaign` object; no component code changes.

- **Source of truth:** [`apps/chunky-crayon-web/lib/ads/campaigns.ts`](../../apps/chunky-crayon-web/lib/ads/campaigns.ts)
- **Schema:** [`apps/chunky-crayon-web/lib/ads/schema.ts`](../../apps/chunky-crayon-web/lib/ads/schema.ts)
- **Preview:** `http://localhost:3000/dev/ads` (index) or `/dev/ads/<campaign-id>` (single)
- **Exports:** [`apps/chunky-crayon-web/public/ads/`](../../apps/chunky-crayon-web/public/ads/) — `<campaign-id>--<format>.png`

Dev-only (`NODE_ENV === 'production'` → 404). Does not ship to prod.

---

## Quick start: adding a new ad

```ts
// apps/chunky-crayon-web/lib/ads/campaigns.ts

export const campaigns: Campaign[] = [
  // ... existing ones

  {
    id: "my-new-ad",
    name: "My new ad",
    template: "hero", // 'hero' | 'app-screen' | 'before-after'
    asset: {
      key: "unicorn", // unique key — shared across campaigns OK
      prompt: "A cheerful cartoon unicorn eating ice cream on a beach",
      generateColoredVariant: true, // only for before-after
    },
    copy: {
      headline: "“Mum, can I color a unicorn?”",
      subhead: "Yeah. Kids describe it, we make it.",
      cta: "Make their page",
      proofQuote: "Real quote. Real page.", // hero-only
      // eyebrow: '...',                    // before-after-only
    },
    meta: {
      primaryText: [
        "Primary text variant 1 for Meta Ads Manager (≤125 chars ideal).",
        "Primary text variant 2.",
        "Primary text variant 3.",
      ],
    },
  },
];
```

Then:

```bash
cd apps/chunky-crayon-web
pnpm dev                                          # start dev server on :3000

# generate missing coloring pages (and colored variants)
pnpm tsx scripts/generate-ad-assets.ts

# preview in browser
open http://localhost:3000/dev/ads/my-new-ad

# export finalized PNGs to public/ads/
pnpm tsx scripts/export-ads.ts --only=my-new-ad
```

---

## Scripts

Run all from `apps/chunky-crayon-web/` with dev server on :3000.

### `scripts/generate-ad-assets.ts`

Generates line-art + optional colored-variant for campaigns that don't have assets yet.

| Flag             | Effect                                                                                        |
| ---------------- | --------------------------------------------------------------------------------------------- |
| (none)           | Generates everything missing, skips anything already in `ad-assets.json`.                     |
| `--only=<key>`   | Only that asset key.                                                                          |
| `--force`        | Regenerate even if already exists. Costs money.                                               |
| `--colored-only` | Skip line-art, only run the colored-variant pass (for `generateColoredVariant: true` assets). |

Writes to `apps/chunky-crayon-web/ad-assets.json`. Per-asset persistence — if gen 3 fails, gens 1 and 2 are saved.

### `scripts/export-ads.ts`

Uses Playwright to screenshot each campaign at 3 formats.

| Flag                                       | Effect                     |
| ------------------------------------------ | -------------------------- |
| (none)                                     | All campaigns × 3 formats. |
| `--only=<id>`                              | Only that campaign id.     |
| `--format=<meta-feed\|stories\|pinterest>` | Only that format.          |

Outputs `public/ads/<campaign-id>--<format>.png`:

| Format      | Dimensions         | Use                            |
| ----------- | ------------------ | ------------------------------ |
| `meta-feed` | 1080 × 1350 (4:5)  | Meta feed, Instagram grid      |
| `stories`   | 1080 × 1920 (9:16) | IG Stories, FB Stories, TikTok |
| `pinterest` | 1000 × 1500 (2:3)  | Pinterest                      |

---

## Templates

Each template renders with the same props: `{ campaign: Campaign, asset: AdAsset }`.

### `hero`

Quote-as-headline + one big coloring-page card + crayons + CTA. Use when the kid's quote is the hook.

Copy fields used: `headline`, `subhead`, `cta`, `proofQuote` (optional small italic text above the card).

### `app-screen`

Bright orange background, phone mockup with the coloring page on the canvas + palette, confetti dots. Use when you want to show the app itself.

Copy fields used: `headline` (supports `\n` for line breaks; second-to-last line renders in yellow), `subhead`, `cta`.

### `before-after`

Color ribbon top + two cards side-by-side (line-art "Their idea" + colored "Masterpiece") + yellow arrow + crayons + CTA. Use when the transformation is the hook.

Copy fields used: `eyebrow` (muted above the headline), `headline` (last line renders in orange), `cta`. **Requires** `asset.generateColoredVariant: true` or the "after" card falls back to the line art.

---

## Architecture

### Why `/dev/ads/` (not `/[locale]/dev/ads/`)

Ad previews aren't translated and need their own root layout without Header/Footer/Providers. `middleware.ts` explicitly skips i18n for `/dev/` so the route tree gets a clean root layout at `app/dev/ads/layout.tsx` that emits its own `<html>` and loads Tondo + Rooney Sans. This is the idiomatic Next.js "multiple root layouts" pattern.

### Why HTTP endpoints, not direct imports

`createColoringImage` is a server action (`'use server'`) that transitively pulls in `server-only`. Plain `tsx` scripts can't import it. The two dev-only HTTP endpoints wrap it:

- `POST /api/dev/generate-coloring-from-description` — line-art page from a prompt.
- `POST /api/dev/generate-colored-variant` — GPT Image 1.5 `images.edit` colored variant of a generated page.

Both gate on `NODE_ENV === 'production'` and require a `WORKER_SECRET` bearer in prod.

### Why `ad-assets.json` is committed

URLs in there point to public R2 buckets (not secret) and the DB ids are scoped to the dev Neon branch. Committing means fresh checkouts can render ads without re-paying for generation. If you regenerate with `--force` the file will change — that's fine, commit the new URLs.

---

## Cost (as of 2026-04-21)

- GPT Image 1.5 line-art: **~$0.08 / image**, ~60s
- GPT Image 1.5 `images.edit` colored variant: **~$0.08 / image**, ~45s
- Playwright export: free, ~1.5s per screenshot

Typical new campaign (1 line-art + 0 colored): ~$0.08. Before/after campaign (line-art + colored): ~$0.16.

Cache is explicit: unless you pass `--force`, existing assets in `ad-assets.json` are never re-generated.

---

## Copy principles

See [`memory/feedback_ad_copy_principles.md`](../../../../.claude/projects/-Users-ezeikel-Development-Personal-chunky-crayon/memory/feedback_ad_copy_principles.md) (Claude memory). TL;DR:

1. **Pain-point hook > value-prop headline.** "Mum, can I color a T-rex?" not "Any page. In minutes."
2. **Dual-path messaging required.** Every ad must mention both print AND in-app coloring.
3. **Accurate pricing language.** "Try 2 free pages" (then 15 credits = 3 more on signup). Not "3 free pages".
4. **No stats.** Don't claim studies or outcomes. We sell in-the-moment usefulness.

---

## Phase 2: video ads (not yet built)

Schema already supports `VideoConfig` per campaign:

```ts
{
  ...campaign,
  video: {
    mode: 'text' | 'voice' | 'image',
    scenes: VideoScene[],  // 15s total, text-reveal / phone-mockup / line-art-draw / brand-outro / broll
  },
}
```

Planned pipeline:

1. Nano Banana Pro generates high-quality storyboard stills per scene.
2. Seedance 2 (via fal) turns stills into i2v clips (5s, 720p, 9:16).
3. Remotion composes scenes + captions + brand outro → 15s MP4.
4. `/dev/ads` index gains `<video>` tags for preview, same UX as static ads.

Seedance 2 prompt quality determines feasibility. If clips look amateur, we drop video. Budget: ~$7–15 per full video set.

---

## FAQ / gotchas

**Q: My new campaign renders "Missing ad assets".**
A: Run `pnpm tsx scripts/generate-ad-assets.ts` with the dev server running. The page reads from `ad-assets.json`, which gets populated by the script.

**Q: Export script fails with "ERR_MODULE_NOT_FOUND".**
A: Run from `apps/chunky-crayon-web/` (the script uses relative imports to `lib/ads/campaigns.ts`).

**Q: Font looks wrong in the preview.**
A: The ad route has its own root layout. If you edited `app/dev/ads/layout.tsx` and the fonts aren't loading, check that both `tondo.variable` and `rooneySans.variable` are on `<body>`.

**Q: "AI_UnsupportedModelVersionError" when generating.**
A: `pnpm install --frozen-lockfile` + `rm -rf apps/chunky-crayon-web/.next` + restart dev. Node_modules drift; prod is fine.

**Q: Can I preview the exported PNG instead of the live route?**
A: Yes — `public/ads/<id>--<format>.png` is served statically at `/ads/<id>--<format>.png`.

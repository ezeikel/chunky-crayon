# Chunky Crayon Poster CLI

Headless App Store / Play Store **poster generator** for Chunky Crayon. It takes
the native-resolution screenshots produced by the `rn-marketing-capture` step
and composites them into finished, store-ready marketing posters — device frame,
on-brand headline, brand background, optional cross-panel bleed — rendered to
**exact store resolution** PNGs.

It is a **local CLI tool**, not a skill and not a GUI. You run it from the
terminal via a `pnpm` script / `tsx`. Lives at
`apps/chunky-crayon-mobile/tools/posters`.

## What it is

- **Engine: Playwright (chromium).** Each poster is an HTML/CSS template
  rendered headlessly and screenshotted to PNG at the panel's exact store pixel
  dimensions (`page.setViewportSize`
  - a fixed-size root element, `page.screenshot`). No browser UI, no manual
    export.
- **Reuses the repo's existing Playwright** (`playwright` `^1.59.0`, the same
  bundled chromium the worker drives in
  `apps/chunky-crayon-worker/src/record/session.ts`). The chromium binaries are
  already in `~/Library/Caches/ms-playwright` on this machine. On a fresh
  machine run `pnpm exec playwright install chromium` once (there is no
  `playwright install` step anywhere else in the repo except CI).
- **Device frame is a real bezel PNG.** The captured screenshot is composited
  inside a measured screen-cutout inset of a bezel image. A pure-CSS frame
  fallback exists for when no bezel asset is available (see
  [Device frames & bezel assets](#device-frames--bezel-assets)).
- **Headlines drafted by Claude.** A `headlines` subcommand drafts on-brand
  headlines + subheads per screen using the repo's **existing Anthropic client**
  (the Vercel AI SDK: `anthropic` from `@ai-sdk/anthropic` + `generateObject`
  from `ai`, the same pattern as
  `apps/chunky-crayon-worker/src/video/content-reel/shared/teaser.ts`). Model id
  is `claude-sonnet-4-6` (the id already in active worker use). Output is
  written into the config so `gen` can render it.

This tool does **not** capture screenshots and does **not** talk to a simulator.
Capture is the upstream `rn-marketing-capture` step; this is purely the
compositing step.

## Pipeline

```
1. rn-marketing-capture  ──►  marketing/<platform>/<locale>/NN-<name>.png   (NATIVE-RES shots)
                              (xcrun simctl io screenshot / adb exec-out screencap -p)
2. posters.config.ts     ──►  declare brand tokens + per-panel layout (which shot, frame, bg, bleed)
3. posters headlines     ──►  Claude drafts headline + subhead per panel → written into config/headlines.json
4. posters gen           ──►  composite each panel → marketing-posters/<platform>/<device>/<locale>/NN-<name>.png
                              (store-res PNG) + a contact-sheet preview
```

Step 1 (`rn-marketing-capture`) is the prerequisite. Its capture step now writes
**native store resolution** PNGs (via `xcrun simctl io screenshot` on iOS /
`adb exec-out screencap -p` on Android), not Argent's downscaled ~619px preview,
precisely so this tool has full-resolution source pixels to composite. See that
skill's "Compositing the marketing posters" section — it hands off to this CLI.

## Commands

Run from `apps/chunky-crayon-mobile/tools/posters` (or via the `posters` script
wired into the mobile app's `package.json`):

```bash
# List the device presets the tool knows about (px dims + bezel insets)
pnpm posters list-devices

# Draft on-brand headlines + subheads for each panel via Claude, written back into the config.
# Reads screen name (+ optional base64 of the captured shot for visual grounding).
ANTHROPIC_API_KEY=<key> pnpm posters headlines --platform ios --locale en

# Generate the finished store-res posters + a contact sheet.
pnpm posters gen --platform ios --device ipad-13 --locale en
pnpm posters gen --platform ios --device iphone-6.9 --locale en --out marketing-posters
```

`gen` flags:

| Flag         | Default             | Meaning                                                             |
| ------------ | ------------------- | ------------------------------------------------------------------- |
| `--platform` | `ios`               | `ios` \| `android` — selects the input subtree under `marketing/`   |
| `--device`   | `ipad-13`           | a device preset key (see `list-devices`) — drives output px + bezel |
| `--locale`   | `en`                | locale subfolder under `marketing/<platform>/`                      |
| `--out`      | `marketing-posters` | output root (relative to the mobile app dir)                        |

`headlines` flags: `--platform`, `--locale` (which captured set to draft
against), plus an implicit Claude call per panel.

The chromium binaries must be present (`pnpm exec playwright install chromium`
once on a fresh machine).

## Config shape (`posters.config.ts`)

A typed config: **global brand tokens** + an array of **per-panel** definitions.
Per-panel copy (headline / subhead) may live inline or in a `headlines.json` the
config reads (the `headlines` subcommand writes there).

```ts
import type { PostersConfig } from "./types";

const config: PostersConfig = {
  // ── Global brand tokens (exact CC values from lib/design/colors.ts) ──
  brand: {
    primary: "#E46444", // crayon-orange
    pink: "#E68991",
    yellow: "#FAC342",
    green: "#8CAF5A",
    purple: "#C18B9D",
    blue: "#5A9EE2",
    peach: "#F1AE7E", // crayon-teal (warm peach-orange)
    paperCream: "#FAF7F0",
    bgPeach: "#F7F1E9",
    textPrimary: "#43342D",
    textSecondary: "#72625A",
    // Headline font: RooneySans Black/Heavy for headlines, Bold for subheads.
    // .ttf files at apps/chunky-crayon-web/public/fonts/rooney-sans-*.ttf —
    // base64-embedded into the @font-face src (page.setContent has no document
    // origin, so a file:// font src will NOT resolve; data: URIs are robust).
    fontFamily: "RooneySans",
  },

  panels: [
    {
      name: "home", // → output NN-home.png (NN from array order)
      screenshot: "01-home.png", // file under marketing/<platform>/<locale>/
      headline: "Coloring that grows with them", // optional; Claude fills if absent
      subhead: "New scenes every day, no app store ads", // optional
      bg: { kind: "solid", color: "#F7F1E9" }, // or gradient (below)
      deviceFrame: "ipad-13", // a device preset key, or "none" for bare shot
      // bleedGroup + transform are optional (below)
    },
    {
      name: "gallery",
      screenshot: "02-gallery.png",
      bg: { kind: "gradient", from: "#FAC342", to: "#F1AE7E", angle: 135 },
      deviceFrame: "ipad-13",
      bleedGroup: "warm", // shares one continuous bg with adjacent "warm" panels
      transform: { rotate: -4, offsetX: 0, offsetY: 40 }, // tilt / nudge the framed device
    },
  ],
};

export default config;
```

Per-panel fields:

| Field         | Required | Meaning                                                                                                                                                 |
| ------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `screenshot`  | yes      | filename under `marketing/<platform>/<locale>/` (the native-res shot)                                                                                   |
| `name`        | yes      | output base name; the `NN-` prefix comes from array order                                                                                               |
| `headline`    | no       | headline copy; if absent, `posters headlines` drafts it via Claude                                                                                      |
| `subhead`     | no       | subhead copy; same Claude fill behavior                                                                                                                 |
| `bg`          | yes      | `{ kind: "solid", color }` or `{ kind: "gradient", from, to, angle? }`                                                                                  |
| `deviceFrame` | yes      | a device preset key (`"ipad-13"`, `"iphone-6.9"`) or `"none"`                                                                                           |
| `bleedGroup`  | no       | id string — panels sharing it render against ONE continuous bg, then are sliced into per-panel store-res PNGs (the cross-panel look from screensdesign) |
| `transform`   | no       | `{ rotate?, offsetX?, offsetY? }` to tilt / offset the framed device within the panel                                                                   |

## Bleed groups

Panels that share a `bleedGroup` id are rendered against a **single continuous
background canvas** (one wide HTML render spanning all panels in the group),
then **sliced** into individual store-resolution PNGs. This produces the
cross-panel background / graphic that visually flows from one App Store
screenshot into the next (the screensdesign look). Panels not in a group render
standalone at their own store resolution.

## Device presets & store dimensions

Presets carry the store output px dims **and** the bezel screen-cutout inset
(the measured alpha bounding box of the bezel PNG — see below). Store dims are
the verified June 2026 Apple / Google requirements:

| Preset          | Platform | Output px (portrait)                                                         | Notes                                                                                                                                          |
| --------------- | -------- | ---------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `ipad-13`       | iOS      | **2048 × 2732** (or 2064 × 2752)                                             | iPad 13-inch — **required** if the app runs on iPad. Replaces the old 12.9"/11" requirements (those now auto-scale).                           |
| `iphone-6.9`    | iOS      | **1290 × 2796** (1320 × 2868 also accepted; Apple canonicalizes 1260 × 2736) | iPhone 6.9-inch — **required** if the app runs on iPhone. Apple auto-scales 6.5/6.3/6.1/5.5" from this.                                        |
| `android-phone` | Android  | **1080 × 1920**                                                              | Play phone. Rules: 320–3840px per side, longest ≤ 2× shortest (2:1 max), 9:16 portrait recommended. **24-bit PNG, no alpha** for Play uploads. |

Landscape is the dimension swap (e.g. `2796 × 1290`). Format: Apple accepts
JPEG/PNG (alpha ok), 1–10 per device size per locale. Google: min 2 / max 8
phone shots, **no alpha** on Play screenshots and the feature graphic. The Play
**feature graphic** is a separate fixed asset: 1024 × 500, 24-bit PNG (no alpha)
— generate it as its own panel if needed.

> App Store rule that matters here: device frames **and** factual marketing-text
> overlays **are** allowed (this is universal ASO practice). The only
> constraints are that the app content inside the frame is a genuine capture and
> the overlay text is factual — no prices, discounts ("50% off"), awards,
> rankings, or competitor comparisons. (One third-party blog wrongly claims
> framing is banned; Apple's own spec imposes no such ban.)

## Device frames & bezel assets

The chosen approach is a **real bezel PNG** composited around the screenshot:

1. Drop the device bezel PNG into `tools/posters/assets/bezels/<device>.png`.
2. Measure its screen cutout **once** per device — the alpha bounding box of the
   transparent screen hole — e.g.
   `magick <bezel>.png -alpha extract -negate -trim info:` prints `WxH` and
   `X+Y`. Those four numbers are the preset's `bezelInset` (where the screenshot
   is composited).
3. `gen` scales the screenshot to the cutout and layers the bezel on top.

**Licensing note (important):** Apple Design Resources bezels may **not** be
embedded / redistributed in a tool. Safe sources: **PommePlate** (CC0, but stale
— no Dynamic Island / current iPad Pro), or a bezel you are licensed to use
as-is. The bezel PNGs are gitignored from this tool's `assets/bezels/` by
default; supply your own.

**CSS-frame fallback:** if no bezel PNG is available for a device, set
`deviceFrame` to the device key and the tool renders a **pure-CSS device frame**
instead (rounded-rect body, screen padding, optional notch/Dynamic-Island block)
— the [devices.css](https://github.com/picturepan2/devices.css) (MIT) approach:
the screen cutout is just the frame's padding box. Lower fidelity than a real
bezel but ships with zero asset/licensing concerns.

## Copy rules (hard constraints)

The `headlines` subcommand prompts Claude with — and `gen` will not bypass —
these CC rules:

- **Never the word "AI"** in marketing copy. Parents are AI-skeptical; rewrite
  around outcomes.
- **No em dashes** in user-facing copy. Use commas or fresh sentences.
- **US/UK-neutral spelling** (color, vacation); avoid UK-only words
  ("half-term", "holiday" meaning Christmas).
- **Kid / parent audience** — playful but parent-trustworthy. Brand voice is
  "we" (Chunky Crayon, like Bluey having socials), not "I".
- **Screen-free / "better screen time" positioning** — printed PDFs are
  screen-free; in-app coloring is "better screen time". Do not overclaim "no
  screens".
- Overlay text must stay **factual** (App Store rule): no prices, discounts,
  awards, rankings, or competitor comparisons.

## Output

```
marketing-posters/
  <platform>/            # ios | android
    <device>/            # ipad-13 | iphone-6.9 | android-phone
      <locale>/          # en, de, es, ...
        01-home.png      # store-res poster
        02-gallery.png
        ...
        _contact-sheet.png   # all panels tiled for a quick eyeball pass
```

Each `NN-<name>.png` is at the device preset's exact store resolution. The
contact sheet is a preview only (downscaled tiling) — not for upload.

## How this relates to Parth's `app-store-screenshots` GUI

This CLI is the **headless alternative** to Parth's
[app-store-screenshots](https://github.com/ParthJadhav/app-store-screenshots)
GUI. They solve the same downstream problem (composite captures into finished
store posters), but:

- **This tool** is a scriptable, repo-local CLI — fits the same `pnpm` / `tsx`
  runbook the rest of the repo uses, regenerates deterministically across
  locales/devices in CI or a single command, and reads the CC brand tokens /
  RooneySans / copy rules directly.
- **The GUI** is an interactive desktop app for hand-arranging panels.

This tool does **not** depend on the GUI and does not import anything from it.
Pick the CLI when you want headless, reproducible, brand-locked output from the
capture pipeline; pick the GUI when you want to nudge layouts by hand. The
`rn-marketing-capture` skill points at this CLI as its default compositing step
and mentions the GUI as the interactive alternative.

## Setup notes

- The folder is wired as a private workspace package
  (`@one-colored-pixel/posters`) with its own `package.json` declaring
  `playwright`, `@ai-sdk/anthropic`, `ai`, and `zod` (the only deps the brief
  verifies), run via `tsx`. `pnpm-workspace.yaml` globs `apps/*` + `packages/*`
  (direct children only), so this nested `tools/posters` folder is registered
  explicitly there for its deps to install with the monorepo.
- `ANTHROPIC_API_KEY` is required only for the `headlines` subcommand (read
  implicitly by the `@ai-sdk/anthropic` provider). `gen` and `list-devices` need
  no key.
- Fonts are base64-embedded from
  `apps/chunky-crayon-web/public/fonts/rooney-sans-*.ttf` into the template's
  `@font-face` `src` (because `page.setContent()` has no document origin, a
  `file://` font src would not resolve).

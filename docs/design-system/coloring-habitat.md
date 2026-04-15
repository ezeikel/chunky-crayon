# Coloring Habitat — Design System

Adults using coloring for mindfulness. Think Airbnb layout, Headspace
restraint, natural photography. Every element should feel airy, intentional,
and calm.

## Brand principles

1. **Airy over busy.** Whitespace is a feature. Density is the enemy of calm.
2. **Hairlines over shadows.** Subtle 1px rings. No drop-shadow depth theatre.
3. **Muted palette, sparse accent.** Green (`#2E7D32`) covers ≤10% of any
   screen. The rest is warm neutral.
4. **Ease-out, never bounce.** Calm motion, 200–300ms. No overshoot. No
   springy UI — this isn't a game.
5. **Ghost mode by default.** Sound, animations, ambient content should be
   opt-in or subtle. Respect the user's focus.
6. **No mascots, no gamification.** Adults don't want a cartoon cheering at
   them. Progress indicators, yes. Confetti, no.

## Typography

- **Heading & body**: `Plus Jakarta Sans` (local, `apps/coloring-habitat-web/public/fonts/`),
  weight 400 / 500 / 600. Falls back to `Inter`, `ui-sans-serif`.

### Scale (px) — Airbnb Cereal-aligned

| Role    | Size     | Line-height | Tracking |
| ------- | -------- | ----------- | -------- |
| Display | 48–56    | 1.1         | −0.02em  |
| H1      | 32       | 1.15        | −0.015em |
| H2      | 26       | 1.2         | −0.01em  |
| H3      | 22       | 1.25        | −0.005em |
| H4      | 18       | 1.3         | 0        |
| Body    | 16       | 1.5         | 0        |
| Small   | 14       | 1.45        | 0        |
| Caption | 12       | 1.4         | +0.01em  |
| Eyebrow | 14 upper | 1.4         | +0.05em  |

**Rules**:

- Weights limited to 400 / 500 / 600. Use 700 sparingly (marketing only).
- Never mix more than **3 sizes** per view.
- No all-caps except eyebrow labels.

## Color

### Primary identity

| Role           | Value                            | Token                           |
| -------------- | -------------------------------- | ------------------------------- |
| Accent         | `var(--primary)` = `#2E7D32`     | `--color-coloring-accent`       |
| Accent dark    | `color-mix(…primary 85%, black)` | `--color-coloring-accent-dark`  |
| Highlight      | `var(--accent)`                  | `--color-coloring-highlight`    |
| Success        | `oklch(0.55 0.15 145)`           | `--color-coloring-success`      |
| Surface (warm) | `#FAFAF7`                        | `--color-coloring-surface`      |
| Surface dark   | `#E8EAE4`                        | `--color-coloring-surface-dark` |
| Muted text     | `#767676`                        | `--color-coloring-muted`        |

### Palette rules (Airbnb 70/20/10)

- **70% neutral** — warm off-whites, stone, sand.
- **20% tonal** — muted sages/greens at 8–15% tint over neutral.
- **10% accent** — saturated green, reserved for primary CTA, active state,
  progress indicator. No more than one accent element visible in a viewport
  when possible.
- Never pure white `#FFF` (too clinical) or pure black `#000` (too harsh). Use
  `#FAFAF7` and `#1C1C1A`.

## Radii

| Token                       | Value     | Use                        |
| --------------------------- | --------- | -------------------------- |
| `--radius-coloring-button`  | `9999px`  | Pill buttons (primary CTA) |
| `--radius-coloring-card`    | `0.75rem` | Cards, toolbars            |
| `--radius-coloring-pill`    | `9999px`  | Chips, tags                |
| `--radius-coloring-surface` | `1rem`    | Modal sheets               |

## Shadows (subtle, rarely)

| Token                            | Value                               |
| -------------------------------- | ----------------------------------- |
| `--shadow-coloring-button`       | `inset 0 0 0 1px rgb(0 0 0 / 0.08)` |
| `--shadow-coloring-button-hover` | `inset 0 0 0 1px rgb(0 0 0 / 0.16)` |
| `--shadow-coloring-surface`      | `0 1px 2px rgb(0 0 0 / 0.04)`       |

**Rule**: prefer hairline rings (`inset`) over drop shadows. Drop shadow only
for floating surfaces (modals), and at `0 1px 2px` max. Never chunky depth
theatre.

## Motion

| Token                      | Value                                       |
| -------------------------- | ------------------------------------------- |
| `--ease-coloring`          | `cubic-bezier(0.2, 0.8, 0.2, 1)` (ease-out) |
| `--duration-coloring-fast` | `180ms`                                     |
| `--duration-coloring-base` | `260ms`                                     |

**Rules**:

- Ease-out for entrances, ease-in-out for loops. **Never** overshoot / bounce.
- Durations: micro 150ms, standard 250–350ms, ambient/breathing 3000–6000ms.
- Page transitions ≤ 400ms.
- Press feedback: opacity change + 98% scale max. Never 95%-or-below squish.
- Respect `prefers-reduced-motion` — collapse to opacity fade, duration 0.01ms
  for transforms.
- Ambient animations (background gradients, breathing orbs) allowed but must
  be pausable and <15° hue spread.

## Sizing

| Token                           | Value             |
| ------------------------------- | ----------------- |
| `--coloring-touch-target`       | `44px`            |
| `--coloring-border-width`       | `1px`             |
| `--spacing-coloring-button-px`  | `1.5rem` (24px)   |
| `--spacing-coloring-button-py`  | `0.625rem` (10px) |
| `--spacing-coloring-button-gap` | `0.5rem` (8px)    |
| `--spacing-coloring-icon`       | `1rem` (16px)     |
| `--text-coloring-button`        | `0.875rem` (14px) |
| `--tracking-coloring-button`    | `+0.01em`         |

### 8pt spacing grid (Airbnb)

Base = 8px. Half-step = 4px (inline pairs only).

| Token | Use                                       |
| ----- | ----------------------------------------- |
| 4     | icon-to-label gaps                        |
| 8     | dense list rows, form field internal      |
| 12    | button internal vertical, small card gaps |
| 16    | default component padding                 |
| 24    | section internal padding, card gutters    |
| 32    | between related sections                  |
| 48    | major section breaks (desktop)            |
| 64    | hero vertical padding                     |
| 96    | page-level top/bottom on marketing        |

## Iconography

- **Library**: Font Awesome Pro — default to **Regular** for outline UI
  icons (clean, confident without being heavy). **Solid** is reserved for
  active/selected states. **Light/Thin** only at display sizes (≥32px) — it
  disappears at small UI sizes.
- **Sizes**: 24px default, 20px inline, 16px dense UI.
- When importing, prefer `@fortawesome/pro-regular-svg-icons`; reach for
  `pro-solid-svg-icons` only for active states or where contrast demands it.
- Action buttons (Share / Download / Start Over) use **Solid** because they
  carry brand accent fills — outline icons against a filled button look
  thin.

## Sound

- **Off by default**. User opts in.
- Ambient music (if enabled) at 20–30% volume, ducks on UI interaction.
- No UI click sounds by default. Adults find them infantilizing.
- When sound is on: wind chimes, gentle nature, single-tone feedback — never
  chiptune or musical flourishes.

## Components in this brand

Set `variant="adult"` on `ColoringContextProvider` for CH feature flags (full
tool set, skin tones, recent colors, pattern fills).

Key components: `ColorPalette` (extended
palette + recent + skin tones), `ToolSelector` (full set),
`MobileColoringDrawer`, `PatternSelector` (dots/stars/stripes/zigzag),
`CompletionCelebration` (gentle glow + message, no confetti).

## Do / Don't

**Do**

- Use `rounded-coloring-button` / `font-coloring-heading` / hairline tokens.
- Leave breathing room — 24–48px between sections on desktop.
- Use neutral backgrounds with at most one accent element per viewport.
- Default animations to ease-out 200–300ms.
- Use APCA Lc 60+ for body copy on light surfaces.

**Don't**

- Use bouncy springs, overshoot easings, or `scale(0.9)`-level press feedback.
- Add mascots, confetti, streaks, or any gamification.
- Auto-play sound or animations without a user gesture.
- Use drop shadows larger than `0 1px 2px` on normal surfaces.
- Fill screens with saturated color — accent is ≤10%.

## Sources

- Airbnb DLS (Karri Saarinen talks, airbnb.design blog)
- Headspace brand (DesignStudio 2021 rebrand case study)
- Material Design Motion guidelines (reduced-motion baselines)
- W3C WCAG 2.1 / APCA contrast guidance
- Research notes in this session (adult wellness UI, Airbnb Cereal
  typography, Headspace motion)

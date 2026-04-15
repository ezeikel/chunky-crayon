# Chunky Crayon — Design System

Kids 3–12. Think Duolingo meets Toca Boca meets a crayon box. Every element
should feel pressable, warm, and forgiving.

## Brand principles

1. **Chunky over sleek.** Fat radii, thick weights, visible depth. Every
   interactive element should look like a physical object you could squish.
2. **Saturated signals, warm surfaces.** Full-chroma oranges/purples for CTAs.
   Backgrounds are warm off-white (`#FDF6E3`, not `#FFF`) to reduce glare and
   feel friendlier.
3. **Bouncy not linear.** Springs with overshoot. Scale-on-press. Nothing
   should feel sterile or "corporate."
4. **Icon-first.** Assume the youngest user can't read. Icons must be
   metaphor-clear (paintbrush, crayon, star) and paired with voiceover hints.
5. **Mascot guides, never gates.** Colo appears in empty states, celebrations,
   and recovery — never blocks interaction.
6. **Reward effort, not quantity.** Stickers for finishing, not for streaks.
   No FOMO. COPPA-compliant by construction.

## Typography

- **Heading**: `Tondo` (local, `apps/chunky-crayon-web/public/fonts/`), weight 700. Falls back to `ui-rounded`, `system-ui`.
- **Body**: `Rooney Sans`, weight 500 (body) / 700 (emphasis). Falls back to
  `ui-rounded`.

### Scale (px)

| Role    | Age 3–6 | Age 7–12 |
| ------- | ------- | -------- |
| Display | 48–56   | 40–48    |
| H1      | 36      | 32       |
| H2      | 28      | 24       |
| Body    | 20–24   | 18       |
| Button  | 20      | 18       |
| Caption | 16      | 14       |

**Rules**:

- Line-height 1.4–1.5.
- Letter-spacing open (+0.5 to +1% body; -0.01em headings).
- Weights never below 500. Light weights disappear at tablet distance.
- No all-caps in body. No justified text. No italics (harder to decode).

## Color

### Primary identity

| Role           | Value                            | Token                           |
| -------------- | -------------------------------- | ------------------------------- |
| Accent         | `hsl(var(--crayon-orange))`      | `--color-coloring-accent`       |
| Accent dark    | `hsl(var(--crayon-orange-dark))` | `--color-coloring-accent-dark`  |
| Highlight      | `hsl(var(--crayon-pink))`        | `--color-coloring-highlight`    |
| Success        | `hsl(var(--crayon-green))`       | `--color-coloring-success`      |
| Surface (warm) | `#FDF6E3`                        | `--color-coloring-surface`      |
| Surface dark   | `#F0E6D0`                        | `--color-coloring-surface-dark` |
| Muted text     | `hsl(var(--text-muted))`         | `--color-coloring-muted`        |

### Palette rules

- Max **2–3 saturated colors** on any one screen. The rest are neutrals or
  muted pastels — saturated competes with saturated.
- Primary CTA = full chroma. Secondary = tint (50% opacity) or outline-only
  with colored border.
- Never pure white (`#FFF`) — feels clinical. Always warm off-white.
- Contrast target: WCAG AA for most; aim **7:1** for copy targeted at
  pre-readers.

## Radii

| Token                       | Value    | Use                            |
| --------------------------- | -------- | ------------------------------ |
| `--radius-coloring-button`  | `1.5rem` | Primary buttons (chunky)       |
| `--radius-coloring-card`    | `1.5rem` | Cards, toolbars, color palette |
| `--radius-coloring-pill`    | `9999px` | Chips, badges                  |
| `--radius-coloring-surface` | `2rem`   | Modal sheets, big panels       |

## Shadows (depth = pressability)

| Token                            | Value                                      |
| -------------------------------- | ------------------------------------------ |
| `--shadow-coloring-button`       | `0 6px 0 0 hsl(var(--crayon-orange-dark))` |
| `--shadow-coloring-button-hover` | `0 4px 0 0 hsl(var(--crayon-orange-dark))` |
| `--shadow-coloring-surface`      | `0 4px 20px rgb(0 0 0 / 0.08)`             |

**Duolingo-style press**: shadow is a solid offset (not blurred). On press,
button translates down by the shadow offset _and_ the shadow collapses —
creates the "squish" feel.

```css
button:active {
  transform: translateY(6px);
  box-shadow: 0 0 0 0 var(--accent-dark);
}
```

## Motion

| Token                      | Value                               |
| -------------------------- | ----------------------------------- |
| `--ease-coloring`          | `cubic-bezier(0.34, 1.56, 0.64, 1)` |
| `--duration-coloring-fast` | `120ms`                             |
| `--duration-coloring-base` | `200ms`                             |

**Rules**:

- Overshoot springs (or `cubic-bezier(0.34, 1.56, 0.64, 1)`) for entrances and
  celebrations — never linear, never pure ease-out.
- Scale-on-press: `scale(0.94)` with 80–120ms ease-out; spring back on release.
- Celebration: 400–600ms spring, `scale(1) → scale(1.2) → scale(1)`, slight
  rotation OK.
- Idle mascot/reward: 2–4s subtle loops (2–4px translate, 2–3° rotation).
- Respect `prefers-reduced-motion` — swap springs for short fades.

## Sizing

| Token                           | Value             |
| ------------------------------- | ----------------- |
| `--coloring-touch-target`       | `56px`            |
| `--spacing-coloring-button-px`  | `2.5rem` (40px)   |
| `--spacing-coloring-button-py`  | `1.25rem` (20px)  |
| `--spacing-coloring-button-gap` | `0.875rem` (14px) |
| `--spacing-coloring-icon`       | `1.75rem` (28px)  |
| `--text-coloring-button`        | `1.25rem` (20px)  |
| `--tracking-coloring-button`    | `-0.01em`         |

**Touch target minimums** (Sesame Workshop research):

- Ages 3–6: 75×75px for any interactive
- Ages 7–12: 60×60px
- Spacing between targets: ≥16px, prefer 24px

## Iconography

- **Filled** over outline — easier recognition for pre-readers.
- If outlined: stroke **3–4px** at 24px icon size (never 1.5–2px).
- Corner radius matches system (8–12px on a 24px icon); no sharp points.
- **Metaphor test**: can a 4-year-old name the icon without the label?

**Library**: Font Awesome Pro. Use the **Solid** or **Duotone** style —
heavier weight reads at distance for young users. Import from
`@fortawesome/pro-solid-svg-icons` or `@fortawesome/pro-duotone-svg-icons`.
Avoid Light/Thin (disappear at tablet distance).

## Sound

- **On by default** (with mute toggle).
- Every tap: soft pluck/pop, <150ms, low volume.
- Success: rising 3-note chime on color-complete / page-done.
- Celebration: longer musical flourish (~1.5s) for milestones only.
- Never: loud startup, repetitive idle loops, any sound without a mute.
- Ambient scene audio ducks −6dB when a UI sound plays.

## Components in this brand

All components come from `@one-colored-pixel/coloring-ui`. Set `variant="kids"`
on `ColoringContextProvider` for CC-specific feature gating (reduced tool set,
no recent-colors, etc.).

Key components: `ColorPalette` (basic 20-color set),
`ToolSelector` (reduced `KIDS_TOOL_IDS`), `MobileColoringToolbar`,
`MobileColoringDrawer`, `CompletionCelebration` (confetti variant).

## Do / Don't

**Do**

- Use `rounded-coloring-button` / `font-coloring-heading` / `shadow-coloring-button` tokens.
- Test on an iPad held by someone under 6.
- Put a mascot or illustration in empty states.
- Celebrate completion within 300ms of the final action.

**Don't**

- Hardcode `rounded-full`, `font-bold`, `shadow-lg` — the token system exists.
- Add streaks, daily-loot, or leaderboards for under-8.
- Use thin line icons, pure white backgrounds, or all-caps body text.
- Block the user with mascot popups — always skippable.

## Sources

- Apple HIG Kids Category
- Sesame Workshop "Best Practices for Designing Apps for Young Children"
- 5Rights Foundation Age Appropriate Design Code
- Common Sense Media "Designing for Kids" guidelines
- Duolingo engineering blog (chunky button pattern)
- Toca Boca public brand guidelines
- Research notes in this session (ages 3–12 typography, touch targets, mascot
  integration)

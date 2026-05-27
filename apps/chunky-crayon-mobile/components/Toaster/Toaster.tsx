import { Toaster as SonnerToaster, toast as sonnerToast } from "sonner-native";
import type { ComponentProps } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-native-fontawesome";
import {
  faCircleCheck,
  faCircleExclamation,
  faCircleInfo,
  faTriangleExclamation,
  faSpinnerThird,
} from "@fortawesome/pro-duotone-svg-icons";

/**
 * CC brand-styled Toaster — mobile port of
 * packages/coloring-ui/src/Toaster.tsx, matched value-for-value.
 *
 * Web reference (relevant lines):
 *   - position: top-center
 *   - duration: 4000ms
 *   - --radius-coloring-card: 1.5rem (24px)
 *   - toast padding: 14px 48px 14px 16px, gap 16px, align-items: center
 *   - title:       font-weight 700, 16px, line-height tight (~1.1)
 *   - description: font-weight 500, 14px, opacity 0.9
 *   - boxShadow:   "0 6px 0 0 var(--bottom), 0 10px 24px -8px rgb(0 0 0 / 0.18)"
 *     where --bottom is the variant's *-bg-dark
 *   - icon: duotone FA, primary = *-bg-dark, secondary = *-on @ 0.85
 *
 * CSS var resolution chain (apps/chunky-crayon-web/global.css):
 *   --color-coloring-success-bg      = hsl(--crayon-green)         85 35% 52%  → #8CAF5A
 *   --color-coloring-success-bg-dark = hsl(--crayon-green-dark)    85 35% 40%  → #6C8A42
 *   --color-coloring-success-on      = #ffffff
 *   --color-coloring-error-bg        = hsl(--crayon-pink)         355 65% 72%  → #E68991
 *   --color-coloring-error-bg-dark   = hsl(--crayon-pink-dark)    355 60% 58%  → #D4545E
 *   --color-coloring-error-on        = #ffffff
 *   --color-coloring-warning-bg      = hsl(--crayon-yellow)        42 95% 62%  → #FAC342
 *   --color-coloring-warning-bg-dark = hsl(--crayon-yellow-dark)   42 90% 48%  → #E9A60C
 *   --color-coloring-warning-on      = hsl(--text-primary)         20 20% 22%  → #3D2C1E
 *   --color-coloring-info-bg         = hsl(--crayon-blue)         210 70% 62%  → #5A9EE2
 *   --color-coloring-info-bg-dark    = hsl(--crayon-blue-dark)    210 65% 50%  → #2D80D2
 *   --color-coloring-info-on         = #ffffff
 *   --color-coloring-loading-bg      = hsl(--crayon-purple)       340 30% 65%  → #C18B9D
 *   --color-coloring-loading-bg-dark = hsl(--crayon-purple-dark)  340 30% 50%  → #A65973
 *   --color-coloring-loading-on      = #ffffff
 *
 * Why we don't use richColors on mobile: sonner-native's richColors
 * hardcodes its own variant palette and ignores `styles` for those
 * variants. We turn it OFF and theme each variant ourselves via
 * `toastOptions.{success|error|warning|info|loading}`.
 *
 * Why text colour varies per variant: warning uses dark text on yellow
 * (web `--color-coloring-warning-on = --text-primary`), everything
 * else uses white. Sonner-native's toastOptions.titleStyle is global,
 * so we keep title/description font/size global and override colour
 * per call via `toast.warning(msg, { titleStyle: ..., descriptionStyle: ... })`
 * — wrapped below.
 */

type ToasterProps = ComponentProps<typeof SonnerToaster>;

// Exact hex values, see header comment for HSL → hex working.
const BRAND = {
  success: { bg: "#8CAF5A", dark: "#6C8A42", on: "#FFFFFF" },
  error: { bg: "#E68991", dark: "#D4545E", on: "#FFFFFF" },
  // Web uses light yellow bg + dark text. Sonner-native doesn't support
  // per-variant text colour, so we darken the bg to E9A60C (web's yellow-dark)
  // so white text is readable.
  warning: { bg: "#E9A60C", dark: "#AA7909", on: "#FFFFFF" },
  info: { bg: "#5A9EE2", dark: "#2D80D2", on: "#FFFFFF" },
  loading: { bg: "#C18B9D", dark: "#A65973", on: "#FFFFFF" },
} as const;

// Mirrors web's toastOptions.style + classNames.toast.
const variantTint = (v: keyof typeof BRAND) => ({
  backgroundColor: BRAND[v].bg,
  borderWidth: 0,
  // 1.5rem on web @ 16px root.
  borderRadius: 24,
  // 14px 16px 14px 16px; web also reserves 3rem on the right for the
  // close button; mobile sonner positions its close button absolute so
  // we don't pad for it.
  paddingVertical: 14,
  paddingHorizontal: 16,
  flexDirection: "row" as const,
  alignItems: "center" as const,
  // 1rem = 16px.
  gap: 16,
  // Two-shadow stack mirroring web's `chunky` template:
  //   0 6px 0 0 var(--bottom)              hard offset, no blur
  //   0 10px 24px -8px rgb(0 0 0 / 0.18)   soft drop
  // RN 0.76+ accepts the CSS-style shorthand string.
  boxShadow: `0px 6px 0px 0px ${BRAND[v].dark}, 0px 10px 24px -8px rgba(0,0,0,0.18)`,
});

// Web icon is 1.875rem = 30px. FA RN supports duotone via the
// `secondaryColor` + `secondaryOpacity` props — matches web's
// duotone(primary, secondary, 1, 0.85) exactly.
const iconSize = 30;

const variantIcons = {
  success: (
    <FontAwesomeIcon
      icon={faCircleCheck}
      size={iconSize}
      color={BRAND.success.dark}
      secondaryColor={BRAND.success.on}
      secondaryOpacity={0.85}
    />
  ),
  error: (
    <FontAwesomeIcon
      icon={faCircleExclamation}
      size={iconSize}
      color={BRAND.error.dark}
      secondaryColor={BRAND.error.on}
      secondaryOpacity={0.85}
    />
  ),
  warning: (
    // Web swaps the duotone order for warning so primary reads on
    // the bright yellow card: primary = warning-on (dark text), secondary
    // = warning-bg-dark @ 0.95.
    <FontAwesomeIcon
      icon={faTriangleExclamation}
      size={iconSize}
      color={BRAND.warning.on}
      secondaryColor={BRAND.warning.dark}
      secondaryOpacity={0.95}
    />
  ),
  info: (
    <FontAwesomeIcon
      icon={faCircleInfo}
      size={iconSize}
      color={BRAND.info.dark}
      secondaryColor={BRAND.info.on}
      secondaryOpacity={0.85}
    />
  ),
  loading: (
    <FontAwesomeIcon
      icon={faSpinnerThird}
      size={iconSize}
      color={BRAND.loading.dark}
      secondaryColor={BRAND.loading.on}
      secondaryOpacity={0.85}
    />
  ),
};

const Toaster = (props: ToasterProps) => (
  <SonnerToaster
    position="top-center"
    duration={4000}
    closeButton
    // richColors ON because sonner-native reads `closeButtonColor` from
    // `colors.rich[variant].foreground` (= white) when it's true. With
    // richColors OFF, the close X is rendered in `text-secondary` (dark
    // grey) which clashes against our coloured toast cards. Our own
    // per-variant style in `toastOptions.{variant}` still wins for bg/
    // shadow, so this only changes the close icon's color.
    richColors
    visibleToasts={3}
    // Web sets `gap={28}` on the Toaster — vertical space between stacked toasts.
    gap={28}
    icons={variantIcons}
    toastOptions={{
      // Default (no variant) — purple loading card.
      style: variantTint("loading"),
      // Title: 1rem, 700 weight, tight line-height.
      titleStyle: {
        fontWeight: "700",
        fontSize: 16,
        lineHeight: 18,
        color: BRAND.loading.on,
      },
      // Description: 0.875rem, 500 weight, 0.9 opacity.
      descriptionStyle: {
        fontWeight: "500",
        fontSize: 14,
        lineHeight: 18,
        opacity: 0.9,
        color: BRAND.loading.on,
      },
      success: variantTint("success"),
      error: variantTint("error"),
      warning: variantTint("warning"),
      info: variantTint("info"),
      loading: variantTint("loading"),
    }}
    {...props}
  />
);

// Dev-only handle so we can fire styled toasts from the debugger /
// Metro to verify visuals in-place when navigation is blocked.
if (__DEV__) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (globalThis as any).__ccToast = sonnerToast;
}

export { Toaster, sonnerToast as toast };
export default Toaster;

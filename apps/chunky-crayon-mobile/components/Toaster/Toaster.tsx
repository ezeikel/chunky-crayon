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
import { FONTS } from "@/lib/design";

/**
 * CC brand-styled Toaster — mobile port of
 * packages/coloring-ui/src/Toaster.tsx.
 *
 * Mirrors the web brand shape exactly:
 *   - Per-variant tinted background (pink/green/yellow/blue/purple
 *     from the crayon palette), not white.
 *   - Chunky hard-offset bottom-drop shadow in the variant's *-dark
 *     shade — `0 6px 0 0 var(--bottom)` on web.
 *   - White text (success / error / info / loading), dark text on
 *     warning. Bold title, slightly muted description.
 *   - Duotone FA icons (success / error / warning / info / loading)
 *     to mirror web's `variantIcons` map.
 *
 * Sonner-native ignores `styles` for `richColors` variants, so we
 * turn richColors OFF and theme each variant via `toastOptions.{
 * success | error | warning | info | loading }`.
 *
 * Colour values are hex-converted from CC's CSS HSL vars in
 * `apps/chunky-crayon-web/global.css`:
 *   --crayon-pink:    355 65% 72%  →  #E68991  ( -dark #D4545E )
 *   --crayon-green:    85 35% 52%  →  #8CAF5A  ( -dark #6C8A42 )
 *   --crayon-yellow:   42 95% 62%  →  #FAC342  ( -dark #E9A60C )
 *   --crayon-blue:    210 70% 62%  →  #5A9EE2  ( -dark #2D80D2 )
 *   --crayon-purple:  340 30% 65%  →  #C18B9D  ( -dark #A65973 )
 */

type ToasterProps = ComponentProps<typeof SonnerToaster>;

// Brand palette pulled from web. `on` is the text color on top of
// each card. Warning is intentionally dark text (matches web).
const BRAND = {
  success: { bg: "#8CAF5A", dark: "#6C8A42", on: "#FFFFFF" },
  error: { bg: "#E68991", dark: "#D4545E", on: "#FFFFFF" },
  warning: { bg: "#E9A60C", dark: "#AA7909", on: "#FFFFFF" },
  info: { bg: "#5A9EE2", dark: "#2D80D2", on: "#FFFFFF" },
  loading: { bg: "#C18B9D", dark: "#A65973", on: "#FFFFFF" },
} as const;

const variantTint = (v: keyof typeof BRAND) => ({
  backgroundColor: BRAND[v].bg,
  borderWidth: 0,
  borderRadius: 16,
  paddingVertical: 14,
  paddingHorizontal: 16,
  flexDirection: "row" as const,
  alignItems: "center" as const,
  gap: 12,
  // Chunky 6-down hard offset shadow + soft drop, in the variant's
  // dark shade — mirrors web's `0 6px 0 0 var(--bottom), 0 10px 24px -8px rgb(0 0 0 / 0.18)`.
  // RN 0.76+ supports the `boxShadow` shorthand which gives us both
  // shadows in one go (StyleSheet's per-prop shadow only allows one).
  boxShadow: `0px 6px 0px 0px ${BRAND[v].dark}, 0px 10px 24px -8px rgba(0,0,0,0.18)`,
});

const iconSize = 28;

const variantIcons = {
  success: (
    <FontAwesomeIcon
      icon={faCircleCheck}
      size={iconSize}
      color={BRAND.success.on}
    />
  ),
  error: (
    <FontAwesomeIcon
      icon={faCircleExclamation}
      size={iconSize}
      color={BRAND.error.on}
    />
  ),
  warning: (
    <FontAwesomeIcon
      icon={faTriangleExclamation}
      size={iconSize}
      color={BRAND.warning.on}
    />
  ),
  info: (
    <FontAwesomeIcon
      icon={faCircleInfo}
      size={iconSize}
      color={BRAND.info.on}
    />
  ),
  loading: (
    <FontAwesomeIcon
      icon={faSpinnerThird}
      size={iconSize}
      color={BRAND.loading.on}
    />
  ),
};

const Toaster = (props: ToasterProps) => (
  <SonnerToaster
    position="top-center"
    duration={4000}
    closeButton
    visibleToasts={3}
    icons={variantIcons}
    toastOptions={{
      // Default (no variant) — neutral purple loading card.
      style: variantTint("loading"),
      titleStyle: {
        fontFamily: FONTS.bold,
        fontSize: 16,
        lineHeight: 20,
        color: BRAND.loading.on,
      },
      descriptionStyle: {
        fontFamily: FONTS.regular,
        fontSize: 14,
        lineHeight: 18,
        marginTop: 2,
        color: BRAND.loading.on,
        opacity: 0.9,
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

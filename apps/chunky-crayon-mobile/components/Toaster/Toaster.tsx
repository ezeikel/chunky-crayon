import { Toaster as SonnerToaster, toast as sonnerToast } from "sonner-native";
import type { ComponentProps } from "react";
import { FONTS, COLORS } from "@/lib/design";

/**
 * CC brand-styled Toaster — mobile port of
 * packages/coloring-ui/src/Toaster.tsx that ships across the web
 * apps. Sonner-native exposes a subset of the web sonner config
 * (no Tailwind, no CSS vars, no className mapping), so the styling
 * here uses StyleSheet-shaped objects instead.
 *
 * Visual language mirrored from web:
 *   - Top-center position
 *   - Chunky border-radius (16px)
 *   - 4-second auto-close, kid-readable timing
 *   - Per-variant tinted background + dark border + dark text
 *   - Bold title, slightly muted description
 *   - richColors true so sonner picks variant theming
 *
 * Re-export `toast` from sonner-native unchanged so call sites do:
 *   import { toast } from "@/components/Toaster";
 *   toast.success("Saved!");
 *   toast.error("Couldn't save your artwork.");
 *
 * Memory feedback_sonner_toasts_for_errors: transient feedback lives
 * here, not in Alert.alert. Destructive confirms (Start Over, Delete
 * Profile, Sign Out) use ConfirmSheet instead — same brand chrome,
 * sheet-style modal feel kid-readable wording.
 */

type ToasterProps = ComponentProps<typeof SonnerToaster>;

// Per-variant background tint (10% alpha over white). Mobile's
// CRAYON_PALETTE values don't have ready-made bg-cream/error-on
// pairs the web design system ships, so we use the existing
// state tokens at low alpha and lock the dark border + text to a
// brand-friendly shade.
const TOAST_BG_ALPHA = "1A"; // ~10%

const variantStyles = {
  success: {
    backgroundColor: `${COLORS.success}${TOAST_BG_ALPHA}`,
    borderColor: COLORS.success,
    color: "#065F46",
  },
  error: {
    backgroundColor: `${COLORS.error}${TOAST_BG_ALPHA}`,
    borderColor: COLORS.error,
    color: "#7F1D1D",
  },
  warning: {
    backgroundColor: `${COLORS.warning}${TOAST_BG_ALPHA}`,
    borderColor: COLORS.warning,
    color: "#78350F",
  },
  info: {
    backgroundColor: `${COLORS.info}${TOAST_BG_ALPHA}`,
    borderColor: COLORS.info,
    color: "#1E3A8A",
  },
};

const Toaster = (props: ToasterProps) => (
  <SonnerToaster
    position="top-center"
    duration={4000}
    closeButton
    richColors
    visibleToasts={3}
    styles={{
      toast: {
        // White-paper default look, used for variants without richColors
        // overrides. Each variant below replaces this where it matters.
        backgroundColor: "#FFFFFF",
        borderWidth: 2,
        borderColor: COLORS.borderLight,
        borderRadius: 16,
        // Chunky shadow web has, RN-ified.
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.18,
        shadowRadius: 12,
        elevation: 6,
        paddingVertical: 14,
        paddingHorizontal: 16,
      },
      title: {
        fontFamily: FONTS.bold,
        fontSize: 16,
        color: COLORS.textPrimary,
        lineHeight: 20,
      },
      description: {
        fontFamily: FONTS.regular,
        fontSize: 14,
        color: COLORS.textSecondary,
        lineHeight: 18,
        marginTop: 2,
      },
    }}
    {...props}
  />
);

export { Toaster, sonnerToast as toast, variantStyles };
export default Toaster;

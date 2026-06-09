import SubscriptionPaywallModal from "@/components/SubscriptionPaywallModal";
import TopUpPackModal from "@/components/TopUpPackModal";
import ColorAsYouGoModal from "@/components/ColorAsYouGoModal";
import { useHasSubscription } from "@/hooks/useEntitlements";

/**
 * Three paywall surfaces live in the app, each useful in a different
 * user context. PaywallRouter is the single place call sites import
 * when they want "show the right paywall" without having to know which
 * one is right. The picking logic stays here so feature surfaces stay
 * dumb — they just say "open the paywall" and let the router decide.
 *
 *   SubscriptionPaywallModal  ← non-subscriber, subscription-first
 *                              (the default conversion surface)
 *   ColorAsYouGoModal         ← non-subscriber, packs-first
 *                              (PostHog A/B variant for non-subs)
 *   TopUpPackModal            ← subscriber, ran out of credits
 *                              (subscriber top-ups, no plan change)
 *
 * Routing rules (in order):
 *
 *   1. User has an active subscription → TopUpPackModal.
 *      They've already converted; the only paywall they should ever
 *      see is "buy more credits without changing your plan".
 *
 *   2. User is a non-subscriber AND the `variant` prop is
 *      'packs_first' → ColorAsYouGoModal.
 *
 *   3. User is a non-subscriber (default) → SubscriptionPaywallModal.
 *      Subscriptions are CC's primary offering; packs are a conversion
 *      lever we A/B-test against the sub-first surface.
 *
 * `variant` is wired by callers today; once a PostHog flag lands on
 * mobile, the router will read it directly so call sites stay dumb.
 * See ~/.claude/plans/mobile-paywall-scaffold.md for the full plan.
 *
 * `forceVariant` is a debug escape hatch for Storybook / QA — bypasses
 * the entitlement check and renders whichever paywall you name. NEVER
 * pass it from production code paths; it would let kids dodge the
 * router and see the wrong surface for their state.
 */

type PaywallVariant = "subscription_first" | "packs_first";

export type PaywallRouterProps = {
  visible: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  /**
   * Which non-subscriber paywall to show. Defaults to
   * 'subscription_first' (CC's primary offering). PostHog A/B test
   * routing will eventually drive this prop.
   */
  variant?: PaywallVariant;
  /**
   * QA / Storybook only: skip the entitlement check and force a
   * specific paywall surface. Do not use in production call sites.
   */
  forceVariant?: "subscription" | "top_up" | "color_as_you_go";
  /**
   * Skip the in-modal parental gate on the Buy button because a gate
   * has ALREADY fired upstream in the SAME flow (e.g. the caller gated
   * before opening the paywall, like the header credits chip or the
   * gated Settings area). Without this the parent would be asked the
   * math question twice in one flow. Defaults to false (always gate the
   * purchase) so call sites that open the paywall ungated stay safe.
   */
  skipParentalGate?: boolean;
};

const PaywallRouter = ({
  visible,
  onClose,
  onSuccess,
  variant = "subscription_first",
  forceVariant,
  skipParentalGate = false,
}: PaywallRouterProps) => {
  const hasSubscription = useHasSubscription();

  // Debug / QA escape hatch.
  if (forceVariant === "top_up") {
    return (
      <TopUpPackModal
        visible={visible}
        onClose={onClose}
        onSuccess={onSuccess}
        skipParentalGate={skipParentalGate}
      />
    );
  }
  if (forceVariant === "color_as_you_go") {
    return (
      <ColorAsYouGoModal
        visible={visible}
        onClose={onClose}
        onSuccess={onSuccess}
        skipParentalGate={skipParentalGate}
      />
    );
  }
  if (forceVariant === "subscription") {
    return (
      <SubscriptionPaywallModal
        visible={visible}
        onClose={onClose}
        onSuccess={onSuccess}
        skipParentalGate={skipParentalGate}
      />
    );
  }

  // Subscribers only ever see the top-up surface — they don't need to
  // re-convert, they just want more credits.
  if (hasSubscription) {
    return (
      <TopUpPackModal
        visible={visible}
        onClose={onClose}
        onSuccess={onSuccess}
        skipParentalGate={skipParentalGate}
      />
    );
  }

  // Non-subscribers: pick the variant. PostHog flag will drive this
  // once the experiment lands; for now caller passes it explicitly.
  if (variant === "packs_first") {
    return (
      <ColorAsYouGoModal
        visible={visible}
        onClose={onClose}
        onSuccess={onSuccess}
        skipParentalGate={skipParentalGate}
      />
    );
  }

  return (
    <SubscriptionPaywallModal
      visible={visible}
      onClose={onClose}
      onSuccess={onSuccess}
      skipParentalGate={skipParentalGate}
    />
  );
};

export default PaywallRouter;

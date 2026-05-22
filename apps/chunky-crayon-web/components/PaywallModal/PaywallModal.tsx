'use client';

/**
 * PaywallModal — opens above the create form when the user can't
 * generate. Three states share one component (copy + ladder differ):
 *
 *   - guest_limit            — guest has used their 2 free tries
 *   - no_subscription        — signed-in, no sub, no credits
 *   - subscriber_no_credits  — signed-in subscriber, out of credits
 *
 * In-modal Stripe checkout for subscription plans (via useStripeCheckout)
 * so a decided user can subscribe with one tap, without leaving the
 * page. For subscribers who just need a top-up the modal collapses to a
 * single "See pack options" CTA → /pricing#packs, since their existing
 * subscription cards would be noise.
 *
 * Visual template mirrors ParentalGateModal (same brand-orange + cream
 * dialog shape, same `gap-6 rounded-3xl` content). Memory rules: FA
 * duotone over emojis, no em dashes, no "AI" word in copy.
 */

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faStars,
  faGift,
  faSparkles,
} from '@fortawesome/pro-duotone-svg-icons';
import { PlanName } from '@one-colored-pixel/db/types';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { SUBSCRIPTION_PLANS, TRACKING_EVENTS } from '@/constants';
import { type Currency } from '@/lib/currency';
import { trackEvent } from '@/utils/analytics-client';
import { useStripeCheckout } from '@/hooks/useStripeCheckout';
import cn from '@/utils/cn';

export type PaywallState =
  | 'guest_limit'
  | 'no_subscription'
  | 'subscriber_no_credits';

type PaywallModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  state: PaywallState;
  /** Where the block was hit. Forwarded to all paywall_* events for
   *  surface-level funnel attribution. */
  triggerLocation: string;
  currency: Currency;
};

// Maps shared by the three states. PlanName enum is the stable key into
// `pricing.plans.<lower>.name` translation entries.
const PLAN_TRANSLATION_KEYS: Record<PlanName, string> = {
  [PlanName.SPLASH]: 'splash',
  [PlanName.RAINBOW]: 'rainbow',
  [PlanName.SPARKLE]: 'sparkle',
};

const STATE_ICON: Record<PaywallState, typeof faStars> = {
  guest_limit: faStars,
  no_subscription: faStars,
  subscriber_no_credits: faGift,
};

const PaywallModal = ({
  open,
  onOpenChange,
  state,
  triggerLocation,
  currency,
}: PaywallModalProps) => {
  const t = useTranslations('paywall');
  const tPricing = useTranslations('pricing');
  const router = useRouter();
  const { loadingPlan, purchasePlan } = useStripeCheckout({
    currency,
    source: 'paywall_modal',
  });

  // Fire view event each time the modal opens. Bypassed if `open` flips
  // open → open (no re-render path does that), but guarded with the
  // dependency in case React StrictMode double-mounts in dev.
  useEffect(() => {
    if (!open) return;
    trackEvent(TRACKING_EVENTS.PAYWALL_VIEWED, { state, triggerLocation });
  }, [open, state, triggerLocation]);

  // Radix `onOpenChange(false)` fires for every close path (X, Escape,
  // outside-click) but doesn't tell us which. We disambiguate by
  // setting `dismissReasonRef` BEFORE onOpenChange in the handlers we
  // own (Maybe later button, outside-click hook, secondary-link nav).
  // If onOpenChange fires without a ref set, default to 'x'.
  const dismissReasonRef = useRef<
    'x' | 'maybe_later' | 'outside_click' | 'escape_key' | 'navigated' | null
  >(null);

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      // 'navigated' means we closed the modal programmatically right
      // before a router.push — don't fire DISMISSED for that case.
      const reason = dismissReasonRef.current ?? 'x';
      dismissReasonRef.current = null;
      if (reason !== 'navigated') {
        trackEvent(TRACKING_EVENTS.PAYWALL_DISMISSED, {
          state,
          triggerLocation,
          via: reason,
        });
      }
    }
    onOpenChange(next);
  };

  const handleSecondaryClick = (
    link: 'pricing' | 'pricing_packs' | 'signin',
  ) => {
    trackEvent(TRACKING_EVENTS.PAYWALL_SECONDARY_CLICKED, {
      state,
      triggerLocation,
      link,
    });
    // Tell handleOpenChange not to fire DISMISSED — secondary click is
    // a conversion-side action, not a dismiss.
    dismissReasonRef.current = 'navigated';
    onOpenChange(false);
    if (link === 'pricing') router.push('/pricing');
    else if (link === 'pricing_packs') router.push('/pricing#packs');
    else router.push('/signin');
  };

  const handleMaybeLater = () => {
    dismissReasonRef.current = 'maybe_later';
    onOpenChange(false);
  };

  // Subscribers don't see plan cards (they already have a sub) — instead
  // a single "See pack options" button. Everyone else gets the three
  // subscription plans + a secondary "see packs and full details" link.
  const showPlanCards = state !== 'subscriber_no_credits';

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className="gap-6 rounded-3xl p-6 sm:max-w-2xl sm:p-8"
        onPointerDownOutside={() => {
          dismissReasonRef.current = 'outside_click';
        }}
        onEscapeKeyDown={() => {
          dismissReasonRef.current = 'escape_key';
        }}
      >
        <DialogHeader className="items-center gap-3 text-center">
          <FontAwesomeIcon
            icon={STATE_ICON[state]}
            aria-hidden="true"
            className="text-5xl"
            style={
              {
                '--fa-primary-color': 'hsl(var(--crayon-orange))',
                '--fa-secondary-color': 'hsl(var(--crayon-yellow))',
                '--fa-secondary-opacity': '1',
              } as React.CSSProperties
            }
          />
          <DialogTitle className="font-tondo text-2xl font-bold md:text-3xl">
            {t(`${pickCopyKey(state)}.title`)}
          </DialogTitle>
          <DialogDescription className="text-base text-text-secondary">
            {t(`${pickCopyKey(state)}.subtitle`)}
          </DialogDescription>
        </DialogHeader>

        {showPlanCards ? (
          <PlanCardRow
            currency={currency}
            loadingPlan={loadingPlan}
            onSubscribe={(plan) => purchasePlan({ plan, interval: 'monthly' })}
            tPricing={tPricing}
            t={t}
          />
        ) : (
          // subscriber_no_credits — single "See pack options" CTA.
          <Button
            size="lg"
            className="w-full rounded-full text-base"
            onClick={() => handleSecondaryClick('pricing_packs')}
          >
            <FontAwesomeIcon icon={faSparkles} className="mr-2" />
            {t('subscriberNoCredits.primary')}
          </Button>
        )}

        <div className="flex flex-col items-center gap-2 pt-1">
          {/* Secondary: see packs + full plan details. Subscribers
              already saw the pack CTA above, so for them this link is
              omitted. */}
          {showPlanCards && (
            <button
              type="button"
              onClick={() => handleSecondaryClick('pricing_packs')}
              className="text-sm text-text-secondary underline-offset-4 hover:text-crayon-orange hover:underline"
            >
              {t('common.seeAllPlans')}
            </button>
          )}

          {/* Tertiary (guests only): sign up for 15 free credits. Below
              the plan-link so paid path stays primary. */}
          {state === 'guest_limit' && (
            <button
              type="button"
              onClick={() => handleSecondaryClick('signin')}
              className="text-sm text-text-secondary underline-offset-4 hover:text-crayon-orange hover:underline"
            >
              {t('common.signUpFree')}
            </button>
          )}

          <button
            type="button"
            onClick={handleMaybeLater}
            className="mt-1 text-xs text-text-secondary/70 hover:text-text-secondary"
          >
            {t('common.dismiss')}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// Translation namespace per state. Kept as a function so the
// state→key mapping is the single thing to maintain when adding a new
// state.
const pickCopyKey = (state: PaywallState): string => {
  if (state === 'guest_limit') return 'guestLimit';
  if (state === 'no_subscription') return 'noSubscription';
  return 'subscriberNoCredits';
};

type PlanCardRowProps = {
  currency: Currency;
  loadingPlan: string | null;
  onSubscribe: (plan: (typeof SUBSCRIPTION_PLANS)['monthly'][number]) => void;
  t: ReturnType<typeof useTranslations>;
  tPricing: ReturnType<typeof useTranslations>;
};

const PlanCardRow = ({
  currency,
  loadingPlan,
  onSubscribe,
  t,
  tPricing,
}: PlanCardRowProps) => {
  const plans = SUBSCRIPTION_PLANS.monthly;
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {plans.map((plan) => {
        const tk = PLAN_TRANSLATION_KEYS[plan.key];
        const planName = tPricing(`plans.${tk}.name`);
        const priceEntry = plan.prices[currency];
        const credits = Number(plan.credits.match(/\d+/)?.[0] ?? 0);
        const isLoading = loadingPlan === plan.key;
        const isPopular = Boolean(plan.mostPopular);
        return (
          <div
            key={plan.key}
            className={cn(
              'relative flex flex-col gap-2 rounded-2xl border-2 p-4 transition-colors',
              isPopular
                ? 'border-crayon-orange bg-crayon-orange-light/15'
                : 'border-paper-cream-dark bg-white',
            )}
          >
            {isPopular && (
              <span className="absolute -top-2 left-1/2 -translate-x-1/2 rounded-full bg-crayon-orange px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                {t('common.popular')}
              </span>
            )}
            <div className="flex items-baseline justify-between gap-2">
              <span className="font-tondo text-lg font-bold text-text-primary">
                {planName}
              </span>
              <span className="font-tondo text-xl font-bold text-text-primary">
                {priceEntry.display}
              </span>
            </div>
            <span className="text-xs text-text-secondary">
              {t('common.creditsPerMonth', { count: credits })}
            </span>
            <Button
              variant={isPopular ? 'default' : 'neutral'}
              className="mt-1 w-full rounded-full"
              onClick={() => onSubscribe(plan)}
              disabled={isLoading}
            >
              {isLoading ? '…' : t('common.subscribe')}
            </Button>
          </div>
        );
      })}
    </div>
  );
};

export default PaywallModal;

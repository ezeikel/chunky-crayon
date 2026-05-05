'use client';

import { useTranslations } from 'next-intl';
import { faWandMagicSparkles } from '@fortawesome/pro-duotone-svg-icons';
import useUser from '@/hooks/useUser';
import { trackEvent } from '@/utils/analytics-client';
import { TRACKING_EVENTS } from '@/constants';
import SubmitButton from '@/components/buttons/SubmitButton/SubmitButton';
import { Button } from '@/components/ui/button';
import cn from '@/utils/cn';
import { useInputMode } from './inputs/InputModeContext';

type FormCTAProps = {
  className?: string;
};

/**
 * Bottom-of-form CTA shared across all input modes.
 *
 * Renders:
 * - Orange "X free tries left" chip for signed-out guests who can still generate.
 * - Big pill submit button ("Create") when the user can generate AND the active
 *   input is ready (text has content, voice has a transcription, image is
 *   uploaded).
 * - Auth fallback button (Sign up / View plans / Buy credits / Get started)
 *   when the user is blocked.
 *
 * The submit button is always present in the DOM so the form's action wires
 * up; it's just disabled until `isReady` flips true. This keeps the layout
 * stable across modes and avoids the previous per-input duplication.
 */
const FormCTA = ({ className }: FormCTAProps) => {
  const t = useTranslations('createForm');
  const {
    canGenerate,
    blockedReason,
    hasActiveSubscription,
    handleAuthAction,
    isGuest,
    guestGenerationsRemaining,
    maxGuestGenerations,
  } = useUser();
  const { isReady, isBusy } = useInputMode();

  // Hide the global CTA when the active input is in a transient inner
  // state (recording, capturing, confirming preview) — its own in-flow
  // controls own the interaction there.
  if (isBusy) return null;

  // Signed-in user without credits / signed-out guest past limit etc.
  if (!canGenerate) {
    // Non-subscribers without credits get sent to /pricing (subscription
    // pitch) — that page has its own inline escape-hatch to
    // /color-as-you-go. We additionally show a secondary inline link
    // below the primary CTA so the lighter-touch path isn't buried.
    const isNoCreditsNonSubscriber =
      blockedReason === 'no_credits' && !hasActiveSubscription;

    const config =
      blockedReason === 'guest_limit_reached'
        ? {
            text: t('buttonSignUp'),
            subtext: t('subtextGuestLimit'),
            action: () => {
              trackEvent(TRACKING_EVENTS.GUEST_SIGNUP_CLICKED, {
                location: 'text_input',
                generationsUsed:
                  maxGuestGenerations - guestGenerationsRemaining,
              });
              handleAuthAction('signin');
            },
          }
        : blockedReason === 'no_credits'
          ? {
              text: hasActiveSubscription
                ? t('buttonBuyCredits')
                : t('buttonViewPlans'),
              subtext: hasActiveSubscription
                ? t('subtextNoCreditsSubscribed')
                : t('subtextNoCreditsNoSubscription'),
              action: () =>
                handleAuthAction(hasActiveSubscription ? 'billing' : 'pricing'),
            }
          : {
              text: t('buttonGetStarted'),
              subtext: t('subtextFallback'),
              action: () => handleAuthAction('signin'),
            };

    return (
      <div className={cn('flex flex-col gap-3', className)}>
        <Button
          onClick={config.action}
          size="lg"
          className="rounded-full hover:scale-105 active:scale-95"
          type="button"
        >
          {config.text}
        </Button>
        <p className="font-tondo text-sm text-center text-text-muted">
          {config.subtext}
        </p>
        {isNoCreditsNonSubscriber && (
          <a
            href="/color-as-you-go"
            className="font-tondo text-sm text-center text-text-muted hover:text-crayon-orange underline-offset-4 hover:underline transition-colors"
          >
            {t('linkColorAsYouGo')}
          </a>
        )}
      </div>
    );
  }

  return (
    <div className={cn('flex flex-col gap-3', className)}>
      {isGuest && (
        <div className="flex justify-center">
          <span className="font-tondo text-sm font-bold text-crayon-orange bg-crayon-orange-light/25 px-3 py-1 rounded-full">
            {t('freeTriesChip', { remaining: guestGenerationsRemaining })}
          </span>
        </div>
      )}
      <SubmitButton
        text={t('buttonCreate')}
        icon={faWandMagicSparkles}
        disabled={!isReady}
        className="font-tondo font-bold text-base md:text-lg text-white bg-btn-orange shadow-btn-primary hover:shadow-btn-primary-hover hover:scale-105 active:scale-95 transition-all duration-200 rounded-full py-4 h-auto disabled:opacity-50 disabled:hover:scale-100"
        data-testid="create-submit"
      />
    </div>
  );
};

export default FormCTA;

'use client';

import { useTranslations } from 'next-intl';
import { faWandMagicSparkles } from '@fortawesome/pro-duotone-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import type useUser from '@/hooks/useUser';
import SubmitButton from '@/components/buttons/SubmitButton/SubmitButton';
import { Button } from '@/components/ui/button';
import cn from '@/utils/cn';
import { useInputMode } from './inputs/InputModeContext';
import BlockReasonPill from './BlockReasonPill';
import { type PaywallState } from '@/components/PaywallModal';

// Subset of useUser() this component needs. Hoisted from the parent so
// CreateColoringPageForm fires useUser() once across the whole form.
type FormCTAUserSlice = Pick<
  ReturnType<typeof useUser>,
  | 'canGenerate'
  | 'blockedReason'
  | 'hasActiveSubscription'
  | 'isGuest'
  | 'guestGenerationsRemaining'
>;

type FormCTAProps = {
  className?: string;
  /** Opens the paywall modal with the given trigger location for funnel
   *  attribution. Required — every blocked-state path through this
   *  component now leads to the modal. */
  openPaywall: (triggerLocation: string) => void;
  /** When true, render ONLY the chip / pill — no Create-shaped button.
   *  Scene mode uses this because the wizard owns its own Create
   *  button, but we still want the chip + pill underneath the wizard. */
  compact?: boolean;
  user: FormCTAUserSlice;
};

/**
 * Bottom-of-form CTA shared across all input modes.
 *
 * Three render states (down from six pre-rewrite):
 *
 *   - guest with tries left   → free-tries chip + Submit
 *   - blocked (any reason)    → BlockReasonPill + button that opens paywall
 *   - happy path              → just Submit, disabled until isReady
 *
 * The legacy soft-wall buttons (Sign up / View plans / Buy credits /
 * Get started) all moved into PaywallModal. The single source of truth
 * for "what do we sell this user" is now `PaywallModal`'s state
 * lookup, not a per-component config object.
 */
const FormCTA = ({
  className,
  openPaywall,
  compact = false,
  user,
}: FormCTAProps) => {
  const t = useTranslations('createForm');
  const {
    canGenerate,
    blockedReason,
    hasActiveSubscription,
    isGuest,
    guestGenerationsRemaining,
  } = user;
  const { isReady, isBusy } = useInputMode();

  // Hide the global CTA when the active input is in a transient inner
  // state (recording, capturing, confirming preview) — its own in-flow
  // controls own the interaction there.
  if (isBusy) return null;

  // Map (blockedReason, subStatus) → PaywallState. Source of truth for
  // both the pill copy and the modal's ladder.
  const blockState: PaywallState | null = (() => {
    if (!blockedReason) return null;
    if (blockedReason === 'guest_limit_reached') return 'guest_limit';
    if (blockedReason === 'no_credits') {
      return hasActiveSubscription
        ? 'subscriber_no_credits'
        : 'no_subscription';
    }
    return null;
  })();

  return (
    <div className={cn('flex flex-col gap-3', className)}>
      {/* Top-row chip:
          - Guest with tries left      → encouraging "X free tries left"
          - Blocked (any reason)       → BlockReasonPill (lock + reason)
          - Happy signed-in path       → nothing */}
      {blockState ? (
        <BlockReasonPill blockState={blockState} />
      ) : (
        isGuest && (
          <div className="flex justify-center">
            <span className="font-tondo text-sm font-bold text-crayon-orange bg-crayon-orange-light/25 px-3 py-1 rounded-full">
              {t('freeTriesChip', { remaining: guestGenerationsRemaining })}
            </span>
          </div>
        )
      )}

      {/* Compact mode (Scene wizard owns its own Create button): chip /
          pill only, no SubmitButton. */}
      {!compact &&
        (blockState ? (
          // Blocked: the button looks IDENTICAL to the normal Create
          // button — full brand fill, wand icon — it just opens the
          // paywall instead of submitting. No lock, no dimming: the
          // parent has come this far, a lock at the payoff moment
          // suppresses the tap. Honesty about the limit is carried by
          // the BlockReasonPill above, so this is informed-not-tricked,
          // and the button stays inviting. (Same reasoning as
          // SceneBuilder's PrimaryAction blocked variant.)
          //
          // Plain Button (not SubmitButton) — SubmitButton is hardwired
          // type="submit" + useFormStatus; this must NOT submit the form.
          <Button
            type="button"
            onClick={() => openPaywall('formcta_create_button')}
            className="flex h-auto gap-x-2 rounded-full py-4 text-base md:text-lg"
            data-testid="create-submit-blocked"
          >
            <FontAwesomeIcon
              icon={faWandMagicSparkles}
              className="text-lg"
              style={
                {
                  '--fa-primary-color': 'white',
                  '--fa-secondary-color': 'rgba(255, 255, 255, 0.85)',
                  '--fa-secondary-opacity': '1',
                } as React.CSSProperties
              }
            />
            {t('buttonCreate')}
          </Button>
        ) : (
          <SubmitButton
            text={t('buttonCreate')}
            icon={faWandMagicSparkles}
            disabled={!canGenerate || !isReady}
            className="h-auto rounded-full py-4 text-base disabled:hover:scale-100 md:text-lg"
            data-testid="create-submit"
          />
        ))}
    </div>
  );
};

export default FormCTA;

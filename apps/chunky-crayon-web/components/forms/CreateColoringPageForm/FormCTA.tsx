'use client';

import { useTranslations } from 'next-intl';
import {
  faWandMagicSparkles,
  faLock,
} from '@fortawesome/pro-duotone-svg-icons';
import type useUser from '@/hooks/useUser';
import SubmitButton from '@/components/buttons/SubmitButton/SubmitButton';
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
          // Blocked: button looks like a Submit but tap opens paywall.
          // Stays in the DOM so the form layout is stable across states.
          <button
            type="button"
            onClick={() => openPaywall('formcta_create_button')}
            className={cn(
              'inline-flex h-auto items-center justify-center gap-2 rounded-full',
              'bg-crayon-orange/60 px-6 py-4 text-base font-bold text-white',
              'transition hover:bg-crayon-orange/70 active:scale-[0.98]',
              'md:text-lg',
            )}
            data-testid="create-submit-blocked"
          >
            <FormCTAIcon blocked />
            {t('buttonCreate')}
          </button>
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

// Tiny local icon helper so the blocked button's lock icon styling
// stays co-located with the button it lives on.
const FormCTAIcon = ({ blocked }: { blocked: boolean }) => {
  if (!blocked) return null;
  // Inline svg via FontAwesome to avoid pulling FontAwesomeIcon into
  // the SubmitButton (which would shift its bundle). Tiny inline.
  // We re-use the duotone faLock by component for the blocked-button
  // affordance — keeps the lock visual language consistent with the
  // pill above.
  return (
    <span
      className="inline-flex h-5 w-5 items-center justify-center"
      aria-hidden="true"
    >
      <svg
        viewBox={`0 0 ${faLock.icon[0]} ${faLock.icon[1]}`}
        className="h-4 w-4 fill-current"
      >
        <path d={faLock.icon[4] as string} />
      </svg>
    </span>
  );
};

export default FormCTA;

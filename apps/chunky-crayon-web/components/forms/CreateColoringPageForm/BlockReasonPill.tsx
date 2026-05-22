'use client';

/**
 * Small pill rendered above the Create button when the user can't
 * generate. Tells them WHY at a glance ("Out of free tries", "Subscribe
 * to keep going") so they don't tap through the whole wizard before
 * finding out. Tap on the Create button itself opens the PaywallModal
 * with the matching ladder.
 *
 * Visual parallels the existing free-tries chip in FormCTA (same brand
 * orange family) but darker fill + lock icon to signal "blocked" vs the
 * happier "you have N tries left" chip.
 */

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faLock } from '@fortawesome/pro-duotone-svg-icons';
import { useTranslations } from 'next-intl';

type BlockReasonPillProps = {
  /** Same discriminator as PaywallModal: which copy to show. */
  blockState: 'guest_limit' | 'no_subscription' | 'subscriber_no_credits';
};

const STATE_TRANSLATION_KEY = {
  guest_limit: 'guestLimit',
  no_subscription: 'noSubscription',
  subscriber_no_credits: 'subscriberNoCredits',
} as const;

const BlockReasonPill = ({ blockState }: BlockReasonPillProps) => {
  const t = useTranslations('createForm.blockReason');
  return (
    <div className="flex justify-center">
      <span className="inline-flex items-center gap-1.5 rounded-full bg-crayon-orange-light/30 px-3 py-1 font-tondo text-sm font-bold text-crayon-orange">
        <FontAwesomeIcon
          icon={faLock}
          aria-hidden="true"
          className="text-xs"
          style={
            {
              '--fa-primary-color': 'hsl(var(--crayon-orange))',
              '--fa-secondary-color': 'hsl(var(--crayon-orange))',
              '--fa-secondary-opacity': '0.4',
            } as React.CSSProperties
          }
        />
        {t(STATE_TRANSLATION_KEY[blockState])}
      </span>
    </div>
  );
};

export default BlockReasonPill;

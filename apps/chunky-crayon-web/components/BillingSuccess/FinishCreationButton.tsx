'use client';

/**
 * Post-checkout "Finish your coloring page" button.
 *
 * When a user hits the paywall mid-creation and subscribes, the create
 * form snapshots their scene to localStorage before the Stripe redirect
 * (see lib/create/pending-creation). This button — shown on the billing
 * success page — only renders if such a snapshot exists, and routes
 * back to the homepage where the form restores it.
 *
 * Client component because `loadPendingCreation` touches localStorage;
 * the parent `BillingSuccess` is a server component, so the
 * localStorage check has to be islanded here.
 *
 * It does NOT clear the snapshot — the homepage form clears it once it
 * has actually restored. Clearing here would lose the scene if the user
 * navigates away by some other route.
 */

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faWandMagicSparkles } from '@fortawesome/pro-duotone-svg-icons';
import { loadPendingCreation } from '@/lib/create/pending-creation';

const FinishCreationButton = () => {
  // Start false — SSR renders nothing, then the mount effect reveals the
  // button if a snapshot is present. No layout shift worth guarding:
  // it's an additive primary CTA, not a placeholder.
  const [hasPending, setHasPending] = useState(false);

  useEffect(() => {
    setHasPending(loadPendingCreation() !== null);
  }, []);

  if (!hasPending) return null;

  return (
    <Link
      href="/"
      className="inline-flex items-center justify-center gap-2 rounded-full bg-crayon-orange px-6 py-3 font-semibold text-white transition-colors hover:bg-crayon-orange-dark"
    >
      <FontAwesomeIcon icon={faWandMagicSparkles} />
      Finish your coloring page
    </Link>
  );
};

export default FinishCreationButton;

'use client';

import { useState } from 'react';
import posthog from 'posthog-js';
import { toast } from 'sonner';
import { createCustomerPortalSession } from '@/app/actions/stripe';

type ManageSubscriptionButtonProps = {
  // Where the click is fired from, for analytics segmentation.
  source: string;
  className?: string;
  children?: React.ReactNode;
};

// Opens the Stripe Billing Portal (manage payment method, view invoices,
// cancel). Reuses the existing createCustomerPortalSession server action so
// there is one source of truth for portal creation. Sonner toast on failure
// per the project convention (no inline red blocks).
const ManageSubscriptionButton = ({
  source,
  className,
  children,
}: ManageSubscriptionButtonProps) => {
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    posthog.capture('manage_subscription_clicked', { source });
    setLoading(true);

    try {
      const result = await createCustomerPortalSession();

      if (result?.url) {
        window.location.href = result.url;
        return;
      }

      // No URL means no Stripe customer resolved for this session. The user
      // is still authenticated and can use the billing page; surface a
      // recoverable message rather than a dead button.
      toast.error('We could not open billing just now. Please try again.');
    } catch (error) {
      console.error('Error opening customer portal:', error);
      toast.error('We could not open billing just now. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={loading}
      className={className}
    >
      {loading ? 'Opening...' : (children ?? 'Manage subscription')}
    </button>
  );
};

export default ManageSubscriptionButton;

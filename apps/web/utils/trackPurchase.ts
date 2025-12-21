import { trackEvent } from '@/utils/analytics-client';
import { TRACKING_EVENTS } from '@/constants';

export type PurchaseTrackingProps = {
  value: number;
  currency: string;
  transactionId: string;
  quantity: number;
  productType: 'subscription' | 'credits';
  planName?: string;
  creditAmount?: number;
};

type WindowWithTracking = typeof window & {
  pintrk?: (...args: unknown[]) => void;
  fbq?: (...args: unknown[]) => void;
};

export const trackPurchase = ({
  value,
  currency,
  transactionId,
  quantity,
  productType,
  planName,
  creditAmount,
}: PurchaseTrackingProps) => {
  const w = window as WindowWithTracking;

  // Pinterest
  if (w.pintrk) {
    w.pintrk('track', 'checkout', {
      event_id: transactionId,
      value,
      order_quantity: quantity,
      currency,
    });
  }

  // Facebook Pixel
  if (w.fbq) {
    w.fbq('track', 'Purchase', {
      value,
      currency,
    });
  }

  // Unified analytics (PostHog + Vercel)
  trackEvent(TRACKING_EVENTS.CHECKOUT_COMPLETED, {
    productType,
    planName: planName as any,
    creditAmount,
    value,
    currency,
    transactionId,
  });
};

import { ANALYTICS_EVENTS } from '@/constants';
import { trackEvent } from './analytics';

export type PurchaseTrackingProps = {
  value: number;
  currency: string;
  eventId: string;
  quantity: number;
};

type WindowWithTracking = typeof window & {
  pintrk?: (...args: any[]) => void;
  fbq?: (...args: any[]) => void;
};

export const trackPurchase = ({
  value,
  currency,
  eventId,
  quantity,
}: PurchaseTrackingProps) => {
  const w = window as WindowWithTracking;
  // Pinterest
  if (w.pintrk) {
    w.pintrk('track', 'checkout', {
      event_id: eventId,
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
  // Vercel Analytics
  trackEvent(ANALYTICS_EVENTS.PURCHASE, {
    value,
    currency,
    eventId,
    quantity,
  });
};

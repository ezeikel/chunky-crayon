'use client';

import { useEffect } from 'react';
import { trackPurchase, trackSubscribe } from '@/utils/pixels';
import { trackEvent } from '@/utils/analytics-client';
import { TRACKING_EVENTS } from '@/constants';

type PurchaseTrackingProps = {
  value: number;
  currency: string;
  eventId: string;
  productType: 'subscription' | 'credits';
  planName?: string;
  creditAmount?: number;
};

const PurchaseTracking = ({
  value,
  currency,
  eventId,
  productType,
  planName,
  creditAmount,
}: PurchaseTrackingProps) => {
  useEffect(() => {
    // Facebook + Pinterest pixels with event ID for dedup. eventId is
    // the Stripe checkout session id, which is also the canonical order
    // id for Pinterest order_id dedup against the CAPI Purchase fire.
    trackPurchase({
      value,
      currency,
      eventId,
      orderId: eventId,
      productType,
      planName,
      creditAmount,
    });

    // Fire Subscribe event for subscription purchases. eventId matches
    // the server CAPI fire (`sub_${session.id}`) so Meta deduplicates.
    if (productType === 'subscription' && planName) {
      trackSubscribe({
        planName,
        value,
        currency,
        eventId: `sub_${eventId}`,
      });
    }

    // PostHog + Vercel analytics
    trackEvent(TRACKING_EVENTS.CHECKOUT_COMPLETED, {
      productType,
      planName: planName as any,
      creditAmount,
      value,
      currency,
      transactionId: eventId,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
};

export default PurchaseTracking;

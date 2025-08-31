'use client';

import { useEffect } from 'react';
import { trackPurchase, PurchaseTrackingProps } from '@/utils/trackPurchase';

const PurchaseTracking = ({
  value,
  currency,
  eventId,
  quantity,
}: PurchaseTrackingProps) => {
  useEffect(() => {
    trackPurchase({ value, currency, eventId, quantity });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
};

export default PurchaseTracking;

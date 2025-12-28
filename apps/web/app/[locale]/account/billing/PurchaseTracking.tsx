'use client';

import { useEffect } from 'react';
import { trackPurchase, PurchaseTrackingProps } from '@/utils/trackPurchase';

const PurchaseTracking = ({
  value,
  currency,
  transactionId,
  quantity,
  productType,
  planName,
  creditAmount,
}: PurchaseTrackingProps) => {
  useEffect(() => {
    trackPurchase({
      value,
      currency,
      transactionId,
      quantity,
      productType,
      planName,
      creditAmount,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
};

export default PurchaseTracking;

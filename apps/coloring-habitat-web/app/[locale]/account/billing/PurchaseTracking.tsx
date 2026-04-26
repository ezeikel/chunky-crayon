"use client";

import { useEffect } from "react";
import { trackPurchase, trackSubscribe } from "@/utils/pixels";

type PurchaseTrackingProps = {
  value: number;
  currency: string;
  eventId: string;
  productType: "subscription" | "credits";
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
    // Facebook + Pinterest pixels with event ID for dedup
    trackPurchase({
      value,
      currency,
      eventId,
      productType,
      planName,
      creditAmount,
    });

    // Fire Subscribe event for subscription purchases. eventId matches
    // the server CAPI fire (`sub_${session.id}`) so Meta deduplicates.
    if (productType === "subscription" && planName) {
      trackSubscribe({
        planName,
        value,
        currency,
        eventId: `sub_${eventId}`,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
};

export default PurchaseTracking;

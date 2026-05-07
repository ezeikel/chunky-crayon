/**
 * Unified tracking utility for Facebook Pixel and Pinterest Tag
 *
 * This module provides type-safe tracking functions for conversion events
 * across both advertising platforms.
 */

type WindowWithPixels = typeof window & {
  pintrk?: (...args: unknown[]) => void;
  fbq?: (...args: unknown[]) => void;
};

// ============================================================================
// FACEBOOK PIXEL EVENTS
// Docs: https://developers.facebook.com/docs/meta-pixel/reference
// ============================================================================

type FacebookStandardEvents =
  | 'AddPaymentInfo'
  | 'AddToCart'
  | 'AddToWishlist'
  | 'CompleteRegistration'
  | 'Contact'
  | 'CustomizeProduct'
  | 'Donate'
  | 'FindLocation'
  | 'InitiateCheckout'
  | 'Lead'
  | 'PageView'
  | 'Purchase'
  | 'Schedule'
  | 'Search'
  | 'StartTrial'
  | 'SubmitApplication'
  | 'Subscribe'
  | 'ViewContent';

// ============================================================================
// PINTEREST TAG EVENTS
// Docs: https://help.pinterest.com/en/business/article/add-event-codes
// ============================================================================

type PinterestStandardEvents =
  | 'pagevisit'
  | 'viewcategory'
  | 'search'
  | 'addtocart'
  | 'checkout'
  | 'watchvideo'
  | 'signup'
  | 'lead'
  | 'custom';

// ============================================================================
// TRACKING FUNCTIONS
// ============================================================================

/**
 * Track a Facebook Pixel event
 */
export const trackFacebookEvent = (
  event: FacebookStandardEvents | string,
  params?: Record<string, unknown>,
) => {
  const w = window as WindowWithPixels;
  if (w.fbq) {
    w.fbq('track', event, params);
  }
};

/**
 * Track a Pinterest Tag event
 */
export const trackPinterestEvent = (
  event: PinterestStandardEvents | string,
  params?: Record<string, unknown>,
) => {
  const w = window as WindowWithPixels;
  if (w.pintrk) {
    w.pintrk('track', event, params);
  }
};

/**
 * Track the same event on both platforms
 */
export const trackPixelEvent = (
  facebookEvent: FacebookStandardEvents | string,
  pinterestEvent: PinterestStandardEvents | string,
  params?: {
    facebook?: Record<string, unknown>;
    pinterest?: Record<string, unknown>;
    shared?: Record<string, unknown>;
  },
) => {
  trackFacebookEvent(facebookEvent, { ...params?.shared, ...params?.facebook });
  trackPinterestEvent(pinterestEvent, {
    ...params?.shared,
    ...params?.pinterest,
  });
};

// ============================================================================
// HIGH-LEVEL TRACKING FUNCTIONS
// These provide semantic wrappers for common conversion events
// ============================================================================

/**
 * Track when a user completes registration/signup
 *
 * Pass `eventId` (the user's database id) so Meta can deduplicate this
 * client-side fire against the matching server-side CAPI fire from the
 * NextAuth signIn callback. Without it, Meta counts the signup twice.
 */
export const trackSignUp = (params?: { method?: string; eventId?: string }) => {
  const w = window as WindowWithPixels;
  const { eventId, ...rest } = params ?? {};
  if (w.fbq) {
    w.fbq(
      'track',
      'CompleteRegistration',
      {
        content_name: 'User Signup',
        status: true,
        ...rest,
      },
      ...(eventId ? [{ eventID: eventId }] : []),
    );
  }
  if (w.pintrk) {
    w.pintrk('track', 'signup', {
      ...(eventId && { event_id: eventId }),
    });
  }
};

/**
 * Track when a user initiates checkout.
 *
 * Meta-only by design. Pinterest's `checkout` event is its Purchase
 * fire — there's no separate InitiateCheckout, so firing `pintrk
 * 'checkout'` here AND from `trackPurchase` would double-count
 * Pinterest Purchases.
 *
 * Pass `eventId` so this client fire deduplicates against the matching
 * server CAPI fire from `createCheckoutSession`. Generate the id at
 * the call site (`crypto.randomUUID()`) and pass the same id to
 * `createCheckoutSession({ initiateCheckoutEventId })`.
 */
export const trackInitiateCheckout = (params: {
  value: number;
  currency: string;
  productType: 'subscription' | 'credits';
  planName?: string;
  creditAmount?: number;
  eventId?: string;
}) => {
  const w = window as WindowWithPixels;
  const fbParams = {
    value: params.value / 100, // Convert from pence to pounds/dollars
    currency: params.currency,
    content_type: 'product',
    content_name:
      params.productType === 'subscription'
        ? `${params.planName} Subscription`
        : `${params.creditAmount} Credits`,
  };
  if (w.fbq) {
    w.fbq(
      'track',
      'InitiateCheckout',
      fbParams,
      ...(params.eventId ? [{ eventID: params.eventId }] : []),
    );
  }
};

/**
 * Track when a user views important content (pricing, product pages)
 */
export const trackViewContent = (params: {
  contentType:
    | 'pricing'
    | 'coloring_page'
    | 'gallery'
    | 'pricing_faq'
    | 'homepage_faq';
  contentId?: string;
  contentName?: string;
  value?: number;
  currency?: string;
}) => {
  trackFacebookEvent('ViewContent', {
    content_type: params.contentType,
    content_ids: params.contentId ? [params.contentId] : undefined,
    content_name: params.contentName,
    value: params.value,
    currency: params.currency,
  });

  trackPinterestEvent('pagevisit', {
    line_items: params.contentId
      ? [
          {
            product_id: params.contentId,
            product_name: params.contentName,
          },
        ]
      : undefined,
    value: params.value,
    currency: params.currency,
  });
};

/**
 * Track when a user generates a lead action (e.g., creating content, starting trial)
 *
 * Pass `eventId` (typically the coloringImageId from the create action)
 * so Meta deduplicates this client fire against the matching CAPI fire
 * from createPendingColoringImage. Without it, Meta double-counts.
 */
export const trackLead = (params: {
  contentName: string;
  contentCategory?: string;
  value?: number;
  currency?: string;
  eventId?: string;
}) => {
  const w = window as WindowWithPixels;
  const fbParams = {
    content_name: params.contentName,
    content_category: params.contentCategory,
    value: params.value,
    currency: params.currency,
  };
  if (w.fbq) {
    w.fbq(
      'track',
      'Lead',
      fbParams,
      ...(params.eventId ? [{ eventID: params.eventId }] : []),
    );
  }
  if (w.pintrk) {
    w.pintrk('track', 'lead', {
      lead_type: params.contentCategory || 'content_creation',
      ...(params.eventId && { event_id: params.eventId }),
    });
  }
};

/**
 * Track a completed purchase with event ID for dedup between client-side
 * pixels and server-side Conversion APIs.
 */
export const trackPurchase = (params: {
  value: number;
  currency: string;
  eventId: string;
  // Stripe session id (or unique transaction id). Pinterest uses
  // order_id to dedup Tag and CAPI checkouts; without it Pinterest's
  // Event Quality flags Order ID coverage at 0%.
  orderId?: string;
  productType: 'subscription' | 'credits';
  planName?: string;
  creditAmount?: number;
}) => {
  const w = window as WindowWithPixels;
  const contentName =
    params.productType === 'subscription'
      ? `${params.planName} Subscription`
      : `${params.creditAmount} Credits`;

  // Facebook: 4th argument is the options object with eventID for dedup
  if (w.fbq) {
    w.fbq(
      'track',
      'Purchase',
      {
        value: params.value / 100,
        currency: params.currency,
        content_type: 'product',
        content_name: contentName,
        ...(params.orderId && { order_id: params.orderId }),
      },
      { eventID: params.eventId },
    );
  }

  // Pinterest: event_id inside the params object for dedup
  if (w.pintrk) {
    w.pintrk('track', 'checkout', {
      value: params.value / 100,
      currency: params.currency,
      order_quantity: 1,
      event_id: params.eventId,
      ...(params.orderId && { order_id: params.orderId }),
    });
  }
};

/**
 * Track when a user starts a subscription trial
 */
export const trackStartTrial = (params: {
  planName: string;
  value: number;
  currency: string;
}) => {
  trackFacebookEvent('StartTrial', {
    value: params.value / 100,
    currency: params.currency,
    content_name: `${params.planName} Trial`,
    predicted_ltv: params.value / 100,
  });

  // Pinterest doesn't have a direct trial event, use lead
  trackPinterestEvent('lead', {
    lead_type: 'trial_started',
  });
};

/**
 * Track when a user subscribes
 *
 * Pass `eventId` so Meta deduplicates this client-side fire against the
 * matching server-side CAPI fire from the Stripe webhook (it uses
 * `sub_${stripeSessionId}`).
 */
export const trackSubscribe = (params: {
  planName: string;
  value: number;
  currency: string;
  eventId?: string;
}) => {
  const w = window as WindowWithPixels;
  if (w.fbq) {
    w.fbq(
      'track',
      'Subscribe',
      {
        value: params.value / 100,
        currency: params.currency,
        content_name: `${params.planName} Subscription`,
        predicted_ltv: (params.value / 100) * 12, // Estimated annual value
      },
      ...(params.eventId ? [{ eventID: params.eventId }] : []),
    );
  }
};

/**
 * Track when a user keeps the output of a coloring page — downloaded
 * a PDF, printed it, or saved an in-app coloring. This is the
 * canonical paid-ad lead signal: "user got value", not "user clicked
 * something." Internal PostHog events stay granular
 * (download_pdf_clicked, print_clicked, etc.) for product analytics —
 * this fires *in addition* to those, mapping all three actions to a
 * single Meta `Lead` and Pinterest `lead` so the ad platforms have
 * one event with enough volume to optimize against.
 *
 * Pass `eventId` so the matching server-side CAPI fire from
 * `recordResourceSaved` deduplicates against this browser fire. Reuse
 * the same eventId (e.g. `${method}_${coloringImageId}_${timestamp}`)
 * across both fires.
 */
export const trackResourceSaved = (params: {
  method: 'download' | 'print' | 'save';
  surface:
    | 'start_hero'
    | 'coloring_page'
    | 'tool'
    | 'app_canvas'
    | 'gallery'
    | 'other';
  contentType?: 'pdf' | 'image' | 'coloring_page';
  contentName?: string;
  eventId?: string;
}) => {
  const w = window as WindowWithPixels;
  const fbParams = {
    content_name: params.contentName ?? 'Coloring Page',
    content_category: 'resource_saved',
    method: params.method,
    surface: params.surface,
    ...(params.contentType && { content_type: params.contentType }),
  };
  if (w.fbq) {
    w.fbq(
      'track',
      'Lead',
      fbParams,
      ...(params.eventId ? [{ eventID: params.eventId }] : []),
    );
  }
  if (w.pintrk) {
    w.pintrk('track', 'lead', {
      lead_type: 'resource_saved',
      ...(params.eventId && { event_id: params.eventId }),
    });
  }
};

/**
 * Track a search action
 */
export const trackSearch = (params: { searchQuery: string }) => {
  trackFacebookEvent('Search', {
    search_string: params.searchQuery,
  });

  trackPinterestEvent('search', {
    search_query: params.searchQuery,
  });
};

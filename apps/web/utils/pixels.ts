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
 */
export const trackSignUp = (params?: { method?: string }) => {
  trackFacebookEvent('CompleteRegistration', {
    content_name: 'User Signup',
    status: true,
    ...params,
  });
  trackPinterestEvent('signup');
};

/**
 * Track when a user initiates checkout
 */
export const trackInitiateCheckout = (params: {
  value: number;
  currency: string;
  productType: 'subscription' | 'credits';
  planName?: string;
  creditAmount?: number;
}) => {
  trackFacebookEvent('InitiateCheckout', {
    value: params.value / 100, // Convert from pence to pounds/dollars
    currency: params.currency,
    content_type: 'product',
    content_name:
      params.productType === 'subscription'
        ? `${params.planName} Subscription`
        : `${params.creditAmount} Credits`,
  });

  trackPinterestEvent('checkout', {
    value: params.value / 100,
    currency: params.currency,
    order_quantity: 1,
  });
};

/**
 * Track when a user views important content (pricing, product pages)
 */
export const trackViewContent = (params: {
  contentType: 'pricing' | 'coloring_page' | 'gallery';
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
  });
};

/**
 * Track when a user generates a lead action (e.g., creating content, starting trial)
 */
export const trackLead = (params: {
  contentName: string;
  contentCategory?: string;
  value?: number;
  currency?: string;
}) => {
  trackFacebookEvent('Lead', {
    content_name: params.contentName,
    content_category: params.contentCategory,
    value: params.value,
    currency: params.currency,
  });

  trackPinterestEvent('lead', {
    lead_type: params.contentCategory || 'content_creation',
  });
};

/**
 * Track when a user adds an item to cart (pre-checkout interest)
 */
export const trackAddToCart = (params: {
  productType: 'subscription' | 'credits';
  planName?: string;
  creditAmount?: number;
  value: number;
  currency: string;
}) => {
  const contentName =
    params.productType === 'subscription'
      ? `${params.planName} Subscription`
      : `${params.creditAmount} Credits`;

  trackFacebookEvent('AddToCart', {
    content_type: 'product',
    content_name: contentName,
    value: params.value / 100,
    currency: params.currency,
  });

  trackPinterestEvent('addtocart', {
    value: params.value / 100,
    currency: params.currency,
    order_quantity: 1,
    product_name: contentName,
  });
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
 */
export const trackSubscribe = (params: {
  planName: string;
  value: number;
  currency: string;
}) => {
  trackFacebookEvent('Subscribe', {
    value: params.value / 100,
    currency: params.currency,
    content_name: `${params.planName} Subscription`,
    predicted_ltv: (params.value / 100) * 12, // Estimated annual value
  });

  // Pinterest uses checkout for subscriptions
  trackPinterestEvent('checkout', {
    value: params.value / 100,
    currency: params.currency,
    order_quantity: 1,
  });
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

import { PlanName, BillingPeriod } from '@chunky-crayon/db/types';
import { TRACKING_EVENTS } from '@/constants';

export type TrackingEvent =
  (typeof TRACKING_EVENTS)[keyof typeof TRACKING_EVENTS];

export type SignInMethod = 'google' | 'apple' | 'magic_link';

/**
 * Type-safe event properties for each tracking event.
 * This ensures consistency across client and server tracking.
 */
export type EventProperties = {
  // ===== AUTHENTICATION =====
  [TRACKING_EVENTS.AUTH_SIGN_IN_STARTED]: {
    method: SignInMethod;
    location: string; // 'header' | 'hero' | 'modal' etc.
  };
  [TRACKING_EVENTS.AUTH_SIGN_IN_COMPLETED]: {
    method: SignInMethod;
    isNewUser: boolean;
  };
  [TRACKING_EVENTS.AUTH_SIGN_IN_FAILED]: {
    method: SignInMethod;
    errorMessage?: string;
  };
  [TRACKING_EVENTS.AUTH_SIGN_UP_COMPLETED]: {
    method: SignInMethod;
  };
  [TRACKING_EVENTS.AUTH_SIGN_OUT]: Record<string, never>;

  // ===== COLORING PAGE CREATION =====
  [TRACKING_EVENTS.CREATION_STARTED]: {
    inputLength: number;
  };
  [TRACKING_EVENTS.CREATION_SUBMITTED]: {
    description: string;
    inputType: 'text' | 'voice';
    characterCount: number;
  };
  [TRACKING_EVENTS.CREATION_COMPLETED]: {
    coloringImageId: string;
    description: string;
    durationMs: number;
    creditsUsed: number;
  };
  [TRACKING_EVENTS.CREATION_FAILED]: {
    description: string;
    errorMessage: string;
    attemptNumber: number;
  };
  [TRACKING_EVENTS.CREATION_RETRIED]: {
    description: string;
    attemptNumber: number;
  };

  // ===== COLORING PAGE ENGAGEMENT =====
  [TRACKING_EVENTS.PAGE_VIEWED]: {
    coloringImageId: string;
    source: 'gallery' | 'creation' | 'share_link' | 'direct';
  };
  [TRACKING_EVENTS.PAGE_COLORED]: {
    coloringImageId: string;
    sessionDurationMs: number;
  };
  [TRACKING_EVENTS.PAGE_COLOR_SELECTED]: {
    coloringImageId?: string; // Optional when color palette is used outside image context
    color: string;
    colorIndex?: number;
  };
  [TRACKING_EVENTS.PAGE_STROKE_MADE]: {
    coloringImageId?: string;
    color: string;
    strokeCount?: number;
  };
  [TRACKING_EVENTS.PAGE_SAVED]: {
    coloringImageId: string;
  };
  [TRACKING_EVENTS.PAGE_SHARED]: {
    coloringImageId: string;
    shareMethod: 'link' | 'social';
  };

  // ===== DOWNLOAD & PRINT =====
  [TRACKING_EVENTS.DOWNLOAD_PDF_CLICKED]: {
    coloringImageId: string;
    title?: string;
    hasColoring?: boolean; // Was the page colored before download?
  };
  [TRACKING_EVENTS.DOWNLOAD_PDF_COMPLETED]: {
    coloringImageId: string;
    fileSizeKb: number;
  };
  [TRACKING_EVENTS.PRINT_CLICKED]: {
    coloringImageId?: string;
    hasColoring?: boolean;
  };

  // ===== EMAIL SIGNUP =====
  [TRACKING_EVENTS.EMAIL_SIGNUP_STARTED]: {
    location: string;
  };
  [TRACKING_EVENTS.EMAIL_SIGNUP_COMPLETED]: {
    location: string;
  };
  [TRACKING_EVENTS.EMAIL_SIGNUP_FAILED]: {
    location: string;
    errorMessage: string;
  };

  // ===== PRICING =====
  [TRACKING_EVENTS.PRICING_PAGE_VIEWED]: {
    referrer?: string;
  };
  [TRACKING_EVENTS.PRICING_INTERVAL_TOGGLED]: {
    fromInterval: 'monthly' | 'annual';
    toInterval: 'monthly' | 'annual';
  };
  [TRACKING_EVENTS.PRICING_PLAN_CLICKED]: {
    planName: PlanName;
    planInterval: BillingPeriod;
    price: string;
  };
  [TRACKING_EVENTS.PRICING_CREDITS_CLICKED]: {
    creditAmount: number;
    price: string;
  };

  // ===== CHECKOUT =====
  [TRACKING_EVENTS.CHECKOUT_STARTED]: {
    productType: 'subscription' | 'credits';
    planName?: PlanName;
    creditAmount?: number;
    value: number; // Price in pence
    currency: string;
  };
  [TRACKING_EVENTS.CHECKOUT_COMPLETED]: {
    productType: 'subscription' | 'credits';
    planName?: PlanName;
    creditAmount?: number;
    value: number;
    currency: string;
    transactionId: string;
  };
  [TRACKING_EVENTS.CHECKOUT_ABANDONED]: {
    productType: 'subscription' | 'credits';
    planName?: PlanName;
  };

  // ===== SUBSCRIPTION =====
  [TRACKING_EVENTS.SUBSCRIPTION_STARTED]: {
    planName: PlanName;
    planInterval: BillingPeriod;
    value: number;
  };
  [TRACKING_EVENTS.SUBSCRIPTION_RENEWED]: {
    planName: PlanName;
    planInterval: BillingPeriod;
    renewalCount: number;
  };
  [TRACKING_EVENTS.SUBSCRIPTION_CHANGED]: {
    fromPlan: PlanName;
    toPlan: PlanName;
    changeType: 'upgrade' | 'downgrade';
  };
  [TRACKING_EVENTS.SUBSCRIPTION_CANCELLED]: {
    planName: PlanName;
    reason?: string;
    subscriptionAgeMonths: number;
  };
  [TRACKING_EVENTS.SUBSCRIPTION_PORTAL_OPENED]: Record<string, never>;

  // ===== CREDITS =====
  [TRACKING_EVENTS.CREDITS_PURCHASED]: {
    creditAmount: number;
    value: number;
  };
  [TRACKING_EVENTS.CREDITS_USED]: {
    creditAmount: number;
    action: 'creation' | 'other';
    remainingCredits: number;
  };
  [TRACKING_EVENTS.CREDITS_LOW]: {
    remainingCredits: number;
    threshold: number;
  };

  // ===== BILLING & ACCOUNT =====
  [TRACKING_EVENTS.BILLING_PAGE_VIEWED]: Record<string, never>;
  [TRACKING_EVENTS.ACCOUNT_SETTINGS_VIEWED]: Record<string, never>;

  // ===== MARKETING =====
  [TRACKING_EVENTS.CTA_CLICKED]: {
    ctaName: string;
    location: string;
    destination?: string;
  };
  [TRACKING_EVENTS.FEATURE_DISCOVERED]: {
    featureName: string;
    location: string;
  };
  [TRACKING_EVENTS.REFERRAL_SHARED]: {
    shareMethod: string;
  };
  [TRACKING_EVENTS.SOCIAL_LINK_CLICKED]: {
    platform:
      | 'instagram'
      | 'facebook'
      | 'tiktok'
      | 'pinterest'
      | 'x'
      | 'threads';
  };

  // ===== ERRORS =====
  [TRACKING_EVENTS.ERROR_OCCURRED]: {
    errorType: string;
    errorMessage: string;
    page?: string;
  };
  [TRACKING_EVENTS.ERROR_API]: {
    endpoint: string;
    statusCode?: number;
    errorMessage: string;
  };
  [TRACKING_EVENTS.ERROR_GENERATION]: {
    description: string;
    errorMessage: string;
  };
  [TRACKING_EVENTS.ERROR_PAYMENT]: {
    productType: 'subscription' | 'credits';
    errorMessage: string;
  };
};

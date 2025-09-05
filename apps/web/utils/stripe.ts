import {
  PlanName,
  SubscriptionStatus,
  BillingPeriod,
} from '@chunky-crayon/db/types';

type PriceMapping = {
  planName: PlanName;
  billingPeriod: BillingPeriod;
};

export const mapStripeStatusToSubscriptionStatus = (
  stripeStatus: string,
): SubscriptionStatus => {
  switch (stripeStatus) {
    case 'active':
      return SubscriptionStatus.ACTIVE;
    case 'canceled':
      return SubscriptionStatus.CANCELLED;
    case 'incomplete':
      return SubscriptionStatus.INCOMPLETE;
    case 'past_due':
      return SubscriptionStatus.PAST_DUE;
    case 'unpaid':
      return SubscriptionStatus.UNPAID;
    case 'trialing':
      return SubscriptionStatus.TRIALING;
    default:
      return SubscriptionStatus.INCOMPLETE;
  }
};

export const mapStripePriceToPlanName = (priceId: string): PriceMapping => {
  switch (priceId) {
    case process.env.NEXT_PUBLIC_STRIPE_PRICE_CRAYON_MONTHLY:
      return {
        planName: PlanName.CRAYON,
        billingPeriod: BillingPeriod.MONTHLY,
      };
    case process.env.NEXT_PUBLIC_STRIPE_PRICE_CRAYON_ANNUAL:
      return { planName: PlanName.CRAYON, billingPeriod: BillingPeriod.ANNUAL };
    case process.env.NEXT_PUBLIC_STRIPE_PRICE_RAINBOW_MONTHLY:
      return {
        planName: PlanName.RAINBOW,
        billingPeriod: BillingPeriod.MONTHLY,
      };
    case process.env.NEXT_PUBLIC_STRIPE_PRICE_RAINBOW_ANNUAL:
      return {
        planName: PlanName.RAINBOW,
        billingPeriod: BillingPeriod.ANNUAL,
      };
    case process.env.NEXT_PUBLIC_STRIPE_PRICE_MASTERPIECE_MONTHLY:
      return {
        planName: PlanName.MASTERPIECE,
        billingPeriod: BillingPeriod.MONTHLY,
      };
    case process.env.NEXT_PUBLIC_STRIPE_PRICE_MASTERPIECE_ANNUAL:
      return {
        planName: PlanName.MASTERPIECE,
        billingPeriod: BillingPeriod.ANNUAL,
      };
    case process.env.NEXT_PUBLIC_STRIPE_PRICE_STUDIO_MONTHLY:
      return {
        planName: PlanName.STUDIO,
        billingPeriod: BillingPeriod.MONTHLY,
      };
    case process.env.NEXT_PUBLIC_STRIPE_PRICE_STUDIO_ANNUAL:
      return { planName: PlanName.STUDIO, billingPeriod: BillingPeriod.ANNUAL };
    default:
      throw new Error(`Unknown price ID: ${priceId}`);
  }
};

export const getCreditAmountFromPriceId = (priceId?: string): number | null => {
  if (!priceId) return null;

  switch (priceId) {
    case process.env.NEXT_PUBLIC_STRIPE_PRICE_CREDITS_1000:
      return 1000;
    case process.env.NEXT_PUBLIC_STRIPE_PRICE_CREDITS_500:
      return 500;
    case process.env.NEXT_PUBLIC_STRIPE_PRICE_CREDITS_100:
      return 100;
    default:
      return null;
  }
};

export const getCreditAmountFromPlanName = (planName: PlanName): number => {
  switch (planName) {
    case PlanName.CRAYON:
      return 250;
    case PlanName.RAINBOW:
      return 500;
    case PlanName.MASTERPIECE:
      return 1000;
    case PlanName.STUDIO:
      return 5000;
    default:
      throw new Error(`Unknown plan name: ${planName}`);
  }
};

export const calculateProratedCredits = (
  currentPlanCredits: number,
  newPlanCredits: number,
  daysRemainingInPeriod: number,
  totalDaysInPeriod: number,
  isUpgrade: boolean,
): number => {
  if (!isUpgrade) {
    return 0;
  }

  const creditDifference = newPlanCredits - currentPlanCredits;
  return Math.floor(
    (creditDifference * daysRemainingInPeriod) / totalDaysInPeriod,
  );
};

export const getDaysInPeriod = (billingPeriod: 'monthly' | 'annual'): number =>
  billingPeriod === 'monthly' ? 30 : 365;

export const calculateDaysRemaining = (currentPeriodEnd: Date): number => {
  const now = new Date();
  const diffTime = currentPeriodEnd.getTime() - now.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';
import { db } from '@chunky-crayon/db';
import {
  SubscriptionStatus,
  SubscriptionPlatform,
  SubscriptionEventType,
  CreditTransactionType,
  PlanName,
  BillingPeriod,
} from '@chunky-crayon/db';
import {
  PLAN_CREDITS_MONTHLY,
  PLAN_ROLLOVER_CAPS,
  TRACKING_EVENTS,
} from '@/constants';
import { trackWithUser } from '@/utils/analytics-server';

// RevenueCat webhook event types
type RevenueCatEventType =
  | 'INITIAL_PURCHASE'
  | 'RENEWAL'
  | 'CANCELLATION'
  | 'UNCANCELLATION'
  | 'BILLING_ISSUE'
  | 'PRODUCT_CHANGE'
  | 'EXPIRATION'
  | 'SUBSCRIBER_ALIAS'
  | 'TRANSFER'
  | 'NON_RENEWING_PURCHASE' // Credit packs (consumables)
  | 'TEST';

// RevenueCat webhook payload structure
interface RevenueCatWebhookEvent {
  api_version: string;
  event: {
    id: string;
    type: RevenueCatEventType;
    app_user_id: string;
    original_app_user_id?: string;
    aliases?: string[];
    product_id: string;
    entitlement_ids?: string[];
    period_type: 'NORMAL' | 'TRIAL' | 'INTRO';
    purchased_at_ms: number;
    expiration_at_ms?: number;
    environment: 'SANDBOX' | 'PRODUCTION';
    store: 'APP_STORE' | 'PLAY_STORE' | 'AMAZON' | 'STRIPE' | 'PROMOTIONAL';
    is_trial_conversion?: boolean;
    cancel_reason?:
      | 'UNSUBSCRIBE'
      | 'BILLING_ERROR'
      | 'DEVELOPER_INITIATED'
      | 'PRICE_INCREASE'
      | 'CUSTOMER_SUPPORT'
      | 'UNKNOWN';
    // For TRANSFER events
    transferred_from?: string[];
    transferred_to?: string[];
    // Price info
    price?: number;
    currency?: string;
    price_in_purchased_currency?: number;
  };
}

// Map RevenueCat product ID to our plan name
const mapProductIdToPlan = (
  productId: string,
): { planName: PlanName; billingPeriod: BillingPeriod } => {
  const productLower = productId.toLowerCase();

  // Pattern: {plan}_sub_{period}_v1
  if (productLower.includes('splash')) {
    return {
      planName: PlanName.SPLASH,
      billingPeriod:
        productLower.includes('yearly') || productLower.includes('annual')
          ? BillingPeriod.ANNUAL
          : BillingPeriod.MONTHLY,
    };
  }

  if (productLower.includes('rainbow')) {
    return {
      planName: PlanName.RAINBOW,
      billingPeriod:
        productLower.includes('yearly') || productLower.includes('annual')
          ? BillingPeriod.ANNUAL
          : BillingPeriod.MONTHLY,
    };
  }

  if (productLower.includes('sparkle')) {
    return {
      planName: PlanName.SPARKLE,
      billingPeriod:
        productLower.includes('yearly') || productLower.includes('annual')
          ? BillingPeriod.ANNUAL
          : BillingPeriod.MONTHLY,
    };
  }

  // Default to Rainbow Monthly if unknown
  console.warn(
    `Unknown product ID: ${productId}, defaulting to RAINBOW MONTHLY`,
  );
  return { planName: PlanName.RAINBOW, billingPeriod: BillingPeriod.MONTHLY };
};

// Map credit pack product ID to credit amount
const mapCreditPackToAmount = (productId: string): number | null => {
  const productLower = productId.toLowerCase();

  // Pattern: credits_{amount}_v1
  if (productLower === 'credits_100_v1') return 100;
  if (productLower === 'credits_500_v1') return 500;
  if (productLower === 'credits_1000_v1') return 1000;

  // Not a credit pack
  return null;
};

// Map RevenueCat event type to our subscription event type
const mapEventType = (
  rcEventType: RevenueCatEventType,
): SubscriptionEventType => {
  switch (rcEventType) {
    case 'INITIAL_PURCHASE':
      return SubscriptionEventType.SUBSCRIPTION_STARTED;
    case 'RENEWAL':
      return SubscriptionEventType.RENEWAL_SUCCESS;
    case 'CANCELLATION':
      return SubscriptionEventType.CANCELLATION_SCHEDULED;
    case 'UNCANCELLATION':
      return SubscriptionEventType.REACTIVATED;
    case 'BILLING_ISSUE':
      return SubscriptionEventType.BILLING_ISSUE_DETECTED;
    case 'PRODUCT_CHANGE':
      return SubscriptionEventType.PLAN_UPGRADED; // Will be refined based on actual change
    case 'EXPIRATION':
      return SubscriptionEventType.EXPIRED;
    case 'TRANSFER':
      return SubscriptionEventType.TRANSFERRED;
    default:
      return SubscriptionEventType.SUBSCRIPTION_STARTED;
  }
};

// Get credit amount for a plan (monthly amount - same for monthly and annual billing)
const getCreditAmountForPlan = (planName: PlanName): number => {
  return PLAN_CREDITS_MONTHLY[planName] || 0;
};

// Check if webhook event has already been processed (idempotency)
const isEventProcessed = async (eventId: string): Promise<boolean> => {
  const existing = await db.webhookEvent.findUnique({
    where: { id: eventId },
  });
  return !!existing;
};

// Mark webhook event as processed
const markEventProcessed = async (
  eventId: string,
  eventType: string,
): Promise<void> => {
  await db.webhookEvent.create({
    data: {
      id: eventId,
      platform: SubscriptionPlatform.REVENUECAT,
      eventType,
    },
  });
};

// Verify the webhook authorization
const verifyWebhookAuth = async (): Promise<boolean> => {
  const headersList = await headers();
  const authHeader = headersList.get('authorization');
  const expectedAuth = process.env.REVENUECAT_WEBHOOK_AUTH_KEY;

  if (!expectedAuth) {
    console.warn(
      'REVENUECAT_WEBHOOK_AUTH_KEY not set, skipping auth verification',
    );
    return true; // Allow in development
  }

  return authHeader === expectedAuth || authHeader === `Bearer ${expectedAuth}`;
};

export const POST = async (req: Request) => {
  // Verify webhook authorization
  if (!(await verifyWebhookAuth())) {
    console.error('RevenueCat webhook auth verification failed');
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let payload: RevenueCatWebhookEvent;

  try {
    payload = (await req.json()) as RevenueCatWebhookEvent;
  } catch (error) {
    console.error('Error parsing RevenueCat webhook payload:', error);
    return Response.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { event } = payload;

  // Skip test events
  if (event.type === 'TEST') {
    console.log('Received RevenueCat test event');
    return Response.json({ received: true, test: true }, { status: 200 });
  }

  // Idempotency check
  if (await isEventProcessed(event.id)) {
    console.log(
      `RevenueCat webhook event ${event.id} already processed, skipping`,
    );
    return Response.json({ received: true, skipped: true }, { status: 200 });
  }

  console.log(
    `Processing RevenueCat event: ${event.type} for user ${event.app_user_id}`,
  );

  // Find user by app_user_id (which should be our userId or revenuecatUserId)
  let user = await db.user.findFirst({
    where: {
      OR: [{ id: event.app_user_id }, { revenuecatUserId: event.app_user_id }],
    },
    include: { subscriptions: true },
  });

  // Handle different event types
  try {
    switch (event.type) {
      case 'INITIAL_PURCHASE': {
        const { planName, billingPeriod } = mapProductIdToPlan(
          event.product_id,
        );
        const creditAmount = getCreditAmountForPlan(planName);
        const isTrialing = event.period_type === 'TRIAL';

        if (!user) {
          // Create user from RevenueCat subscriber (shouldn't happen normally)
          user = await db.user.create({
            data: {
              id: event.app_user_id, // Use RC user ID as our user ID
              revenuecatUserId: event.app_user_id,
              credits: 15, // Default free credits
            },
            include: { subscriptions: true },
          });
          console.log(`Created new user ${user.id} from RevenueCat event`);
        } else if (!user.revenuecatUserId) {
          // Link user to RevenueCat
          await db.user.update({
            where: { id: user.id },
            data: { revenuecatUserId: event.app_user_id },
          });
        }

        // Check if user already has an active subscription
        const hasActiveSubscription = user.subscriptions.some(
          (sub) =>
            sub.status === SubscriptionStatus.ACTIVE ||
            sub.status === SubscriptionStatus.TRIALING,
        );

        if (hasActiveSubscription) {
          console.log(
            `User ${user.id} already has active subscription, skipping INITIAL_PURCHASE`,
          );
          await markEventProcessed(event.id, event.type);
          return Response.json(
            { received: true, message: 'User already has active subscription' },
            { status: 200 },
          );
        }

        // Create subscription and add credits
        await db.$transaction([
          db.subscription.create({
            data: {
              userId: user.id,
              platform: SubscriptionPlatform.REVENUECAT,
              externalId: event.id, // Use event ID as external ID for initial purchase
              planName,
              billingPeriod,
              status: isTrialing
                ? SubscriptionStatus.TRIALING
                : SubscriptionStatus.ACTIVE,
              currentPeriodStart: new Date(event.purchased_at_ms),
              currentPeriodEnd: event.expiration_at_ms
                ? new Date(event.expiration_at_ms)
                : new Date(event.purchased_at_ms + 30 * 24 * 60 * 60 * 1000), // Default 30 days
              trialStart: isTrialing ? new Date(event.purchased_at_ms) : null,
              trialEnd:
                isTrialing && event.expiration_at_ms
                  ? new Date(event.expiration_at_ms)
                  : null,
              storeProductId: event.product_id,
              metadata: {
                store: event.store,
                environment: event.environment,
                originalEventId: event.id,
              },
            },
          }),
          // Only add credits if not trialing
          ...(isTrialing
            ? []
            : [
                db.creditTransaction.create({
                  data: {
                    userId: user.id,
                    amount: creditAmount,
                    type: CreditTransactionType.PURCHASE,
                    reference: `rc:${event.id}`,
                  },
                }),
                db.user.update({
                  where: { id: user.id },
                  data: { credits: { increment: creditAmount } },
                }),
              ]),
        ]);

        // Track event
        await trackWithUser(
          user.id,
          isTrialing
            ? TRACKING_EVENTS.SUBSCRIPTION_STARTED
            : TRACKING_EVENTS.SUBSCRIPTION_STARTED,
          {
            planName,
            planInterval: billingPeriod,
            value: event.price_in_purchased_currency || 0,
          },
        );

        console.log(
          `Created subscription for user ${user.id}: ${planName} ${billingPeriod}${isTrialing ? ' (trial)' : ''}`,
        );
        break;
      }

      case 'RENEWAL': {
        if (!user) {
          console.error(
            `No user found for RENEWAL event: ${event.app_user_id}`,
          );
          break;
        }

        // Find the active subscription for this user from RevenueCat
        const subscription = user.subscriptions.find(
          (sub) =>
            sub.platform === SubscriptionPlatform.REVENUECAT &&
            (sub.status === SubscriptionStatus.ACTIVE ||
              sub.status === SubscriptionStatus.TRIALING),
        );

        if (!subscription) {
          console.error(
            `No active RevenueCat subscription found for user ${user.id}`,
          );
          break;
        }

        const creditAmount = getCreditAmountForPlan(subscription.planName);
        const rolloverCap = PLAN_ROLLOVER_CAPS[subscription.planName] || 0;

        // Calculate new balance with rollover cap
        let effectiveCurrentCredits = user.credits;
        if (rolloverCap > 0) {
          effectiveCurrentCredits = Math.min(user.credits, rolloverCap);
        } else {
          effectiveCurrentCredits = 0; // No rollover
        }
        const newBalance = effectiveCurrentCredits + creditAmount;

        // Handle trial conversion
        const wasTrialing = subscription.status === SubscriptionStatus.TRIALING;

        await db.$transaction([
          db.subscription.update({
            where: { id: subscription.id },
            data: {
              status: SubscriptionStatus.ACTIVE,
              currentPeriodStart: new Date(event.purchased_at_ms),
              currentPeriodEnd: event.expiration_at_ms
                ? new Date(event.expiration_at_ms)
                : new Date(event.purchased_at_ms + 30 * 24 * 60 * 60 * 1000),
            },
          }),
          db.creditTransaction.create({
            data: {
              userId: user.id,
              amount: creditAmount,
              type: CreditTransactionType.PURCHASE,
              reference: `rc:renewal:${event.id}`,
            },
          }),
          db.user.update({
            where: { id: user.id },
            data: { credits: newBalance },
          }),
          db.subscriptionEvent.create({
            data: {
              subscriptionId: subscription.id,
              eventType: wasTrialing
                ? SubscriptionEventType.SUBSCRIPTION_STARTED
                : SubscriptionEventType.RENEWAL_SUCCESS,
              platform: SubscriptionPlatform.REVENUECAT,
              externalEventId: event.id,
              previousStatus: subscription.status,
              newStatus: SubscriptionStatus.ACTIVE,
              creditsAdded: creditAmount,
              rawPayload: payload as object,
            },
          }),
        ]);

        await trackWithUser(user.id, TRACKING_EVENTS.SUBSCRIPTION_RENEWED, {
          planName: subscription.planName,
          planInterval: subscription.billingPeriod,
          renewalCount: 1, // TODO: track actual renewal count
        });

        console.log(
          `Renewed subscription for user ${user.id}, added ${creditAmount} credits (balance: ${newBalance})`,
        );
        break;
      }

      case 'CANCELLATION': {
        if (!user) {
          console.error(
            `No user found for CANCELLATION event: ${event.app_user_id}`,
          );
          break;
        }

        const subscription = user.subscriptions.find(
          (sub) =>
            sub.platform === SubscriptionPlatform.REVENUECAT &&
            sub.status === SubscriptionStatus.ACTIVE,
        );

        if (!subscription) {
          console.error(
            `No active RevenueCat subscription found for user ${user.id}`,
          );
          break;
        }

        await db.$transaction([
          db.subscription.update({
            where: { id: subscription.id },
            data: {
              status: SubscriptionStatus.CANCELLED,
              cancelledAt: new Date(),
            },
          }),
          db.subscriptionEvent.create({
            data: {
              subscriptionId: subscription.id,
              eventType: SubscriptionEventType.CANCELLATION_SCHEDULED,
              platform: SubscriptionPlatform.REVENUECAT,
              externalEventId: event.id,
              previousStatus: subscription.status,
              newStatus: SubscriptionStatus.CANCELLED,
              rawPayload: payload as object,
            },
          }),
        ]);

        // Calculate subscription age for tracking
        const subscriptionAgeMs = Date.now() - subscription.createdAt.getTime();
        const subscriptionAgeMonths = Math.floor(
          subscriptionAgeMs / (1000 * 60 * 60 * 24 * 30),
        );

        await trackWithUser(user.id, TRACKING_EVENTS.SUBSCRIPTION_CANCELLED, {
          planName: subscription.planName,
          reason: event.cancel_reason,
          subscriptionAgeMonths,
        });

        console.log(
          `Cancelled subscription for user ${user.id}: ${event.cancel_reason || 'no reason'}`,
        );
        break;
      }

      case 'UNCANCELLATION': {
        if (!user) {
          console.error(
            `No user found for UNCANCELLATION event: ${event.app_user_id}`,
          );
          break;
        }

        const subscription = user.subscriptions.find(
          (sub) =>
            sub.platform === SubscriptionPlatform.REVENUECAT &&
            sub.status === SubscriptionStatus.CANCELLED,
        );

        if (!subscription) {
          console.error(
            `No cancelled RevenueCat subscription found for user ${user.id}`,
          );
          break;
        }

        await db.$transaction([
          db.subscription.update({
            where: { id: subscription.id },
            data: {
              status: SubscriptionStatus.ACTIVE,
              cancelledAt: null,
            },
          }),
          db.subscriptionEvent.create({
            data: {
              subscriptionId: subscription.id,
              eventType: SubscriptionEventType.REACTIVATED,
              platform: SubscriptionPlatform.REVENUECAT,
              externalEventId: event.id,
              previousStatus: SubscriptionStatus.CANCELLED,
              newStatus: SubscriptionStatus.ACTIVE,
              rawPayload: payload as object,
            },
          }),
        ]);

        console.log(`Reactivated subscription for user ${user.id}`);
        break;
      }

      case 'BILLING_ISSUE': {
        if (!user) {
          console.error(
            `No user found for BILLING_ISSUE event: ${event.app_user_id}`,
          );
          break;
        }

        const subscription = user.subscriptions.find(
          (sub) =>
            sub.platform === SubscriptionPlatform.REVENUECAT &&
            sub.status === SubscriptionStatus.ACTIVE,
        );

        if (!subscription) {
          console.error(
            `No active RevenueCat subscription found for user ${user.id}`,
          );
          break;
        }

        // Set to PAST_DUE with grace period (typically 16 days for App Store)
        const gracePeriodEnd = new Date();
        gracePeriodEnd.setDate(gracePeriodEnd.getDate() + 16);

        await db.$transaction([
          db.subscription.update({
            where: { id: subscription.id },
            data: {
              status: SubscriptionStatus.PAST_DUE,
              gracePeriodEnd,
            },
          }),
          db.subscriptionEvent.create({
            data: {
              subscriptionId: subscription.id,
              eventType: SubscriptionEventType.BILLING_ISSUE_DETECTED,
              platform: SubscriptionPlatform.REVENUECAT,
              externalEventId: event.id,
              previousStatus: subscription.status,
              newStatus: SubscriptionStatus.PAST_DUE,
              rawPayload: payload as object,
            },
          }),
        ]);

        // TODO: Send billing issue email
        console.log(`Billing issue detected for user ${user.id}`);
        break;
      }

      case 'EXPIRATION': {
        if (!user) {
          console.error(
            `No user found for EXPIRATION event: ${event.app_user_id}`,
          );
          break;
        }

        const subscription = user.subscriptions.find(
          (sub) => sub.platform === SubscriptionPlatform.REVENUECAT,
        );

        if (!subscription) {
          console.error(`No RevenueCat subscription found for user ${user.id}`);
          break;
        }

        await db.$transaction([
          db.subscription.update({
            where: { id: subscription.id },
            data: {
              status: SubscriptionStatus.EXPIRED,
            },
          }),
          db.subscriptionEvent.create({
            data: {
              subscriptionId: subscription.id,
              eventType: SubscriptionEventType.EXPIRED,
              platform: SubscriptionPlatform.REVENUECAT,
              externalEventId: event.id,
              previousStatus: subscription.status,
              newStatus: SubscriptionStatus.EXPIRED,
              rawPayload: payload as object,
            },
          }),
        ]);

        console.log(`Subscription expired for user ${user.id}`);
        break;
      }

      case 'PRODUCT_CHANGE': {
        if (!user) {
          console.error(
            `No user found for PRODUCT_CHANGE event: ${event.app_user_id}`,
          );
          break;
        }

        const subscription = user.subscriptions.find(
          (sub) =>
            sub.platform === SubscriptionPlatform.REVENUECAT &&
            sub.status === SubscriptionStatus.ACTIVE,
        );

        if (!subscription) {
          console.error(
            `No active RevenueCat subscription found for user ${user.id}`,
          );
          break;
        }

        const { planName: newPlanName, billingPeriod: newBillingPeriod } =
          mapProductIdToPlan(event.product_id);
        const previousPlan = subscription.planName;

        // Determine if upgrade or downgrade
        const previousCredits = getCreditAmountForPlan(previousPlan);
        const newCredits = getCreditAmountForPlan(newPlanName);
        const isUpgrade = newCredits > previousCredits;

        await db.$transaction([
          db.subscription.update({
            where: { id: subscription.id },
            data: {
              planName: newPlanName,
              billingPeriod: newBillingPeriod,
              storeProductId: event.product_id,
            },
          }),
          db.subscriptionEvent.create({
            data: {
              subscriptionId: subscription.id,
              eventType: isUpgrade
                ? SubscriptionEventType.PLAN_UPGRADED
                : SubscriptionEventType.PLAN_DOWNGRADED,
              platform: SubscriptionPlatform.REVENUECAT,
              externalEventId: event.id,
              previousPlan,
              newPlan: newPlanName,
              rawPayload: payload as object,
            },
          }),
        ]);

        await trackWithUser(user.id, TRACKING_EVENTS.SUBSCRIPTION_CHANGED, {
          fromPlan: previousPlan,
          toPlan: newPlanName,
          changeType: isUpgrade ? 'upgrade' : 'downgrade',
        });

        console.log(
          `Plan changed for user ${user.id}: ${previousPlan} -> ${newPlanName} (${isUpgrade ? 'upgrade' : 'downgrade'})`,
        );
        break;
      }

      case 'TRANSFER': {
        // Handle subscription transfer between users
        const { transferred_from, transferred_to } = event;
        console.log(
          `Subscription transfer: from ${transferred_from?.join(', ')} to ${transferred_to?.join(', ')}`,
        );

        // Find subscription by the "from" user and update to "to" user
        if (
          transferred_from &&
          transferred_from.length > 0 &&
          transferred_to &&
          transferred_to.length > 0
        ) {
          const fromUserId = transferred_from[0];
          const toUserId = transferred_to[0];

          const fromUser = await db.user.findFirst({
            where: {
              OR: [{ id: fromUserId }, { revenuecatUserId: fromUserId }],
            },
          });

          let toUser = await db.user.findFirst({
            where: {
              OR: [{ id: toUserId }, { revenuecatUserId: toUserId }],
            },
          });

          if (fromUser) {
            const subscription = await db.subscription.findFirst({
              where: {
                userId: fromUser.id,
                platform: SubscriptionPlatform.REVENUECAT,
              },
            });

            if (subscription) {
              // Create target user if doesn't exist
              if (!toUser) {
                toUser = await db.user.create({
                  data: {
                    id: toUserId,
                    revenuecatUserId: toUserId,
                    credits: 15,
                  },
                });
              }

              await db.$transaction([
                db.subscription.update({
                  where: { id: subscription.id },
                  data: { userId: toUser.id },
                }),
                db.subscriptionEvent.create({
                  data: {
                    subscriptionId: subscription.id,
                    eventType: SubscriptionEventType.TRANSFERRED,
                    platform: SubscriptionPlatform.REVENUECAT,
                    externalEventId: event.id,
                    rawPayload: payload as object,
                  },
                }),
              ]);

              console.log(
                `Transferred subscription from user ${fromUser.id} to ${toUser.id}`,
              );
            }
          }
        }
        break;
      }

      case 'NON_RENEWING_PURCHASE': {
        // Handle credit pack purchases (consumables)
        const creditAmount = mapCreditPackToAmount(event.product_id);

        if (!creditAmount) {
          console.log(
            `NON_RENEWING_PURCHASE for non-credit-pack product: ${event.product_id}`,
          );
          break;
        }

        if (!user) {
          console.error(
            `No user found for NON_RENEWING_PURCHASE event: ${event.app_user_id}`,
          );
          break;
        }

        // Verify user has an active subscription (credit packs are only for subscribers)
        const hasActiveSubscription = user.subscriptions.some(
          (sub) =>
            sub.status === SubscriptionStatus.ACTIVE ||
            sub.status === SubscriptionStatus.TRIALING,
        );

        if (!hasActiveSubscription) {
          console.warn(
            `User ${user.id} purchased credit pack without active subscription - allowing anyway`,
          );
          // We still process the purchase, just log a warning
        }

        // Add credits to user
        await db.$transaction([
          db.creditTransaction.create({
            data: {
              userId: user.id,
              amount: creditAmount,
              type: CreditTransactionType.PURCHASE,
              reference: `rc:credit-pack:${event.id}`,
            },
          }),
          db.user.update({
            where: { id: user.id },
            data: { credits: { increment: creditAmount } },
          }),
        ]);

        // Track the purchase
        await trackWithUser(user.id, TRACKING_EVENTS.CREDIT_PACK_PURCHASED, {
          creditAmount,
          productId: event.product_id,
          platform: 'revenuecat',
        });

        console.log(
          `Credit pack purchased by user ${user.id}: +${creditAmount} credits (product: ${event.product_id})`,
        );
        break;
      }

      default:
        console.log(`Unhandled RevenueCat event type: ${event.type}`);
    }
  } catch (error) {
    console.error(`Error processing RevenueCat event ${event.type}:`, error);
    return Response.json(
      { error: 'Internal server error', details: String(error) },
      { status: 500 },
    );
  }

  // Mark event as processed
  await markEventProcessed(event.id, event.type);

  // Revalidate relevant paths
  revalidatePath('/account/billing');
  revalidatePath('/pricing');

  return Response.json({ received: true }, { status: 200 });
};

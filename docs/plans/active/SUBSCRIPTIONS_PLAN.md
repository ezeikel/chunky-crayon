# Cross-Platform Subscriptions Plan

> **Status**: Active
> **Created**: 2025-01-07
> **Goal**: Unified subscription system across web (Stripe) and mobile (RevenueCat) with DB as source of truth

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              CLIENT APPLICATIONS                                 │
├─────────────────────────────────┬───────────────────────────────────────────────┤
│         WEB (Next.js)           │              MOBILE (React Native)            │
│  ┌───────────────────────────┐  │  ┌─────────────────────────────────────────┐  │
│  │  Stripe Checkout/Portal   │  │  │     RevenueCat SDK (Paywall UI)         │  │
│  │  - Subscription purchase  │  │  │     - In-app purchase                   │  │
│  │  - Manage billing         │  │  │     - Restore purchases                 │  │
│  └───────────┬───────────────┘  │  └──────────────────┬──────────────────────┘  │
│              │                  │                     │                         │
│  ┌───────────▼───────────────┐  │  ┌──────────────────▼──────────────────────┐  │
│  │   Check Entitlements      │  │  │      Check Entitlements                 │  │
│  │   GET /api/entitlements   │◄─┼──┤      GET /api/entitlements              │  │
│  └───────────────────────────┘  │  └─────────────────────────────────────────┘  │
└─────────────────────────────────┴───────────────────────────────────────────────┘
                                         │
                                         ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                                  BACKEND (API)                                   │
│  ┌─────────────────────────────────────────────────────────────────────────────┐│
│  │                         /api/entitlements                                    ││
│  │   - Validates session (web) or device token (mobile)                        ││
│  │   - Queries DB for subscription state                                       ││
│  │   - Returns { hasAccess, plan, credits, expiresAt, features }              ││
│  └─────────────────────────────────────────────────────────────────────────────┘│
│                                         │                                        │
│                                         ▼                                        │
│  ┌─────────────────────────────────────────────────────────────────────────────┐│
│  │                      DATABASE (Source of Truth)                              ││
│  │   - subscriptions table                                                     ││
│  │   - subscription_events (audit log)                                         ││
│  │   - users.credits                                                           ││
│  └─────────────────────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────────────────────┘
                        ▲                                    ▲
                        │                                    │
┌───────────────────────┴────────────┐    ┌──────────────────┴─────────────────────┐
│        STRIPE WEBHOOKS             │    │        REVENUECAT WEBHOOKS             │
│  POST /api/payment/webhook         │    │  POST /api/revenuecat/webhook          │
│                                    │    │                                        │
│  Events:                           │    │  Events:                               │
│  • checkout.session.completed      │    │  • INITIAL_PURCHASE                    │
│  • customer.subscription.updated   │    │  • RENEWAL                             │
│  • customer.subscription.deleted   │    │  • CANCELLATION                        │
│  • invoice.payment_succeeded       │    │  • BILLING_ISSUE                       │
│  • invoice.payment_failed          │    │  • PRODUCT_CHANGE                      │
│  • charge.refunded                 │    │  • EXPIRATION                          │
└────────────────────────────────────┘    │  • REFUND                              │
             ▲                            │  • TRANSFER                            │
             │                            └────────────────────────────────────────┘
             │                                         ▲
┌────────────┴────────────┐              ┌─────────────┴─────────────────────────────┐
│       STRIPE            │              │              REVENUECAT                   │
│  - Web subscriptions    │              │  - Mobile subscriptions                   │
│  - Credit packs         │              │  - App Store / Play Store                 │
│  - Customer portal      │              │  - Manages receipts & renewals            │
└─────────────────────────┘              └───────────────────────────────────────────┘
```

---

## 1. Current State

### Stripe Products (Web)

| Plan        | Product ID            | Monthly Price | Annual Price | Credits/Month | Rollover  |
| ----------- | --------------------- | ------------- | ------------ | ------------- | --------- |
| **Splash**  | `prod_Teu88OhgAhqYSc` | £7.99         | £79.99       | 250           | None      |
| **Rainbow** | `prod_Teu8zkMl2vgqVX` | £13.99        | £139.99      | 500           | 500 max   |
| **Sparkle** | `prod_Teu8cgoaosCRPL` | £24.99        | £249.99      | 1,000         | 2,000 max |
| **Studio**  | `prod_Teu8fTsKkDeP3Z` | £59.99        | £599.00      | 5,000         | 3 months  |

### Stripe Price IDs

| Plan    | Monthly Price ID                 | Annual Price ID                  |
| ------- | -------------------------------- | -------------------------------- |
| Splash  | `price_1ShaKJK6qKjkWA8MjbtbVfjz` | `price_1ShaKJK6qKjkWA8MUSbkuNdx` |
| Rainbow | `price_1ShaKHK6qKjkWA8MAYqLfjNx` | `price_1ShaKHK6qKjkWA8MlGmmFmNY` |
| Sparkle | `price_1ShaKDK6qKjkWA8M3i9bJIzO` | `price_1ShaKDK6qKjkWA8MHloHgoV9` |
| Studio  | `price_1ShaKBK6qKjkWA8MpMFtL5MZ` | `price_1ShaKAK6qKjkWA8Mtev5YmhN` |

### Credit Packs

| Pack         | Price  | Price ID                         |
| ------------ | ------ | -------------------------------- |
| 100 Credits  | £3.00  | `price_1ShaJJK6qKjkWA8Mno1GiwvC` |
| 500 Credits  | £12.00 | `price_1ShaJEK6qKjkWA8McxvyECUk` |
| 1000 Credits | £20.00 | (to be added)                    |

### RevenueCat Project

- **Project ID**: `projfdef8714`
- **Project Name**: Chunky Crayon
- **Apps**: Test Store (`appb0b8421e7c`)

---

## 2. RevenueCat Configuration

### Naming Convention

Following the pattern from Parking Ticket Pal:

| Display Name    | Store Identifier         | Type         |
| --------------- | ------------------------ | ------------ |
| Splash Monthly  | `splash_sub_monthly_v1`  | subscription |
| Splash Yearly   | `splash_sub_yearly_v1`   | subscription |
| Rainbow Monthly | `rainbow_sub_monthly_v1` | subscription |
| Rainbow Yearly  | `rainbow_sub_yearly_v1`  | subscription |
| Sparkle Monthly | `sparkle_sub_monthly_v1` | subscription |
| Sparkle Yearly  | `sparkle_sub_yearly_v1`  | subscription |

**For Play Store** (when added): `{plan}_sub_{period}_v1:{period}-base`

- Example: `rainbow_sub_monthly_v1:monthly-base`

### Entitlements

| Lookup Key | Display Name   | Description                          |
| ---------- | -------------- | ------------------------------------ |
| `premium`  | Premium Access | Gates all paid subscription features |

### Offerings

| Lookup Key | Display Name     | Is Current |
| ---------- | ---------------- | ---------- |
| `default`  | Default Offering | Yes        |

### Packages

| Lookup Key        | Display Name                   | Product                  | Position |
| ----------------- | ------------------------------ | ------------------------ | -------- |
| `$rc_monthly`     | Rainbow Monthly (Most Popular) | `rainbow_sub_monthly_v1` | 1        |
| `$rc_annual`      | Rainbow Yearly (Best Value)    | `rainbow_sub_yearly_v1`  | 2        |
| `splash_monthly`  | Splash Monthly                 | `splash_sub_monthly_v1`  | 3        |
| `splash_annual`   | Splash Yearly                  | `splash_sub_yearly_v1`   | 4        |
| `sparkle_monthly` | Sparkle Monthly                | `sparkle_sub_monthly_v1` | 5        |
| `sparkle_annual`  | Sparkle Yearly                 | `sparkle_sub_yearly_v1`  | 6        |

### Pricing (GBP)

| Product                  | Price   |
| ------------------------ | ------- |
| `splash_sub_monthly_v1`  | £7.99   |
| `splash_sub_yearly_v1`   | £79.99  |
| `rainbow_sub_monthly_v1` | £13.99  |
| `rainbow_sub_yearly_v1`  | £139.99 |
| `sparkle_sub_monthly_v1` | £24.99  |
| `sparkle_sub_yearly_v1`  | £249.99 |

---

## 3. Database Schema Changes

### New/Updated Models

```prisma
// Enhanced Subscription model to support both platforms
model Subscription {
  id                   String             @id @default(cuid())
  userId               String
  user                 User               @relation(fields: [userId], references: [id], onDelete: Cascade)

  // Platform identification
  platform             SubscriptionPlatform
  externalId           String             @unique // stripeSubscriptionId OR revenuecatAppUserId

  // Subscription state
  planName             PlanName
  billingPeriod        BillingPeriod
  status               SubscriptionStatus

  // Timing
  currentPeriodStart   DateTime
  currentPeriodEnd     DateTime
  trialStart           DateTime?
  trialEnd             DateTime?
  cancelledAt          DateTime?

  // Grace period handling
  gracePeriodEnd       DateTime?

  // Platform-specific metadata
  storeProductId       String?            // e.g., "splash_sub_monthly_v1"
  metadata             Json?

  createdAt            DateTime           @default(now())
  updatedAt            DateTime           @updatedAt

  events               SubscriptionEvent[]

  @@index([userId])
  @@index([platform, externalId])
  @@map("subscriptions")
}

// Audit log for subscription changes
model SubscriptionEvent {
  id              String            @id @default(cuid())
  subscriptionId  String
  subscription    Subscription      @relation(fields: [subscriptionId], references: [id], onDelete: Cascade)

  eventType       SubscriptionEventType
  platform        SubscriptionPlatform
  externalEventId String?           @unique

  previousStatus  SubscriptionStatus?
  newStatus       SubscriptionStatus?
  previousPlan    PlanName?
  newPlan         PlanName?

  creditsAdded    Int               @default(0)
  rawPayload      Json?

  processedAt     DateTime          @default(now())

  @@index([subscriptionId])
  @@index([externalEventId])
  @@map("subscription_events")
}

// Unified webhook event tracking (replaces StripeWebhookEvent)
model WebhookEvent {
  id          String               @id
  platform    SubscriptionPlatform
  eventType   String
  processedAt DateTime             @default(now())

  @@map("webhook_events")
}

// New enums
enum SubscriptionPlatform {
  STRIPE
  REVENUECAT
}

enum SubscriptionEventType {
  TRIAL_STARTED
  SUBSCRIPTION_STARTED
  RENEWAL_SUCCESS
  RENEWAL_FAILED
  PLAN_UPGRADED
  PLAN_DOWNGRADED
  CANCELLATION_SCHEDULED
  CANCELLED
  REACTIVATED
  BILLING_ISSUE_DETECTED
  BILLING_ISSUE_RESOLVED
  GRACE_PERIOD_STARTED
  GRACE_PERIOD_EXPIRED
  REFUNDED
  TRANSFERRED
  EXPIRED
}

enum SubscriptionStatus {
  TRIALING
  ACTIVE
  PAST_DUE
  CANCELLED
  EXPIRED
  PAUSED
}
```

### User Model Additions

```prisma
model User {
  // ... existing fields ...

  stripeCustomerId     String?
  revenuecatUserId     String?  @unique // Same as our userId, for RevenueCat identification

  // ... rest of model ...
}
```

---

## 4. Webhook Event Handling

### Stripe Webhooks (Existing - Update)

| Event                                  | Action                     | Credits             |
| -------------------------------------- | -------------------------- | ------------------- |
| `checkout.session.completed`           | Create subscription        | Add plan credits    |
| `customer.subscription.updated`        | Update plan/status         | Prorated if upgrade |
| `customer.subscription.deleted`        | Set CANCELLED → EXPIRED    | None                |
| `invoice.payment_succeeded`            | Update period, ACTIVE      | Add renewal credits |
| `invoice.payment_failed`               | Set PAST_DUE, grace period | None                |
| `charge.refunded`                      | Set EXPIRED                | Deduct credits      |
| `customer.subscription.trial_will_end` | Send reminder              | None                |

### RevenueCat Webhooks (New)

| Event              | Action                     | Credits             |
| ------------------ | -------------------------- | ------------------- |
| `INITIAL_PURCHASE` | Create subscription        | Add plan credits    |
| `RENEWAL`          | Update period              | Add renewal credits |
| `CANCELLATION`     | Set cancelledAt, CANCELLED | None                |
| `UNCANCELLATION`   | Clear cancelledAt, ACTIVE  | None                |
| `BILLING_ISSUE`    | Set PAST_DUE, grace period | None                |
| `PRODUCT_CHANGE`   | Update plan                | Prorated if upgrade |
| `EXPIRATION`       | Set EXPIRED                | None                |
| `REFUND`           | Set EXPIRED                | Deduct credits      |
| `TRANSFER`         | Update userId              | None                |

### Idempotency Strategy

```typescript
async function processWebhookEvent(
  platform: "STRIPE" | "REVENUECAT",
  eventId: string,
  eventType: string,
  handler: () => Promise<void>,
): Promise<{ processed: boolean; skipped: boolean }> {
  const existing = await db.webhookEvent.findUnique({ where: { id: eventId } });

  if (existing) {
    return { processed: false, skipped: true };
  }

  await db.$transaction(async (tx) => {
    await tx.webhookEvent.create({
      data: { id: eventId, platform, eventType },
    });
    await handler();
  });

  return { processed: true, skipped: false };
}
```

---

## 5. API Endpoints

### GET /api/entitlements

Returns current subscription state for authenticated user.

**Request Headers:**

- `Authorization: Bearer <session>` (web)
- `X-Device-Token: <token>` (mobile)

**Response:**

```json
{
  "hasAccess": true,
  "plan": "RAINBOW",
  "status": "ACTIVE",
  "platform": "STRIPE",
  "expiresAt": "2024-02-15T00:00:00Z",
  "isTrialing": false,
  "isCancelled": false,
  "credits": 450,
  "features": {
    "canGenerate": true,
    "canDownload": true,
    "canUseVoice": true,
    "canUseCamera": true,
    "maxProfiles": 5,
    "hasCommercialUse": false,
    "hasPrioritySupport": true
  }
}
```

### POST /api/revenuecat/webhook

RevenueCat webhook endpoint.

**Validation:**

- Verify `Authorization` header matches RevenueCat webhook auth key
- Check idempotency via event ID

---

## 6. Mobile Integration

### RevenueCat SDK Setup

```typescript
// apps/mobile/lib/revenuecat.ts
import Purchases from "react-native-purchases";

export async function initializeRevenueCat(userId?: string) {
  await Purchases.configure({
    apiKey: process.env.EXPO_PUBLIC_REVENUECAT_API_KEY!,
    appUserID: userId, // Use our userId for cross-platform sync
  });
}

export async function identifyUser(userId: string) {
  await Purchases.logIn(userId);
}
```

### Paywall Hook

```typescript
// apps/mobile/hooks/usePaywall.ts
import { useQuery } from "@tanstack/react-query";
import Purchases from "react-native-purchases";

export function usePaywall() {
  return useQuery({
    queryKey: ["offerings"],
    queryFn: async () => {
      const offerings = await Purchases.getOfferings();
      return offerings.current;
    },
  });
}
```

---

## 7. Edge Cases

### Cross-Platform Access

User buys on web → logs into mobile:

- Mobile calls `/api/entitlements`
- Returns existing STRIPE subscription
- User has access on mobile

User buys on mobile → logs into web:

- Web calls `/api/entitlements`
- Returns existing REVENUECAT subscription
- User has access on web

### Subscription Conflict Prevention

- DB constraint: One active subscription per user
- If user tries to subscribe on second platform while active:
  - Show "Already subscribed via {platform}"
  - Offer to manage on original platform

### 3-Day Free Trial

**Stripe:** Set `trial_period_days: 3` in checkout session
**App Store/Play Store:** Configure "Introductory Offer" → Free Trial → 3 days

**Trial Tracking:**

- Store `trialStart` and `trialEnd` in subscription
- Track trial usage to prevent abuse (cancel + re-subscribe)

---

## 8. Implementation Phases

### Phase 1: Database & Documentation (Day 1)

- [x] Create this plan document
- [x] Update Prisma schema with new models
- [x] Push schema changes to development database

### Phase 2: RevenueCat Configuration (Day 1-2)

- [x] Create products with correct naming (`*_sub_*_v1`)
- [x] Create packages and attach products
- [x] Set prices
- [x] Attach products to entitlement
- [x] Delete old incorrectly named products (manual in dashboard) ✓ Deleted 2025-01-07
- [x] Configure webhook URL in RevenueCat dashboard ✓ Configured 2025-01-07

### Phase 3: Backend Implementation (Day 2-3)

- [x] Create `/api/entitlements` endpoint
- [x] Create `/api/revenuecat/webhook` endpoint
- [x] Update Stripe webhook to use new models (added platform, externalId)
- [x] Add subscription event logging (via SubscriptionEvent model)
- [x] Implement idempotency checks (via WebhookEvent model)

### Phase 4: Mobile Integration (Day 3-4)

- [x] Initialize RevenueCat SDK on app start
- [x] Implement user identification
- [x] Create paywall UI
- [x] Implement purchase flow
- [x] Add restore purchases functionality
- [x] Integrate entitlements hook

### Phase 5: Testing & Launch (Day 5)

- [ ] Test with RevenueCat Test Store
- [ ] Test cross-platform scenarios
- [ ] Test webhook handling
- [ ] Add monitoring and alerts
- [ ] Deploy to production

### Phase 6: Paywall Integration & Credit Packs

#### 6a. Paywall Triggers (High Priority)

- [x] Add credit gate to `CreateColoringImageForm.tsx` (show paywall if no credits + no subscription)
- [x] Add feature gate to `VoiceInputPanel.tsx` (credit check before voice recording)
- [x] Add feature gate to `ImageInputPanel.tsx` (credit check before image processing)

#### 6b. Credit Packs for Mobile

- [x] Create consumable products in RevenueCat:
  - [x] `credits_100_v1` (100 credits, £3.00) → `prod7a5baa4503`
  - [x] `credits_500_v1` (500 credits, £12.00) → `prod7fa398fef4`
  - [x] `credits_1000_v1` (1,000 credits, £20.00) → `prod2b96147347`
- [x] Create "credits" offering in RevenueCat → `ofrng5a247d221f`
- [x] Create `CreditPackModal.tsx` component (shows credit packs for subscribers out of credits)
- [x] Update `apps/web/app/api/revenuecat/webhook/route.ts` to handle `NON_RENEWING_PURCHASE` event

#### 6c. Hook Updates

- [x] Update `useShouldShowPaywall()` in `useEntitlements.ts` to handle credit check ✓ Already implemented (returns `reason: 'no_credits'` when credits <= 0)

---

## 9. Files to Create/Modify

### New Files (Created)

- [x] `apps/web/app/api/entitlements/route.ts` - Entitlements API
- [x] `apps/web/app/api/revenuecat/webhook/route.ts` - RevenueCat webhook
- [ ] `apps/web/lib/revenuecat.ts` - RevenueCat server utilities (not needed yet)
- [x] `apps/mobile/lib/revenuecat.ts` - RevenueCat SDK setup
- [x] `apps/mobile/hooks/usePaywall.ts` - Paywall data hook
- [x] `apps/mobile/hooks/useEntitlements.ts` - Entitlements hook
- [x] `apps/mobile/components/Paywall/Paywall.tsx` - Paywall UI
- [x] `apps/mobile/components/CreditPackModal/CreditPackModal.tsx` - Credit pack purchase modal (subscribers only)
- [x] `apps/mobile/contexts/SubscriptionContext.tsx` - Subscription state management

### Modified Files (Updated)

- [x] `packages/db/prisma/schema.prisma` - Schema changes
- [x] `apps/web/app/api/payment/webhook/route.ts` - Update to new models
- [x] `apps/mobile/providers.tsx` - Added SubscriptionProvider
- [x] `apps/mobile/contexts/index.ts` - Export SubscriptionContext
- [x] `apps/mobile/lib/index.ts` - Export revenuecat
- [x] `apps/mobile/api.ts` - Added entitlements API types and function

---

## 10. Environment Variables

### Web (Vercel)

```
# Existing
STRIPE_SECRET=sk_...
STRIPE_WEBHOOK_SECRET=whsec_...

# New - RevenueCat webhook verification only
REVENUECAT_WEBHOOK_AUTH_KEY=<your-generated-secret>  # Must match Authorization header in RC dashboard
```

> **Note**: Web does NOT need `REVENUECAT_API_KEY`. The webhook auth key is only for verifying incoming webhooks are authentic.

### Mobile (Expo EAS)

```
REVENUECAT_PUBLIC_API_KEY=appl_...  # RevenueCat public SDK key (iOS)
# For Android: goog_...
```

> **Note**: This is set as a **Secret** in Expo EAS Environment Variables.

---

## 11. RevenueCat IDs Reference

### Project

- **ID**: `projfdef8714`

### Apps

- **Test Store**: `appb0b8421e7c`
- **iOS App**: (to be created when App Store credentials ready)
- **Android App**: (to be created when Play Store credentials ready)

### Entitlements

- **Premium**: `entl13dc73b480`

### Offerings

- **Default**: `ofrng075ef0f923`

### Products

| Display Name       | Store Identifier         | Product ID       |
| ------------------ | ------------------------ | ---------------- |
| Splash Monthly v1  | `splash_sub_monthly_v1`  | `prod60584d603e` |
| Splash Yearly      | `splash_sub_yearly_v1`   | `prod8eb459ddab` |
| Rainbow Monthly v1 | `rainbow_sub_monthly_v1` | `prod48aa8f2736` |
| Rainbow Yearly     | `rainbow_sub_yearly_v1`  | `prod458f642b98` |
| Sparkle Monthly v1 | `sparkle_sub_monthly_v1` | `prodb4a37011aa` |
| Sparkle Yearly     | `sparkle_sub_yearly_v1`  | `prod527100fb19` |

### Packages

| Lookup Key        | Display Name                   | Package ID       |
| ----------------- | ------------------------------ | ---------------- |
| `$rc_monthly`     | Rainbow Monthly (Most Popular) | `pkgeebea8002bf` |
| `$rc_annual`      | Rainbow Annual (Best Value)    | `pkgedab038ca2a` |
| `splash_monthly`  | Splash Monthly                 | `pkgef8647f7077` |
| `splash_annual`   | Splash Annual                  | `pkgec34168c674` |
| `sparkle_monthly` | Sparkle Monthly                | `pkge3bd4fbfea5` |
| `sparkle_annual`  | Sparkle Annual                 | `pkge2d8a692f9d` |

### Credit Pack Products (Consumables)

| Display Name | Store Identifier  | Product ID       | Price  |
| ------------ | ----------------- | ---------------- | ------ |
| 100 Credits  | `credits_100_v1`  | `prod7a5baa4503` | £3.00  |
| 500 Credits  | `credits_500_v1`  | `prod7fa398fef4` | £12.00 |
| 1000 Credits | `credits_1000_v1` | `prod2b96147347` | £20.00 |

### Credit Pack Offering & Packages

| Type     | Lookup Key     | Display Name             | ID                |
| -------- | -------------- | ------------------------ | ----------------- |
| Offering | `credits`      | Credit Packs             | `ofrng5a247d221f` |
| Package  | `credits_100`  | 100 Credits              | `pkge903ebc598f`  |
| Package  | `credits_500`  | 500 Credits (Best Value) | `pkge1603b23150`  |
| Package  | `credits_1000` | 1000 Credits             | `pkge5aaffd5c95`  |

### Old Products (Deleted)

The following incorrectly-named products were deleted from RevenueCat dashboard on 2025-01-07:

- ~~`prode634778069` (splash_monthly)~~ ✓
- ~~`prodb422028d74` (splash_annual)~~ ✓
- ~~`prod50b4f6a42d` (rainbow_monthly)~~ ✓
- ~~`prod8d16a43e6a` (rainbow_annual)~~ ✓
- ~~`prodf8787a8599` (sparkle_monthly)~~ ✓
- ~~`prod74708e2596` (sparkle_annual)~~ ✓

---

## 12. Testing with Test Store

The current setup uses RevenueCat's **Test Store** for development. Test Store purchases are free and don't require App Store/Play Store credentials.

### How to Test

1. **Verify webhook is reachable**:
   - Go to RevenueCat → Integrations → Webhooks
   - Click "Send test webhook" to verify endpoint responds

2. **Test mobile purchase flow**:
   - Run app on iOS simulator or Android emulator
   - Open paywall screen
   - Select a plan and complete purchase (free in test mode)
   - Check database for new subscription record

3. **Test entitlements API**:

   ```bash
   curl -H "Authorization: Bearer <your-jwt>" https://chunkycrayon.com/api/entitlements
   ```

4. **Test cross-platform access**:
   - Purchase on mobile via Test Store
   - Verify entitlements work on web for same user

### Test Store Limitations

- No real payment processing
- No receipt validation against Apple/Google
- Products only visible in sandbox/development builds

---

## 13. Transitioning to Real Stores

When ready for production, follow these steps to transition from Test Store to real App Store and Play Store.

### Step 1: Create Apps in RevenueCat

| Platform                 | Requirements                                                      |
| ------------------------ | ----------------------------------------------------------------- |
| **iOS (App Store)**      | Bundle ID, App Store Connect API Key (.p8 file), Shared Secret    |
| **Android (Play Store)** | Package Name, Service Account JSON key with Financial Data access |

1. Go to RevenueCat → Apps & providers → New App
2. Select platform (App Store or Play Store)
3. Upload credentials and configure

### Step 2: Create Products in Stores

Create the **same 6 products** with identical identifiers in each store:

| Store Identifier         | App Store Connect             | Play Console              |
| ------------------------ | ----------------------------- | ------------------------- |
| `splash_sub_monthly_v1`  | Subscription → Auto-Renewable | Subscriptions → Base plan |
| `splash_sub_yearly_v1`   | Subscription → Auto-Renewable | Subscriptions → Base plan |
| `rainbow_sub_monthly_v1` | Subscription → Auto-Renewable | Subscriptions → Base plan |
| `rainbow_sub_yearly_v1`  | Subscription → Auto-Renewable | Subscriptions → Base plan |
| `sparkle_sub_monthly_v1` | Subscription → Auto-Renewable | Subscriptions → Base plan |
| `sparkle_sub_yearly_v1`  | Subscription → Auto-Renewable | Subscriptions → Base plan |

### Step 3: Import Products to RevenueCat

1. Go to RevenueCat → Product catalog → Products → New
2. Select your iOS or Android app
3. RevenueCat will show products from the connected store
4. Import each product

### Step 4: Attach Products to Entitlement & Offerings

1. Go to each imported product
2. Attach to the existing `premium` entitlement (`entl13dc73b480`)
3. Add to the `default` offering packages

### Step 5: Configure Trial Period (Optional)

| Platform              | How to Configure                                         |
| --------------------- | -------------------------------------------------------- |
| **App Store Connect** | Subscription → Introductory Offers → Free Trial → 3 days |
| **Play Console**      | Subscription → Base plan → Offers → Free trial → 3 days  |

### Checklist

- [ ] Create iOS app in RevenueCat with App Store credentials
- [ ] Create Android app in RevenueCat with Play Store credentials
- [ ] Create 6 products in App Store Connect
- [ ] Create 6 products in Play Console
- [ ] Import iOS products to RevenueCat
- [ ] Import Android products to RevenueCat
- [ ] Attach all products to `premium` entitlement
- [ ] Attach all products to `default` offering packages
- [ ] Test sandbox purchases on real devices
- [ ] Submit apps for review

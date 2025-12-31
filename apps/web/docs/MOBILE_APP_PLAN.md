# Mobile App Revamp Plan

_Created: December 2024_ _Last Updated: December 30, 2024_ _Status: Phase 3
Complete, Phase 4 In Progress (Navigation & UI Feature Parity)_

**Target SDK:** Expo SDK 54 | React Native 0.81 | React 19.1.0

---

## Executive Summary

The mobile app is the **primary revenue driver** for Chunky Crayon. The web app
serves as a funnel to mobile - users discover via SEO/gallery, but convert and
retain on mobile. iPad is the hero device: largest screen real estate for
coloring, and the device most kids have access to.

**Goal:** Build a best-in-class, second-to-none coloring experience that
leverages the latest 2025 native technology (Skia, Expo SDK 54, React Native
0.81) while maintaining full feature parity with web PLUS mobile-specific
enhancements.

**Current State:** Feature-rich app (7/10) - core coloring + effects + magic
features + photo-to-coloring complete **Target State:** Premium coloring app
(9/10) - full features + mobile enhancements

---

## Strategic Priorities

### 1. iPad-First Design

- iPad is the primary target device
- Kids use iPads for creative apps
- Largest screen = best coloring experience
- Parents approve iPad usage more than phones
- Design for iPad, scale down to iPhone

### 2. Frictionless Onboarding

- No forced signup/login
- Carousel explaining app value
- Immediate access to coloring
- Device-local storage for guest users
- Sign-in only needed to sync subscriptions

### 3. Premium Experience

- Best-in-class coloring tools
- Smooth 60fps performance
- Haptic feedback throughout
- Rich animations and sound effects
- Offline-first architecture

---

## Current Mobile App State

### What Exists

| Component          | Status                  | Quality |
| ------------------ | ----------------------- | ------- |
| Gallery browsing   | Basic                   | 4/10    |
| Image display      | Working                 | 5/10    |
| Stroke drawing     | ✅ Enhanced             | 7/10    |
| Color palette      | ✅ 21 colors            | 7/10    |
| Skia canvas        | ✅ Full gestures        | 7/10    |
| Fill tool          | ✅ Scanline algo        | 7/10    |
| Undo/Redo          | ✅ History stack        | 8/10    |
| Brush textures     | ✅ 7 types              | 8/10    |
| Zoom/Pan           | ✅ Pinch + pan          | 8/10    |
| Auto-save          | ✅ AsyncStorage         | 8/10    |
| Canvas toolbar     | ✅ Complete             | 8/10    |
| Pattern fills      | ✅ 6 patterns           | 8/10    |
| Stickers/stamps    | ✅ 72 emojis            | 8/10    |
| Haptic feedback    | ✅ Throughout           | 8/10    |
| Sound effects      | ✅ Infrastructure       | 7/10    |
| Magic tool         | ✅ Suggest + Auto modes | 8/10    |
| Photo-to-Coloring  | ✅ Camera/gallery → AI  | 8/10    |
| Voice input        | ✅ Speech-to-text       | 8/10    |
| EAS build pipeline | Configured              | 8/10    |
| Expo SDK 54 setup  | ✅ Complete             | 9/10    |

### What's Missing (vs Web)

| Feature              | Web Status                             | Mobile Status            |
| -------------------- | -------------------------------------- | ------------------------ |
| Fill tool            | ✅ Complete                            | ✅ Complete (Phase 1)    |
| Undo/Redo            | ✅ Complete                            | ✅ Complete (Phase 1)    |
| Brush textures       | ✅ Crayon/Marker                       | ✅ 7 types (Phase 1+2)   |
| Zoom/Pan             | ✅ Complete                            | ✅ Complete (Phase 1)    |
| Pattern fills        | ✅ 6 patterns                          | ✅ Complete (Phase 2)    |
| Stickers             | ✅ Emoji library                       | ✅ Complete (Phase 2)    |
| Effects              | ✅ Glitter/Rainbow/Glow/Neon           | ✅ Complete (Phase 2)    |
| Magic Color          | ✅ AI suggestions                      | ✅ Complete (Phase 3)    |
| Auto-Color           | ✅ One-click fill                      | ✅ Complete (Phase 3)    |
| Photo-to-Coloring    | ✅ Photo → coloring page               | ✅ Complete (Phase 3)    |
| Voice input          | ✅ Speech-to-text                      | ✅ Complete (Phase 3)    |
| Navigation/UI parity | ✅ Header indicators, 5 tabs, Settings | 🚧 In Progress (Phase 4) |
| Retention mechanics  | ✅ Stickers/Evolution/Challenges       | ❌ Missing (Phase 5)     |
| Authentication       | ✅ next-auth                           | ❌ Missing (Phase 6)     |
| Payments             | ✅ Stripe                              | ❌ Missing (Phase 7)     |
| Internationalization | ✅ 6 languages                         | ❌ Missing (Phase 4)     |
| Push notifications   | N/A                                    | ❌ Missing (Phase 5)     |

---

## Architecture Decisions

### 1. Subscription Source of Truth: Database

```
┌─────────────────────────────────────────────────────────────────┐
│                     Subscription Flow                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  WEB (Stripe)                    MOBILE (RevenueCat)            │
│  ─────────────                   ──────────────────             │
│  User pays via Stripe  ──┐       User pays via IAP  ──┐        │
│                          │                            │         │
│                          ▼                            ▼         │
│                    ┌──────────────────────────────────┐        │
│                    │    WEBHOOKS → DATABASE           │        │
│                    │    (Source of Truth)             │        │
│                    │                                  │        │
│                    │  • subscription status           │        │
│                    │  • credits/entitlements          │        │
│                    │  • expiry dates                  │        │
│                    │  • plan tier                     │        │
│                    └──────────────────────────────────┘        │
│                                                                  │
│  Both platforms check database for entitlements                 │
│  NOT Stripe or RevenueCat directly                              │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

**Why database as source of truth:**

- Single source for subscription status across all platforms
- Stripe and RevenueCat can drift/have sync issues
- Database allows custom entitlement logic (credits, trials, gifts)
- Easier to debug and audit
- Webhook-driven updates ensure consistency

### 2. Server Actions as API Endpoints

```
┌─────────────────────────────────────────────────────────────────┐
│                     API Architecture                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  WEB APP                         MOBILE APP                     │
│  ───────                         ──────────                     │
│  Calls server actions           Calls REST endpoints            │
│  directly                       (/api/mobile/*)                 │
│           │                              │                       │
│           │                              │                       │
│           ▼                              ▼                       │
│      ┌─────────────────────────────────────────────┐           │
│      │           SERVER ACTIONS                     │           │
│      │           (Shared Logic)                     │           │
│      │                                              │           │
│      │  • generateColoringImage()                   │           │
│      │  • saveArtwork()                             │           │
│      │  • getSubscriptionStatus()                   │           │
│      │  • updateUserProfile()                       │           │
│      │  • completeChallenge()                       │           │
│      └─────────────────────────────────────────────┘           │
│                                                                  │
│  Endpoints are thin wrappers around server actions              │
│  Mobile authenticates via headers (token-based)                 │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

**Benefits:**

- No code duplication between web and mobile
- Business logic lives in server actions
- Endpoints handle auth/validation for mobile
- Easy to test and maintain

### 3. Device-Local Storage (AsyncStorage)

```
┌─────────────────────────────────────────────────────────────────┐
│                     Storage Strategy                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  GUEST USER (Not Signed In)                                     │
│  ──────────────────────────                                     │
│  • Artwork saved to AsyncStorage                                │
│  • Progress/achievements stored locally                         │
│  • No cloud sync                                                │
│  • Data persists until app deleted                              │
│  • CAN'T be cleared like web localStorage                       │
│                                                                  │
│  SIGNED IN USER                                                 │
│  ──────────────                                                 │
│  • Artwork synced to database                                   │
│  • Progress synced across devices                               │
│  • AsyncStorage as cache/offline fallback                       │
│  • Subscription entitlements from database                      │
│                                                                  │
│  SIGN-IN TRIGGER: Only when user wants to:                      │
│  • Sync artwork to web                                          │
│  • Access subscription from web purchase                        │
│  • Use across multiple devices                                  │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

**Key difference from web:** AsyncStorage can't be easily cleared by users or
parents. More secure for storing progress and artwork.

### 4. Authentication Strategy

```
┌─────────────────────────────────────────────────────────────────┐
│                     Mobile Authentication                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. DEVICE ID (Guest Mode)                                      │
│     • Generated on first launch                                 │
│     • Stored in AsyncStorage                                    │
│     • Used to identify device for local progress                │
│                                                                  │
│  2. TOKEN-BASED AUTH (Signed In)                                │
│     • OAuth flow (Apple/Google)                                 │
│     • Token stored securely (Keychain/Keystore)                 │
│     • Sent in Authorization header for API calls                │
│     • Refresh token flow for long sessions                      │
│                                                                  │
│  3. HEADER FORMAT                                               │
│     Authorization: Bearer <token>                               │
│     X-Device-ID: <device-uuid>                                  │
│     X-Platform: ios|android                                     │
│     X-App-Version: 1.0.0                                        │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 5. Payment Architecture (Proven Patterns)

_Adapted from parking-ticket-pal project - battle-tested RevenueCat + Stripe
integration_

#### Database Schema (Prisma)

```prisma
model Subscription {
  id                       String             @id @default(cuid())
  userId                   String             @unique
  stripeSubscriptionId     String?            @unique  // Web purchases
  revenueCatSubscriptionId String?            @unique  // Mobile IAP
  tier                     SubscriptionTier            // SPLASH | RAINBOW | SPARKLE
  source                   SubscriptionSource          // STRIPE | REVENUECAT
  status                   SubscriptionStatus          // ACTIVE | CANCELLED | EXPIRED
  currentPeriodEnd         DateTime?
  createdAt                DateTime           @default(now())
  updatedAt                DateTime           @updatedAt
  user                     User               @relation(fields: [userId], references: [id])
}

model CreditBalance {
  id                String   @id @default(cuid())
  userId            String   @unique
  balance           Int      @default(0)      // Current credits
  monthlyAllocation Int      @default(0)      // Credits per month from subscription
  rolloverCredits   Int      @default(0)      // Carried from previous month
  lastRefillAt      DateTime?
  user              User     @relation(fields: [userId], references: [id])
}

model CreditTransaction {
  id          String            @id @default(cuid())
  userId      String
  amount      Int                               // + for add, - for spend
  type        CreditTransactionType             // SUBSCRIPTION_REFILL | PACK_PURCHASE | GENERATION_SPEND | BONUS
  description String?
  createdAt   DateTime          @default(now())
  user        User              @relation(fields: [userId], references: [id])
}

model User {
  // ... existing fields
  stripeCustomerId      String?    @unique
  revenueCatCustomerId  String?    @unique  // App User ID in RevenueCat
  subscription          Subscription?
  creditBalance         CreditBalance?
  creditTransactions    CreditTransaction[]
}

enum SubscriptionTier {
  SPLASH    // 250 credits/mo
  RAINBOW   // 500 credits/mo + rollover
  SPARKLE   // 1000 credits/mo + rollover
}

enum SubscriptionSource {
  STRIPE
  REVENUECAT
}

enum SubscriptionStatus {
  ACTIVE
  CANCELLED
  PAST_DUE
  EXPIRED
}

enum CreditTransactionType {
  SUBSCRIPTION_REFILL
  PACK_PURCHASE
  GENERATION_SPEND
  BONUS
  ROLLOVER
}
```

#### Subscription Helper Functions

```typescript
// lib/subscription.ts

export function hasActiveSubscription(user: UserWithSubscription): boolean {
  return user.subscription?.status === 'ACTIVE';
}

export function getSubscriptionTier(
  user: UserWithSubscription,
): SubscriptionTier | null {
  if (!hasActiveSubscription(user)) return null;
  return user.subscription?.tier ?? null;
}

export function isStripeSubscription(user: UserWithSubscription): boolean {
  return user.subscription?.source === 'STRIPE';
}

export function isRevenueCatSubscription(user: UserWithSubscription): boolean {
  return user.subscription?.source === 'REVENUECAT';
}

// Prevent duplicate subscriptions from different sources
export function canPurchaseMobileSubscription(
  user: UserWithSubscription,
): boolean {
  // If user has active Stripe subscription, block mobile purchase
  if (hasActiveSubscription(user) && isStripeSubscription(user)) {
    return false;
  }
  return true;
}

// Credit allocation per tier
export const TIER_CREDITS: Record<
  SubscriptionTier,
  { monthly: number; rolloverMax: number }
> = {
  SPLASH: { monthly: 250, rolloverMax: 0 }, // No rollover
  RAINBOW: { monthly: 500, rolloverMax: 500 }, // Up to 500 rollover
  SPARKLE: { monthly: 1000, rolloverMax: 2000 }, // Up to 2000 rollover
};

export function getMonthlyCredits(tier: SubscriptionTier): number {
  return TIER_CREDITS[tier].monthly;
}
```

#### Webhook Handlers

**RevenueCat Webhook** (`/api/webhooks/revenuecat/route.ts`):

```typescript
import { headers } from 'next/headers';
import { revalidatePath } from 'next/cache';
import crypto from 'crypto';

// HMAC SHA256 verification
function verifyWebhookSignature(body: string, signature: string): boolean {
  const secret = process.env.REVENUECAT_WEBHOOK_SECRET!;
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(body)
    .digest('hex');
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature),
  );
}

export async function POST(request: Request) {
  const body = await request.text();
  const headersList = await headers();
  const signature = headersList.get('x-revenuecat-signature');

  if (!signature || !verifyWebhookSignature(body, signature)) {
    return Response.json({ error: 'Invalid signature' }, { status: 401 });
  }

  const event = JSON.parse(body);
  const { app_user_id, product_id, type, original_transaction_id } = event;

  // Find user by RevenueCat customer ID
  const user = await prisma.user.findFirst({
    where: { revenueCatCustomerId: app_user_id },
    include: { subscription: true, creditBalance: true },
  });

  if (!user) {
    console.error('User not found for RevenueCat ID:', app_user_id);
    return Response.json({ received: true });
  }

  const tier = getTierFromProductId(product_id); // splash_monthly_v1 → SPLASH

  switch (type) {
    case 'INITIAL_PURCHASE':
    case 'RENEWAL':
      await prisma.subscription.upsert({
        where: { userId: user.id },
        create: {
          userId: user.id,
          revenueCatSubscriptionId: original_transaction_id,
          tier,
          source: 'REVENUECAT',
          status: 'ACTIVE',
        },
        update: {
          tier,
          status: 'ACTIVE',
        },
      });
      // Refill credits on renewal
      await refillCredits(user.id, tier);
      break;

    case 'CANCELLATION':
    case 'EXPIRATION':
      await prisma.subscription.update({
        where: { userId: user.id },
        data: { status: type === 'CANCELLATION' ? 'CANCELLED' : 'EXPIRED' },
      });
      break;

    case 'PRODUCT_CHANGE':
      // Upgrade/downgrade
      await prisma.subscription.update({
        where: { userId: user.id },
        data: { tier },
      });
      break;

    case 'NON_RENEWING_PURCHASE':
      // Credit pack purchase
      const credits = getCreditsFromProductId(product_id); // credits_500_v1 → 500
      await addCredits(user.id, credits, 'PACK_PURCHASE');
      break;
  }

  revalidatePath('/dashboard');
  revalidatePath('/color');

  return Response.json({ received: true });
}

function getTierFromProductId(productId: string): SubscriptionTier {
  if (productId.startsWith('splash_')) return 'SPLASH';
  if (productId.startsWith('rainbow_')) return 'RAINBOW';
  if (productId.startsWith('sparkle_')) return 'SPARKLE';
  throw new Error(`Unknown product: ${productId}`);
}

function getCreditsFromProductId(productId: string): number {
  if (productId.includes('credits_100')) return 100;
  if (productId.includes('credits_500')) return 500;
  if (productId.includes('credits_1000')) return 1000;
  throw new Error(`Unknown credit pack: ${productId}`);
}
```

#### Mobile PurchaseService (Singleton)

```typescript
// services/PurchaseService.ts
import Purchases, {
  CustomerInfo,
  PurchasesOfferings,
  PurchasesPackage,
} from 'react-native-purchases';
import { Platform } from 'react-native';

class PurchaseService {
  private static instance: PurchaseService;
  private initialized = false;

  static getInstance(): PurchaseService {
    if (!PurchaseService.instance) {
      PurchaseService.instance = new PurchaseService();
    }
    return PurchaseService.instance;
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;

    const apiKey =
      Platform.OS === 'ios'
        ? process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY!
        : process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY!;

    await Purchases.configure({ apiKey });
    this.initialized = true;
  }

  async logIn(userId: string): Promise<CustomerInfo> {
    const { customerInfo } = await Purchases.logIn(userId);
    return customerInfo;
  }

  async logOut(): Promise<void> {
    await Purchases.logOut();
  }

  async getCustomerInfo(): Promise<CustomerInfo> {
    return Purchases.getCustomerInfo();
  }

  async getOfferings(): Promise<PurchasesOfferings> {
    return Purchases.getOfferings();
  }

  async purchasePackage(pkg: PurchasesPackage): Promise<CustomerInfo> {
    const { customerInfo } = await Purchases.purchasePackage(pkg);
    return customerInfo;
  }

  async restorePurchases(): Promise<CustomerInfo> {
    return Purchases.restorePurchases();
  }
}

export default PurchaseService.getInstance();
```

#### Mobile PurchasesContext (React)

```typescript
// contexts/PurchasesContext.tsx
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { CustomerInfo, PurchasesPackage } from 'react-native-purchases';
import PurchaseService from '../services/PurchaseService';

interface PurchasesContextType {
  customerInfo: CustomerInfo | null;
  isLoading: boolean;
  hasActiveSubscription: boolean;
  currentTier: 'SPLASH' | 'RAINBOW' | 'SPARKLE' | null;
  purchasePackage: (pkg: PurchasesPackage) => Promise<void>;
  restorePurchases: () => Promise<void>;
  refreshCustomerInfo: () => Promise<void>;
}

const PurchasesContext = createContext<PurchasesContextType | null>(null);

export function PurchasesProvider({ children }: { children: React.ReactNode }) {
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function init() {
      try {
        await PurchaseService.initialize();
        const info = await PurchaseService.getCustomerInfo();
        setCustomerInfo(info);
      } catch (error) {
        console.error('Failed to initialize purchases:', error);
      } finally {
        setIsLoading(false);
      }
    }
    init();
  }, []);

  const hasActiveSubscription =
    customerInfo?.entitlements.active['splash_access'] !== undefined ||
    customerInfo?.entitlements.active['rainbow_access'] !== undefined ||
    customerInfo?.entitlements.active['sparkle_access'] !== undefined;

  const currentTier =
    customerInfo?.entitlements.active['sparkle_access'] ? 'SPARKLE' :
    customerInfo?.entitlements.active['rainbow_access'] ? 'RAINBOW' :
    customerInfo?.entitlements.active['splash_access'] ? 'SPLASH' : null;

  const purchasePackage = useCallback(async (pkg: PurchasesPackage) => {
    const info = await PurchaseService.purchasePackage(pkg);
    setCustomerInfo(info);
  }, []);

  const restorePurchases = useCallback(async () => {
    const info = await PurchaseService.restorePurchases();
    setCustomerInfo(info);
  }, []);

  const refreshCustomerInfo = useCallback(async () => {
    const info = await PurchaseService.getCustomerInfo();
    setCustomerInfo(info);
  }, []);

  return (
    <PurchasesContext.Provider value={{
      customerInfo,
      isLoading,
      hasActiveSubscription,
      currentTier,
      purchasePackage,
      restorePurchases,
      refreshCustomerInfo,
    }}>
      {children}
    </PurchasesContext.Provider>
  );
}

export function usePurchases() {
  const context = useContext(PurchasesContext);
  if (!context) {
    throw new Error('usePurchases must be used within PurchasesProvider');
  }
  return context;
}
```

#### RevenueCat Entitlements Setup

Create these entitlements in RevenueCat dashboard:

| Entitlement ID   | Products                                  |
| ---------------- | ----------------------------------------- |
| `splash_access`  | `splash_monthly_v1`, `splash_yearly_v1`   |
| `rainbow_access` | `rainbow_monthly_v1`, `rainbow_yearly_v1` |
| `sparkle_access` | `sparkle_monthly_v1`, `sparkle_yearly_v1` |

**Entitlement Hierarchy:** Sparkle > Rainbow > Splash (higher tiers include
lower tier access)

#### Environment Variables

```bash
# Backend (.env.local)
REVENUECAT_API_KEY=sk_xxxxx                     # Server-side API access
REVENUECAT_WEBHOOK_SECRET=whsec_xxxxx           # Webhook verification

# Mobile (EAS Secrets)
EXPO_PUBLIC_REVENUECAT_IOS_KEY=appl_xxxxx       # iOS SDK
EXPO_PUBLIC_REVENUECAT_ANDROID_KEY=goog_xxxxx   # Android SDK
```

#### Testing Checklist

```
□ Splash subscription purchase (monthly)
□ Splash subscription purchase (yearly)
□ Rainbow subscription purchase
□ Sparkle subscription purchase
□ Credit pack purchase (100, 500, 1000)
□ Subscription renewal (webhook received)
□ Subscription cancellation (webhook received)
□ Subscription upgrade (Splash → Rainbow → Sparkle)
□ Restore purchases (after reinstall)
□ Prevent duplicate subscriptions (Stripe + RevenueCat)
□ Credit refill on renewal
□ Credit rollover (Rainbow/Sparkle tiers)
□ Web subscription recognized on mobile
□ Mobile subscription recognized on web
```

---

## Feature Implementation Plan

### Phase 0: Dependency Upgrade & Environment Setup (Week 0)

**Goal:** Ensure all dependencies are current and compatible before feature
development

#### Step 1: Run Expo Doctor

```bash
cd apps/mobile
npx expo-doctor
```

This will identify:

- Outdated Expo packages
- Version conflicts between dependencies
- Missing peer dependencies
- SDK compatibility issues

#### Step 2: Upgrade Expo SDK

```bash
# Upgrade to latest Expo SDK
npx expo install expo@latest

# Update all Expo packages to compatible versions
npx expo install --fix
```

**Note:** Current SDK is 53, target is 54. Review
[Expo SDK 54 changelog](https://expo.dev/changelog/2024/05-07-sdk-54) for
breaking changes.

#### Step 3: Upgrade All Dependencies

```bash
cd apps/mobile
pnpm upgrade --latest

# Then fix any Expo-specific version conflicts
npx expo install --fix
```

#### Step 4: React Version Consistency

The monorepo must use consistent React versions across all workspaces:

| Workspace   | Current React | Target React |
| ----------- | ------------- | ------------ |
| apps/web    | 19.0.0        | 19.0.0       |
| apps/mobile | 19.0.0        | 19.0.0       |
| packages/\* | (peer dep)    | 19.0.0       |

**Root `package.json` resolutions (already configured):**

```json
{
  "resolutions": {
    "react": "19.0.0",
    "react-dom": "19.0.0",
    "react-native-renderer": "19.0.0",
    "@types/react": "^19.0.0"
  }
}
```

If pnpm conflicts arise, add overrides:

```json
{
  "pnpm": {
    "overrides": {
      "react": "19.0.0",
      "react-dom": "19.0.0"
    }
  }
}
```

#### Step 5: Configure EAS for Xcode 26 (Liquid Glass)

To enable iOS 26 Liquid Glass effects, update EAS config:

```json
// eas.json
{
  "build": {
    "development": {
      "ios": {
        "image": "macos-sequoia-15.5-xcode-26.0"
      }
    },
    "preview": {
      "ios": {
        "image": "macos-sequoia-15.5-xcode-26.0"
      }
    },
    "production": {
      "ios": {
        "image": "macos-sequoia-15.5-xcode-26.0"
      }
    }
  }
}
```

#### Step 6: Prebuild Cycle

After upgrading, run a clean prebuild:

```bash
cd apps/mobile

# Clean and regenerate native projects
pnpm prebuild:ios
pnpm prebuild:android

# Verify builds succeed
pnpm ios
pnpm android
```

#### Step 7: Verification Checklist

```
□ expo doctor reports no issues
□ All Expo packages on SDK 54
□ React version consistent (19.0.0) across workspaces
□ iOS build succeeds (Simulator)
□ Android build succeeds (Emulator)
□ Basic navigation works
□ No runtime errors in console
□ TypeScript type-check passes (pnpm check-types)
```

#### Key Dependencies to Verify

| Package                      | Current      | Target           | Notes                      |
| ---------------------------- | ------------ | ---------------- | -------------------------- |
| expo                         | ~53.0.22     | ~54.x.x          | SDK upgrade                |
| react-native                 | 0.79.5       | 0.79.x or 0.80.x | Match SDK                  |
| @shopify/react-native-skia   | 2.0.0-next.4 | Latest stable    | Core graphics              |
| react-native-reanimated      | ~3.17.5      | ~3.x.x           | Animations                 |
| react-native-gesture-handler | ~2.24.0      | ~2.x.x           | Touch input                |
| expo-router                  | ~5.1.5       | **~6.x.x**       | Native Tabs + Liquid Glass |

#### Step 8: Native Tabs with Liquid Glass

Expo Router v6 includes Native Tabs with automatic Liquid Glass on iOS 26:

```typescript
// app/(tabs)/_layout.tsx
import { NativeTabs } from 'expo-router/unstable-native-tabs';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faHome, faPlus, faPalette, faUser } from '@fortawesome/pro-solid-svg-icons';

export default function TabLayout() {
  return (
    <NativeTabs>
      <NativeTabs.Screen
        name="index"
        options={{
          title: 'Gallery',
          tabBarIcon: ({ color }) => (
            <FontAwesomeIcon icon={faHome} color={color} size={24} />
          ),
        }}
      />
      <NativeTabs.Screen
        name="create"
        options={{
          title: 'Create',
          tabBarIcon: ({ color }) => (
            <FontAwesomeIcon icon={faPlus} color={color} size={24} />
          ),
        }}
      />
      <NativeTabs.Screen
        name="my-art"
        options={{
          title: 'My Art',
          tabBarIcon: ({ color }) => (
            <FontAwesomeIcon icon={faPalette} color={color} size={24} />
          ),
        }}
      />
      <NativeTabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color }) => (
            <FontAwesomeIcon icon={faUser} color={color} size={24} />
          ),
        }}
      />
    </NativeTabs>
  );
}
```

**Native Tabs Features:**

- ✅ Liquid Glass effect on iOS 26 (automatic)
- ✅ Graceful fallback on older iOS/Android
- ✅ Scroll-to-top when tapping active tab
- ✅ Pop-to-root on double-tap
- ✅ Native system appearance

**App Structure with Tabs:**

```
app/
├── _layout.tsx              # Root layout (providers, fonts)
├── (tabs)/
│   ├── _layout.tsx          # NativeTabs layout
│   ├── index.tsx            # Gallery tab
│   ├── create.tsx           # Create tab
│   ├── my-art.tsx           # My Art tab
│   └── profile.tsx          # Profile tab
├── coloring-image/
│   └── [id].tsx             # Coloring screen (modal/stack)
└── onboarding/
    └── index.tsx            # Onboarding carousel
```

#### Step 9: Install All Phase Dependencies (One Prebuild)

To minimize prebuild cycles, install ALL native dependencies for ALL phases
upfront:

**Already Installed ✅**

- @shopify/react-native-skia (canvas/graphics)
- react-native-gesture-handler (touch handling)
- react-native-reanimated (animations)
- @tanstack/react-query (data fetching)
- axios (HTTP client)
- @shopify/flash-list (optimized lists)
- expo-router (navigation)
- expo-print (PDF export)
- expo-sharing (share sheets)
- expo-splash-screen (splash)
- expo-updates (OTA updates)
- @sentry/react-native (error tracking)
- expo-insights (basic analytics - interim until PostHog)

**Native Dependencies to Install 📦**

```bash
cd apps/mobile

# Install all native dependencies at once
npx expo install \
  @react-native-async-storage/async-storage \
  expo-haptics \
  expo-audio \
  lottie-react-native \
  expo-image-picker \
  expo-notifications \
  expo-apple-authentication \
  @react-native-google-signin/google-signin \
  react-native-purchases
```

| Package                                   | Phase | Purpose                                                |
| ----------------------------------------- | ----- | ------------------------------------------------------ |
| @react-native-async-storage/async-storage | 1     | Local persistence (auto-save)                          |
| expo-haptics                              | 2     | Haptic feedback                                        |
| expo-audio                                | 2     | Sound effects                                          |
| lottie-react-native                       | 2,4   | Animations (Colo evolution, confetti)                  |
| expo-image-picker                         | 3     | Camera/gallery for photo-to-coloring                   |
| expo-notifications                        | 4     | Push notifications (optional - adds compliance burden) |
| expo-apple-authentication                 | 5     | Apple Sign In (required for iOS)                       |
| @react-native-google-signin/google-signin | 5     | Google Sign In (Android)                               |
| react-native-purchases                    | 6     | RevenueCat IAP                                         |

**Non-Native Dependencies (No Prebuild Required)**

```bash
# Can be added anytime without prebuild
pnpm add zustand
```

| Package | Phase | Purpose                              |
| ------- | ----- | ------------------------------------ |
| zustand | 1     | State management (undo/redo history) |

**Deferred: PostHog (Phase 9 - Post-Approval)**

PostHog is added AFTER initial App Store approval to avoid Kids Category
scrutiny:

```bash
# Add post-approval (no native code, no prebuild needed)
pnpm add posthog-react-native
```

See Phase 9 for COPPA-safe configuration and web event parity plan.

---

### Phase 1: Core Coloring Experience (Week 1-2) ✅ COMPLETE

**Goal:** Match web coloring quality on mobile

| Feature                   | Priority | Complexity | Status  | Implementation                                     |
| ------------------------- | -------- | ---------- | ------- | -------------------------------------------------- |
| Fill tool with Skia       | P0       | High       | ✅ Done | `utils/floodFill.ts` - scanline algorithm          |
| Undo/Redo stack           | P0       | Medium     | ✅ Done | `stores/canvasStore.ts` - history array with index |
| Brush textures            | P0       | Medium     | ✅ Done | `utils/brushShaders.ts` - Crayon/Marker/Pencil     |
| Color palette upgrade     | P0       | Low        | ✅ Done | `constants/Colors.ts` - 21 colors + skin tones     |
| Zoom/Pan gestures         | P0       | Medium     | ✅ Done | `ImageCanvas.tsx` - pinch/pan/double-tap reset     |
| Auto-save to AsyncStorage | P0       | Low        | ✅ Done | `utils/canvasPersistence.ts` - 2s debounce         |

**Technical Implementation:**

- `@shopify/react-native-skia` for canvas rendering
- Flood fill via scanline algorithm with color tolerance
- `react-native-gesture-handler` Gesture API for touch
- `react-native-reanimated` for smooth zoom/pan animations
- Zustand store for state management (replaced React Context)
- AsyncStorage persistence with path serialization

**Files Created:**

- `stores/canvasStore.ts` - Zustand store (tools, colors, history, zoom/pan)
- `utils/floodFill.ts` - Scanline flood fill algorithm
- `utils/brushShaders.ts` - Brush texture effects
- `utils/canvasPersistence.ts` - Save/load to AsyncStorage
- `components/CanvasToolbar/CanvasToolbar.tsx` - Tool selection UI

### Phase 2: Effects & Enhancements (Week 2-3) ✅ COMPLETE

**Goal:** Delight features that differentiate

| Feature         | Priority | Complexity | Status  | Implementation                                                                        |
| --------------- | -------- | ---------- | ------- | ------------------------------------------------------------------------------------- |
| Pattern fills   | P1       | Medium     | ✅ Done | `utils/patternUtils.ts` - 6 patterns (dots, stripes, hearts, stars, zigzag, confetti) |
| Stickers/stamps | P1       | Medium     | ✅ Done | `stores/canvasStore.ts` - 6 categories, 72 emojis                                     |
| Glitter effect  | P1       | High       | ✅ Done | `utils/glitterUtils.ts` - Particle system with 4-point stars                          |
| Rainbow brush   | P1       | Medium     | ✅ Done | `stores/canvasStore.ts` - Hue cycling (HSL color space)                               |
| Glow effect     | P1       | Medium     | ✅ Done | `utils/brushShaders.ts` - Blur + Screen blend mode                                    |
| Neon effect     | P1       | Medium     | ✅ Done | `utils/brushShaders.ts` - Outer blur + Screen blend                                   |
| Haptic feedback | P1       | Low        | ✅ Done | `utils/haptics.ts` - Expo Haptics (tap/impact/notify)                                 |
| Sound effects   | P2       | Low        | ✅ Done | `utils/soundEffects.ts` - Expo Audio infrastructure                                   |

**Technical Implementation:**

- Skia shaders for brush effects (glow, neon via MaskFilter blur)
- Skia ContourMeasureIter for glitter particle placement along paths
- Expo Haptics for tactile feedback on tool select, stamps, undo/redo
- Expo Audio (`expo-audio`) for sound effects infrastructure
- Pattern fills using Skia Path drawing with mathematical patterns
- Stickers rendered with Skia Text using system emoji font

**Files Created:**

- `utils/patternUtils.ts` - Pattern generation (dots, stripes, hearts, stars,
  zigzag, confetti)
- `utils/glitterUtils.ts` - Glitter particle generation and sparkle path
  creation
- `utils/haptics.ts` - Haptic feedback utilities (tapLight, tapMedium, impact,
  notify)
- `utils/soundEffects.ts` - Sound effects infrastructure with Expo Audio

**Files Modified:**

- `stores/canvasStore.ts` - Added rainbow hue cycling, sticker categories (72
  emojis), pattern/fill types
- `utils/brushShaders.ts` - Added rainbow, glow, neon, glitter brush effects
- `components/ImageCanvas/ImageCanvas.tsx` - Sticker rendering, glitter
  particles, pattern fills
- `components/CanvasToolbar/CanvasToolbar.tsx` - UI for all new tools and
  options
- `utils/canvasPersistence.ts` - Extended serialization for stickers and
  patterns

### Phase 3: Magic Features (Week 3-4)

**Goal:** AI-powered assistance

| Feature                    | Priority | Complexity | Notes                          |
| -------------------------- | -------- | ---------- | ------------------------------ | ------------------------------------ |
| Magic Color suggestions    | P1       | Medium     | Uses pre-computed colorMapJson |
| Auto-Color entire image    | P1       | Medium     | One-tap fill all regions       |
| Voice input for generation | P2       | High       | ✅ Done                        | Expo Speech for voice-to-text        |
| Photo-to-Coloring          | P2       | Medium     | ✅ Done                        | Expo ImagePicker + AI image-to-image |

**Technical Approach:**

- Leverage existing `colorMapJson` from image generation
- No runtime AI calls for magic color (pre-computed)
- Server-side AI for generation (same as web)

**Phase 3 Implementation Summary:**

The Magic Features phase is **COMPLETE**. Here's what was implemented:

**Magic Tool Modes:**

1. **Suggest Mode** ("Magic" button) - Tap any area to see AI color suggestions
   - Shows popup with suggested color name, hex value, and reasoning
   - Uses pre-computed 5x5 grid color map from `colorMapJson`
   - "Use Color" button applies suggestion to fill tool
   - Animated popup with smooth transitions

2. **Auto-Color Mode** ("Auto" button) - One-tap fills entire image
   - Iterates through all 25 grid cells
   - Applies each cell's suggested color at center point
   - Creates single undo action for all fills
   - No AI calls at runtime (uses pre-computed data)

**Files Modified/Created:**

- `components/MagicColorHint/MagicColorHint.tsx` - Animated popup component
- `components/ImageCanvas/ImageCanvas.tsx` - Magic tool integration, tap
  handling
- `stores/canvasStore.ts` - Magic mode state, magic-fill action type
- `utils/magicColorUtils.ts` - Grid coordinate mapping, color lookup utilities
- `utils/canvasPersistence.ts` - Serialization support for magic-fill actions
- `components/CanvasToolbar/CanvasToolbar.tsx` - Magic/Auto toggle buttons

**Key Design Decisions:**

- Pre-computed color map avoids latency (instant suggestions)
- Two-mode approach: explore (suggest) vs quick (auto)
- Mobile-friendly popup positioning
- Full persistence support for magic-fill actions

**Photo-to-Coloring Feature:**

Kids can take a photo of ANYTHING (bugs, flowers, toys, pets) and the app
transforms it into a coloring page. This bypasses the description step entirely
for a faster, more magical experience.

**How It Works:**

1. User taps camera button → opens camera/gallery picker
2. Photo captured as base64 → sent to `/api/mobile/photo-to-coloring`
3. AI uses photo as composition reference + reference images for style
4. Returns completed coloring page → user navigates directly to result

**Files Created/Modified:**

- `apps/mobile/components/PhotoCaptureButton/PhotoCaptureButton.tsx` -
  Camera/gallery picker with processing state
- `apps/mobile/components/PhotoCaptureButton/index.ts` - Component export
- `apps/mobile/api.ts` - Added `generateFromPhoto()` API function
- `apps/mobile/components/forms/CreateColoringImageForm/CreateColoringImageForm.tsx` -
  Integration with direct navigation

**Backend Pipeline (Web App):**

- `apps/web/app/api/mobile/photo-to-coloring/route.ts` - REST endpoint for
  mobile
- `apps/web/app/actions/photo-to-coloring.ts` - Server action with full pipeline
- `apps/web/lib/ai/image-providers.ts` - `generateColoringPageFromPhoto()`
  function
- `apps/web/lib/ai/prompts.ts` - `createPhotoToColoringPrompt()` with all 25
  coloring rules

**Technical Implementation:**

- Uses Gemini's multimodal `generateText` API with
  `responseModalities: ['TEXT', 'IMAGE']`
- User's photo = scene/composition reference
- App's reference images = style guide (thick outlines, no fill, child-friendly)
- All 25 coloring page rules (`COLORING_IMAGE_RULES_TEXT`) applied
- Difficulty-aware generation (BEGINNER, INTERMEDIATE, etc.)
- Full metadata generation, SVG tracing, and QR code in parallel

**Key Design Decisions:**

- Direct image-to-image transformation (no description step)
- Reference images ensure consistent coloring page style
- Same 25 rules as text-to-image generation for quality parity
- Haptic feedback on success/error
- Loading state with spinner during processing

**Voice Input Feature:**

Kids can speak their coloring page ideas instead of typing. Perfect for younger
children who can't type yet or for hands-free input.

**How It Works:**

1. User taps microphone button → starts listening with pulse animation
2. Real-time partial transcription displayed while speaking
3. Final transcript appended to description field
4. Haptic feedback on start/stop

**Files Created:**

- `apps/mobile/components/VoiceInputButton/VoiceInputButton.tsx` - Voice
  recording component
- `apps/mobile/components/VoiceInputButton/index.ts` - Component export

**Technical Implementation:**

- Uses `@jamsch/expo-speech-recognition` for native speech recognition
- Real-time partial results with `interimResults: true`
- Animated pulse effect using `react-native-reanimated`
- Permission handling with `requestPermissionsAsync()`
- Haptic feedback on recording start/stop
- Graceful error handling with user feedback

**Key Design Decisions:**

- Pulse animation provides visual feedback that mic is active
- Partial transcription shows kids their words are being heard
- Appends to existing text (doesn't replace)
- Automatic stop on speech end

### Phase 4: Navigation & UI Feature Parity (Week 4)

**Goal:** Bring web navigation patterns to mobile for consistent UX

This phase establishes the navigation foundation needed for retention mechanics
(Phase 5) and authentication (Phase 6).

#### Current State Analysis

**Web Navigation (Always-Visible Kid-Facing Elements):** | Element | Location |
Purpose | |---------|----------|---------| | Challenge Indicator | Header |
Weekly progress ring + reward badge | | Colo Indicator | Header | Evolution
stage + progress | | Sticker Indicator | Header | Unlocked count + "NEW" badge |
| Profile Switcher | Header | Switch between profiles (max 10) | | Credits
Display | Header dropdown | Purchase currency display |

**Web Dropdown (Parent-Gated):**

- Billing, Settings, Support, Sign Out

**Mobile Current State:**

- 3 Tabs: Home, My Artwork, Settings
- No header elements for gamification
- Settings: Just basic links (no actual account features)
- Missing: Challenges, Stickers, Profile switching, Credits, Language/Audio
  settings

#### Proposed Mobile Architecture

##### Header Bar (Always Visible)

```
┌─────────────────────────────────────────────────┐
│ 🪙 42  │ 🏆(ring) │ 📒(count) │ [Avatar ▼]     │
│ Credits│ Challenge│ Stickers  │ Profile Switch  │
└─────────────────────────────────────────────────┘
```

- Tapping each indicator navigates to full screen
- Profile dropdown allows quick switching between child profiles
- Credits badge shows current balance

##### Tab Structure (5 Tabs)

```
┌─────┬─────────┬──────────┬────────────┬──────────┐
│ 🏠  │   🎨    │    🏆    │     📒     │    ⚙️    │
│Home │My Art   │Challenges│  Stickers  │ Settings │
└─────┴─────────┴──────────┴────────────┴──────────┘
```

**Rationale:**

- **Challenges & Stickers as tabs** - Key engagement features for kids, always 1
  tap away
- **5 tabs is manageable** - Apple's tab bar handles 5 well, kids learn icons
  quickly
- **Colo stays on Home** - Mascot remains the home screen's hero element
- **My Art consolidates** - Saved artworks in one place

##### Settings Page (Match Web)

```
Settings Screen:
├── Account Section
│   ├── Manage Profiles (parental gate) → Profile management screen
│   └── Subscription/Credits (parental gate) → Billing/purchase screen
├── Preferences Section
│   ├── Language → Language picker (matches web)
│   └── Audio/Sound → Sound effects + ambient audio toggles
├── Support Section
│   ├── Help & FAQ → External link
│   └── Contact Us → mailto: support
│   └── Rate the App → App Store/Play Store
├── Legal Section
│   ├── Privacy Policy → External link
│   └── Terms of Service → External link
└── App Info
    └── Version + "Made with 🖍️ for creative kids"
```

#### Implementation Tasks

| Task                             | Priority | Complexity | Notes                                  |
| -------------------------------- | -------- | ---------- | -------------------------------------- |
| Add Challenges tab               | P0       | Medium     | New tab + screen skeleton              |
| Add Stickers tab                 | P0       | Medium     | New tab + screen skeleton              |
| Header component with indicators | P0       | High       | Credits, Challenge ring, Sticker count |
| Profile switcher in header       | P1       | High       | Dropdown with avatar list              |
| Settings page overhaul           | P0       | Medium     | Match web structure                    |
| Language settings                | P1       | Medium     | Picker + AsyncStorage                  |
| Audio settings                   | P1       | Low        | Toggle switches                        |
| Parental gate component          | P1       | Medium     | Reusable gate for sensitive actions    |

#### Technical Approach

**Header Component:**

```typescript
// apps/mobile/src/components/Header/Header.tsx
- Fixed position header across all tab screens
- Uses Expo Router's Stack.Screen options for custom header
- Contains: CreditsIndicator, ChallengeIndicator, StickerIndicator, ProfileSwitcher
- Each indicator is tappable → navigates to respective screen
```

**Tab Configuration:**

```typescript
// apps/mobile/app/(tabs)/_layout.tsx
// Expand from 3 to 5 tabs:
// - index (Home)
// - my-artwork
// - challenges (NEW)
// - stickers (NEW)
// - settings
```

**Settings Structure:**

```typescript
// apps/mobile/app/(tabs)/settings.tsx
// Refactor to use sections matching web:
// - Account section (with parental gates)
// - Preferences section (language, audio)
// - Support section
// - Legal section
// - App info
```

#### Dependencies

- Requires Colo context (already exists)
- Will need Credits context (from Phase 6)
- Profile data (from Phase 6 auth)
- For now, show placeholder/demo data for credits and profiles

#### Success Criteria

- [ ] 5-tab navigation working smoothly
- [ ] Header shows all indicators (can be placeholder data)
- [ ] Settings page matches web structure
- [ ] Parental gate blocks sensitive settings
- [ ] Tapping header indicators navigates correctly
- [ ] Profile switcher shows current profile (placeholder until auth)

---

### Phase 4B: iPad Optimization - "Made for iPad" Experience

**Goal:** Create a premium iPad experience that feels purpose-built, not
scaled-up phone UI

> **Philosophy:** iPad is the hero device. Kids ages 3-8 primarily use iPads for
> creative apps. The phone experience should be good, but iPad should feel like
> the app was designed for it first.

#### Three-Panel Layout (Matching Web Architecture)

The web coloring page uses a three-panel layout at xl+ breakpoints (1280px+).
iPad should mirror this:

```
┌──────────────────────────────────────────────────────────────┐
│  Header: Title, Progress Indicator, Mute Toggle              │
├────────────┬───────────────────────────────┬─────────────────┤
│            │                               │                 │
│  Colors    │        Canvas                 │     Tools       │
│  Palette   │        (Drawing Area)         │     Sidebar     │
│            │                               │                 │
│  4-column  │   ┌───────────────────────┐   │  • Brushes      │
│  grid      │   │                       │   │  • Magic Tools  │
│            │   │    Coloring Image     │   │  • Brush Size   │
│  32 colors │   │                       │   │  • Undo/Redo    │
│            │   │                       │   │  • Zoom         │
│  Disables  │   └───────────────────────┘   │  • Actions      │
│  for magic │                               │    - Start Over │
│  tools     │                               │    - Save       │
│            │                               │    - Share      │
│            │                               │    - Download   │
└────────────┴───────────────────────────────┴─────────────────┘
```

**Responsive Breakpoints (React Native):**

```typescript
// hooks/useDeviceLayout.ts
import { useWindowDimensions, Platform } from 'react-native';

export type LayoutMode = 'phone' | 'tablet-portrait' | 'tablet-landscape';

export const useDeviceLayout = () => {
  const { width, height } = useWindowDimensions();
  const isTablet =
    Platform.isPad ||
    (Platform.OS === 'android' && Math.min(width, height) >= 600);
  const isLandscape = width > height;

  const layoutMode: LayoutMode = !isTablet
    ? 'phone'
    : isLandscape
      ? 'tablet-landscape'
      : 'tablet-portrait';

  // Panel widths matching web
  const sidebarWidth = width >= 1400 ? 220 : width >= 1200 ? 200 : 180;

  const canvasMaxWidth =
    width >= 1800 ? 1100 : width >= 1600 ? 1000 : width >= 1400 ? 900 : 800;

  return {
    layoutMode,
    isTablet,
    isLandscape,
    sidebarWidth,
    canvasMaxWidth,
    showSidePanels: layoutMode === 'tablet-landscape',
    showBottomToolbar: layoutMode !== 'tablet-landscape',
    dimensions: { width, height },
  };
};
```

**Layout Component Structure:**

```typescript
// ColoringScreen layout for iPad landscape
const ColoringScreen = () => {
  const { layoutMode, showSidePanels, sidebarWidth } = useDeviceLayout();

  if (showSidePanels) {
    // iPad landscape: three-panel layout
    return (
      <View style={styles.container}>
        <View style={[styles.sidebar, { width: sidebarWidth }]}>
          <ColorPalette variant="sidebar" />
        </View>

        <View style={styles.canvasArea}>
          <ProgressIndicator />
          <Canvas />
        </View>

        <View style={[styles.sidebar, { width: sidebarWidth }]}>
          <ToolsSidebar />
        </View>
      </View>
    );
  }

  // Phone/tablet portrait: standard layout with bottom toolbar
  return (
    <View style={styles.container}>
      <Canvas />
      <BottomToolbar />
    </View>
  );
};
```

#### Apple Pencil Integration

**Priority Features:** | Feature | Priority | Complexity | Notes |
|---------|----------|------------|-------| | Pressure sensitivity | P0 | Medium
| Variable stroke width/opacity | | Tilt detection | P1 | Medium | Shading
effects, brush angle | | Palm rejection | P0 | Low | Native with
react-native-skia | | Double-tap gesture | P2 | Low | Quick tool switch (eraser
toggle) | | Hover preview | P2 | Medium | iPadOS 16+ feature |

**Technical Implementation:**

```typescript
// Using react-native-skia for Apple Pencil
import { Canvas, Path, useCanvasRef } from '@shopify/react-native-skia';

const ColoringCanvas = () => {
  const canvasRef = useCanvasRef();

  const handleTouch = useCallback((event: GestureEvent) => {
    const { force, altitudeAngle, azimuthAngle } = event;

    // Pressure: 0-1, affects stroke width
    const pressure = force ?? 0.5;
    const strokeWidth = BASE_STROKE * (0.5 + pressure * 0.5);

    // Tilt: affects brush shape for pencil/crayon effects
    const tiltAngle = altitudeAngle ?? Math.PI / 2;
    const brushEllipse = calculateBrushShape(tiltAngle, azimuthAngle);

    // Apply to current stroke
    currentPath.setStrokeWidth(strokeWidth);
    if (activeTool === 'crayon') {
      applyTiltEffect(currentPath, brushEllipse);
    }
  }, [activeTool]);

  return (
    <Canvas ref={canvasRef} style={styles.canvas}>
      {/* Drawing layers */}
    </Canvas>
  );
};
```

#### Keyboard Shortcuts (Bluetooth Keyboards)

Many kids/parents use iPads with keyboard cases. Support standard shortcuts:

| Shortcut     | Action             | Notes                   |
| ------------ | ------------------ | ----------------------- |
| ⌘Z           | Undo               | Standard                |
| ⌘⇧Z          | Redo               | Standard                |
| ⌘S           | Save artwork       | Parental gate if needed |
| ⌘+ / ⌘-      | Zoom in/out        | Canvas zoom             |
| ⌘0           | Fit to screen      | Reset zoom              |
| E            | Eraser toggle      | Quick switch            |
| B            | Brush/crayon       | Return to drawing       |
| 1-9          | Color quick select | First 9 palette colors  |
| [ / ]        | Brush size down/up | Adjust stroke width     |
| Space + drag | Pan canvas         | When zoomed             |

**Implementation:**

```typescript
// hooks/useKeyboardShortcuts.ts
import { useEffect } from 'react';
import { Platform, Keyboard } from 'react-native';

export const useKeyboardShortcuts = (handlers: ShortcutHandlers) => {
  useEffect(() => {
    if (Platform.OS !== 'ios') return;

    const subscription = Keyboard.addListener('keyboardDidShow', () => {
      // Register shortcuts via UIKeyCommand (native module needed)
    });

    return () => subscription.remove();
  }, [handlers]);
};

// Native module: ios/KeyboardShortcuts.swift
// Exposes UIKeyCommand for hardware keyboard support
```

#### Split View & Multitasking Support

iPadOS multitasking modes to support:

| Mode               | Screen Share | Support Level | Notes                          |
| ------------------ | ------------ | ------------- | ------------------------------ |
| Full screen        | 100%         | Full          | Primary mode                   |
| Split View (50/50) | 50%          | Partial       | Collapse to phone layout       |
| Split View (66/33) | 66% or 33%   | Partial       | Use phone layout for 33%       |
| Slide Over         | ~320px       | Minimal       | Phone layout, limited features |
| Stage Manager      | Varies       | Full          | Treat as resizable window      |

**Responsive Behavior:**

```typescript
// Handle window resize for Split View / Stage Manager
const useAdaptiveLayout = () => {
  const { width, height } = useWindowDimensions();

  // Split View detection: iPad full width is ~1024-1366px
  // If significantly narrower, we're in split view
  const screenWidth = Dimensions.get('screen').width;
  const isSplitView = width < screenWidth * 0.9;

  // Force phone layout in narrow split views
  const effectiveLayout =
    width < 500
      ? 'phone' // Slide Over or 33% split
      : width < 700
        ? 'tablet-portrait' // 50% split
        : 'tablet-landscape'; // Full or 66%+ split

  return { effectiveLayout, isSplitView };
};
```

#### Orientation Handling

**Preferred: Landscape for coloring (maximum canvas space)**

```typescript
// app.json / app.config.ts
{
  "expo": {
    "ios": {
      "requireFullScreen": false,  // Allow Split View
      "supportsTablet": true,
      "userInterfaceStyle": "automatic"
    },
    "orientation": "default"  // Allow both, but optimize for landscape
  }
}
```

**Layout Adaptations by Orientation:**

| Orientation      | Layout                         | Notes                  |
| ---------------- | ------------------------------ | ---------------------- |
| iPad Landscape   | Three-panel (sidebars visible) | Primary/optimal layout |
| iPad Portrait    | Single column + bottom toolbar | Collapsible tools      |
| iPhone Landscape | Single column, expanded canvas | Hide non-essential UI  |
| iPhone Portrait  | Single column + bottom toolbar | Default phone layout   |

#### iPad-Specific UI Enhancements

1. **Larger Touch Targets**
   - Minimum 48pt (vs 44pt on phone) for toolbar buttons
   - Sidebar buttons: 64pt for comfortable side-panel interaction
   - Color swatches: 40pt in sidebar grid (vs 32pt on phone)

2. **Pointer/Cursor Support**
   - Hover states for trackpad/mouse users
   - Cursor changes (crosshair for drawing, pointer for buttons)
   - Right-click context menu for power users

3. **Canvas Gestures**
   - Two-finger pinch: Zoom canvas
   - Two-finger pan: Move canvas (when zoomed)
   - Two-finger rotate: Rotate canvas (optional, can disable)
   - Three-finger swipe: Undo/redo (system gesture)

4. **Visual Polish**
   - Subtle shadows on sidebars (depth hierarchy)
   - Smooth spring animations for panel transitions
   - Larger, more detailed tool icons in sidebars
   - Mini canvas preview in sidebar when using fill/magic tools

#### Implementation Priority

| Feature                      | Priority | Complexity | Phase  |
| ---------------------------- | -------- | ---------- | ------ |
| Device layout detection hook | P0       | Low        | 4B-1   |
| Three-panel layout component | P0       | Medium     | 4B-1   |
| Sidebar color palette        | P0       | Low        | 4B-1   |
| Sidebar tools panel          | P0       | Medium     | 4B-2   |
| Apple Pencil pressure        | P0       | Medium     | 4B-2   |
| Orientation handling         | P1       | Low        | 4B-2   |
| Keyboard shortcuts (basic)   | P1       | Medium     | 4B-3   |
| Split View support           | P1       | Low        | 4B-3   |
| Apple Pencil tilt            | P2       | Medium     | Future |
| Pointer/hover states         | P2       | Low        | Future |
| Stage Manager polish         | P2       | Medium     | Future |

#### Success Criteria

- [ ] iPad landscape shows three-panel layout (colors | canvas | tools)
- [ ] Sidebars scale appropriately (180-220px based on screen width)
- [ ] Canvas maximizes available space between sidebars
- [ ] Apple Pencil pressure affects stroke width
- [ ] Palm rejection works (no accidental touches while drawing)
- [ ] App works in Split View without crashing
- [ ] Orientation changes animate smoothly
- [ ] Layout feels intentional, not "phone app stretched"

#### Testing Devices

Test on range of iPad sizes:

- iPad mini (8.3") - smallest tablet, may use portrait more
- iPad (10.2") - common for kids, budget option
- iPad Air (10.9") - mid-range, popular choice
- iPad Pro 11" - power users
- iPad Pro 12.9" - maximum screen real estate

---

### Phase 5: Retention Mechanics (Week 5-6)

**Goal:** Keep kids coming back

| Feature               | Priority | Complexity | Notes                       |
| --------------------- | -------- | ---------- | --------------------------- |
| Sticker album         | P0       | Medium     | 24 collectible achievements |
| Colo evolution        | P0       | Medium     | 6 stages based on progress  |
| Weekly challenges     | P1       | Medium     | Theme-based goals           |
| Streak tracking       | P1       | Low        | Daily usage rewards         |
| Confetti celebrations | P1       | Low        | Lottie animations           |
| Push notifications    | P2       | Medium     | Expo Notifications          |

**Technical Approach:**

- Port web retention logic to mobile
- AsyncStorage for local progress tracking
- Sync to database when signed in
- Expo Notifications for push

### Phase 6: Onboarding & Auth (Week 6-7)

**Goal:** Frictionless entry, optional account

| Feature             | Priority | Complexity | Notes                           |
| ------------------- | -------- | ---------- | ------------------------------- |
| Onboarding carousel | P0       | Low        | 3-4 screens explaining value    |
| Guest mode          | P0       | Low        | Immediate access, local storage |
| Apple Sign In       | P0       | Medium     | Required for iOS                |
| Google Sign In      | P1       | Medium     | Android primary                 |
| Account linking     | P1       | High       | Merge guest data with account   |
| Subscription sync   | P1       | Medium     | Pull entitlements from database |

**Onboarding Flow:**

```
1. Launch → Carousel (3 slides)
   - "Create any coloring page with AI"
   - "Color with magic brushes and effects"
   - "Collect stickers and evolve Colo"

2. Skip/Continue → Home Screen (Gallery)
   - No signup required
   - Guest device ID created silently

3. First generation → Credit check
   - Free credits for guests (5 generations)
   - Prompt to sign in or subscribe when depleted

4. Sign In (when needed)
   - Apple/Google OAuth
   - Merge local artwork to account
   - Sync subscription from database
```

### Phase 7: Payments (Week 7-8)

**Goal:** RevenueCat integration with database sync

| Feature                    | Priority | Complexity | Notes                      |
| -------------------------- | -------- | ---------- | -------------------------- |
| RevenueCat SDK setup       | P0       | Medium     | iOS/Android products       |
| Subscription purchase flow | P0       | High       | IAP implementation         |
| Restore purchases          | P0       | Medium     | Required by App Store      |
| Webhook to database        | P0       | High       | Update subscription status |
| Entitlement checking       | P0       | Medium     | Read from database         |
| Family sharing             | P2       | High       | iOS Family Sharing support |

**RevenueCat + Database Flow:**

```
1. User taps Subscribe
2. RevenueCat presents native paywall
3. Apple/Google processes payment
4. RevenueCat sends webhook to our server
5. Server updates database (subscription table)
6. Mobile app queries database for entitlements
7. User sees premium features unlocked
```

**Existing Stripe Products (mirror in RevenueCat):**

| Plan    | Product ID            | Monthly | Yearly  | Credits            |
| ------- | --------------------- | ------- | ------- | ------------------ |
| Splash  | `prod_Teu88OhgAhqYSc` | £7.99   | £79.99  | 250/mo             |
| Rainbow | `prod_Teu8zkMl2vgqVX` | £13.99  | £139.99 | 500/mo + rollover  |
| Sparkle | `prod_Teu8cgoaosCRPL` | £24.99  | £249.99 | 1000/mo + rollover |

**App Store Free Trial:**

- **7-day free trial** for all subscription tiers (App Store only)
- Research shows 7-day trials increase conversion 30-60% for kids apps
- Trial configured in App Store Connect, not RevenueCat
- Database tracks trial status via webhook events

**One-time Credit Packs:**

| Pack         | Product ID            | Price  | Credits |
| ------------ | --------------------- | ------ | ------- |
| 100 Credits  | `prod_Teu7WGybW0FCBn` | £3.00  | 100     |
| 500 Credits  | `prod_Teu74V6vhSUVXO` | £12.00 | 500     |
| 1000 Credits | `prod_Teu7BngxNJzEMt` | TBD    | 1000    |

**RevenueCat Product IDs (to create):**

- `splash_monthly_v1`, `splash_yearly_v1`
- `rainbow_monthly_v1`, `rainbow_yearly_v1`
- `sparkle_monthly_v1`, `sparkle_yearly_v1`
- `credits_100_v1`, `credits_500_v1`, `credits_1000_v1`

**Note:** Use versioned product IDs (`_v1`) to allow future product updates
without App Store rejections.

**Note:** Match App Store/Play Store pricing tiers to Stripe prices. Consider
£3.99/mo unlimited tier for pricing experiment.

### Phase 8: Polish & Launch Prep (Week 8-9)

| Feature                  | Priority | Complexity | Notes                      |
| ------------------------ | -------- | ---------- | -------------------------- |
| iPad layout optimization | P0       | Medium     | Split view, larger tools   |
| Performance optimization | P0       | High       | 60fps on all devices       |
| Offline mode             | P1       | Medium     | Cache images, queue syncs  |
| Accessibility            | P1       | Medium     | VoiceOver, Dynamic Type    |
| App Store assets         | P0       | Low        | Screenshots, preview video |
| App Store listing        | P0       | Low        | Description, keywords      |
| TestFlight beta          | P0       | Low        | Internal testing           |

### Phase 9: Analytics Integration - PostHog (Post-Approval)

**Goal:** Achieve parity with web analytics for mobile insights

**Why deferred:** Apple Kids Category apps face extra scrutiny for analytics
SDKs. Firebase Analytics causes immediate rejection. PostHog is safer but best
added after initial approval to avoid delays.

**Interim solution:** Use `expo-insights` (already installed) for basic metrics
during beta/launch.

#### PostHog Integration Strategy

| Feature           | Priority | Complexity | Notes                        |
| ----------------- | -------- | ---------- | ---------------------------- |
| PostHog SDK setup | P0       | Low        | COPPA-safe config            |
| Screen tracking   | P0       | Low        | Match web page views         |
| Event tracking    | P0       | Medium     | Port web events              |
| Feature flags     | P1       | Low        | A/B testing                  |
| Session replay    | P2       | Medium     | Debugging (disable for kids) |

#### COPPA-Safe PostHog Configuration

```typescript
// lib/posthog.ts
import PostHog from 'posthog-react-native';

export const initPostHog = async () => {
  await PostHog.initAsync(process.env.EXPO_PUBLIC_POSTHOG_KEY!, {
    host: 'https://eu.i.posthog.com', // EU for GDPR

    // COPPA compliance settings
    defaultOptIn: false, // Opt-out by default
    persistence: 'memory', // No persistent storage
    sendFeatureFlagEvent: false, // Reduce data collection

    // Capture settings
    captureScreens: true, // Aggregate screen views
    captureAppLifecycleEvents: true,

    // Disable PII collection
    autocapture: {
      captureTextContent: false, // Don't capture text (kid names)
      propsToCapture: ['testID'], // Only capture test IDs
    },
  });
};

// NEVER call posthog.identify() - anonymous only
// Use cookieless server-side hashing for user counts
```

#### Events to Port from Web

Mirror these web events for mobile analytics parity:

**Generation Events:**

```typescript
posthog.capture('generation_started', { method: 'text' | 'voice' | 'image' });
posthog.capture('generation_completed', { imageId, duration_ms });
posthog.capture('generation_failed', { error_type });
```

**Coloring Events:**

```typescript
posthog.capture('coloring_session_started', { imageId });
posthog.capture('tool_selected', { tool: 'crayon' | 'marker' | 'fill' | ... });
posthog.capture('magic_color_used', { imageId });
posthog.capture('auto_color_used', { imageId });
posthog.capture('artwork_saved', { imageId });
posthog.capture('artwork_shared', { method: 'save' | 'print' | 'share' });
```

**Retention Events:**

```typescript
posthog.capture('sticker_unlocked', { stickerId });
posthog.capture('colo_evolved', { stage: 1 - 6 });
posthog.capture('challenge_completed', { challengeId });
posthog.capture('streak_continued', { days });
```

**Subscription Events:**

```typescript
posthog.capture('paywall_viewed', { trigger });
posthog.capture('subscription_started', { plan, source: 'mobile' });
posthog.capture('subscription_cancelled', { reason });
```

#### Dashboard Sync

Once PostHog is integrated, create mobile-specific dashboards:

- **Mobile Overview:** DAU/MAU, session duration, retention
- **Mobile Funnel:** Onboard → First color → First generation → Subscribe
- **Mobile vs Web:** Compare conversion rates, engagement metrics
- **Feature Usage:** Tool popularity, effect usage, magic color adoption

#### Timeline

| Milestone          | Target                        |
| ------------------ | ----------------------------- |
| App Store approval | Week 8                        |
| PostHog SDK added  | Week 9 (post-approval update) |
| Web event parity   | Week 10                       |
| Mobile dashboards  | Week 10                       |

---

## API Endpoints Required

New endpoints to wrap server actions for mobile:

```typescript
// Authentication
POST /api/mobile/auth/device-register
POST /api/mobile/auth/login
POST /api/mobile/auth/refresh
POST /api/mobile/auth/logout

// Coloring Images
GET  /api/mobile/coloring-images
GET  /api/mobile/coloring-images/:id
POST /api/mobile/coloring-images/generate

// Artwork
GET  /api/mobile/artworks
GET  /api/mobile/artworks/:id
POST /api/mobile/artworks
PUT  /api/mobile/artworks/:id
DELETE /api/mobile/artworks/:id

// User
GET  /api/mobile/user/profile
PUT  /api/mobile/user/profile
GET  /api/mobile/user/subscription
GET  /api/mobile/user/credits

// Retention
GET  /api/mobile/stickers
POST /api/mobile/stickers/unlock
GET  /api/mobile/challenges
POST /api/mobile/challenges/:id/complete
GET  /api/mobile/colo-evolution

// Webhooks (server-to-server)
POST /api/webhooks/revenuecat
```

---

## Kids Experience (Ages 3-8) - Critical Design Principles

The target audience is **children ages 3-8**. This fundamentally shapes every
design decision:

### Haptic Feedback (Must-Have)

Every interaction should feel alive:

| Action             | Haptic Type          | Purpose             |
| ------------------ | -------------------- | ------------------- |
| Tool selection     | Light impact         | Confirmation        |
| Color pick         | Light impact         | Confirmation        |
| Stamp placed       | Medium impact        | Satisfying feedback |
| Fill complete      | Success notification | Achievement feel    |
| Sticker unlocked   | Heavy + pattern      | Celebration         |
| Challenge complete | Heavy + pattern      | Big celebration     |
| Undo/redo          | Soft impact          | Gentle feedback     |
| Zoom gesture       | Selection tick       | Precision feel      |

### Sound Effects (Must-Have)

Audio reinforces actions and creates delight:

| Action             | Sound          | Notes                    |
| ------------------ | -------------- | ------------------------ |
| Tool switch        | Soft pop/click | Distinct per tool        |
| Color pick         | Gentle blip    | Pitch varies by color    |
| Crayon stroke      | Paper scratch  | Continuous while drawing |
| Marker stroke      | Smooth glide   | Different from crayon    |
| Fill pour          | Liquid splash  | Satisfying completion    |
| Stamp placed       | Playful pop    | Fun and bouncy           |
| Sticker unlock     | Magical chime  | Reward sound             |
| Challenge complete | Fanfare        | Big celebration          |
| Colo evolution     | Level-up sound | Major milestone          |
| Button press       | Soft click     | Universal feedback       |
| Error/blocked      | Gentle bonk    | Non-scary feedback       |

**Audio Toggle:** Parents must be able to mute all sounds. Default ON for
engagement.

### Animations (Must-Have)

Movement creates joy and guides attention:

| Element            | Animation          | Implementation      |
| ------------------ | ------------------ | ------------------- |
| Tool icons         | Bounce on select   | Reanimated spring   |
| Color swatches     | Scale pulse        | Reanimated          |
| Sticker placement  | Pop + wiggle       | Lottie              |
| Achievement unlock | Confetti burst     | Lottie              |
| Colo mascot        | Idle animation     | Lottie              |
| Colo evolution     | Transform sequence | Lottie              |
| Challenge progress | Fill animation     | Reanimated          |
| Button press       | Scale down/up      | Reanimated          |
| Onboarding         | Carousel slides    | Reanimated Carousel |
| Loading states     | Colo bouncing      | Lottie              |
| Success states     | Stars/sparkles     | Lottie              |

### Touch Targets

Large touch targets for small fingers:

- **Minimum touch target:** 48x48dp (Apple HIG for accessibility)
- **Recommended for kids:** 64x64dp or larger
- **Color palette:** Large swatches, easy to hit
- **Tools:** Big icons with generous padding
- **Buttons:** Full-width on mobile, large text

### Visual Design

- **Bright, saturated colors** - Kids respond to vibrant palettes
- **Rounded corners everywhere** - Soft, friendly feel
- **Large typography** - Easy to read, playful fonts
- **Minimal text** - Icons and images over words
- **Clear visual hierarchy** - What to tap is obvious
- **No small/hidden controls** - Everything discoverable

---

## 2025 Industry Research: Best-in-Class Coloring Apps

_Research conducted December 2024 - insights from award-winning apps and
platform guidelines_

### Award-Winning Coloring Apps to Study

| App                    | Recognition                  | Key Learnings                                                      |
| ---------------------- | ---------------------------- | ------------------------------------------------------------------ |
| **Lake**               | Apple Design Award 2025      | Premium curation (50 artists), ASMR sounds, mindfulness focus      |
| **Crayola Adventures** | Apple Inclusivity Award 2025 | Accessibility-first design, diverse characters                     |
| **Tayasui Color**      | App of the Year              | Ultra-minimalist UI, ultra-realistic watercolor brushes            |
| **Pigment**            | Top 10 Coloring App          | Pressure-sensitive coloring like real crayons, 1000+ illustrations |

### Common Patterns from Award Winners

1. **Minimalist UI, Maximum Canvas** - Hide tools until needed, let artwork
   dominate
2. **Premium Sound Design** - ASMR-style brush sounds, satisfying fills,
   celebration sounds
3. **Realistic Brush Physics** - Pressure/tilt sensitivity that mimics real art
   supplies
4. **Curated Content** - Quality over quantity; exclusive artwork from known
   artists
5. **No Aggressive Upselling** - Kids category requires gentle monetization

### Pricing Sweet Spot (2025)

| Tier     | Price Range     | Notes                              |
| -------- | --------------- | ---------------------------------- |
| Entry    | £3.99-5.99/mo   | Unlimited coloring, basic features |
| Standard | £6.99-9.99/mo   | Full features, content library     |
| Premium  | £12.99-19.99/mo | Pro tools, exclusive content       |

**Industry insight:** Credit-based models create anxiety. Unlimited access with
tiered features converts better.

### Design Guidelines Summary

**Touch Targets (Ages 3-8):**

- Apple HIG minimum: 44x44pt
- **Kids apps: 64-75px recommended** (larger for small fingers)
- Spacing between buttons: 64px minimum (prevents accidental taps)

**Typography:**

- **Ages 3-5:** 24pt+ font size minimum
- **Ages 6-8:** 18pt+ acceptable
- Use rounded, friendly fonts (avoid thin weights)

**Accessibility Requirements (Kids Category):**

- Full VoiceOver support for all interactive elements
- Color contrast 4.5:1 minimum (WCAG AA)
- Don't rely on color alone (add icons/labels)
- Support Dynamic Type scaling

**Parental Gate (Required for Kids Category):**

- Math puzzle (e.g., "What is 7 + 5?") before:
  - External links
  - In-app purchases
  - Account access
  - Social features

---

## iPad-First Design Deep Dive

_iPad is the hero device for Chunky Crayon. This section covers iPad-specific
optimizations._

### Apple Pencil Support

**Priority 1: Rock-solid palm rejection**

- When Apple Pencil is connected, iPad ignores finger/hand input automatically
- Test with kids actually resting hands while coloring
- This is the #1 feature for natural coloring experience

**Pressure Sensitivity:**

- Apple Pencil 2: 4,096 pressure levels
- Apple Pencil Pro: 8,192 pressure levels + barrel rotation
- Implementation: Map pressure to line thickness (light = thin, heavy = thick)
- Kids don't need extreme precision - basic pressure variation is sufficient

**Tilt Detection:**

- Creates shading effects like a physical pencil
- Nice-to-have for artistic expression, not critical for coloring

**Apple Pencil Pro Features (2024+):**

- Squeeze gesture: Quick tool/color palette toggle
- Barrel rotation: Brush angle adjustment
- Haptic feedback: Confirm strokes tactilely
- Target older kids (7-8) for these advanced features

**Alternative: Logitech Crayon**

- Cheaper, sturdier option specifically designed for kids
- No pressure sensitivity, but excellent palm rejection
- Many parents buy this instead of Apple Pencil for kids under 10

### Orientation Strategy

**Support Both Orientations:**

- **Landscape:** Larger horizontal canvas, more comfortable for extended
  coloring
- **Portrait:** Natural for younger kids (like holding a picture book)
- Let kids rotate freely; don't lock orientation

**Layout Differences:** | Orientation | Tool Placement | Canvas Size | Best For
| |-------------|---------------|-------------|----------| | Landscape | Side
toolbar | Maximum | Ages 6-8, detailed work | | Portrait | Bottom toolbar |
Taller | Ages 3-5, casual coloring |

### Screen Sizes & Device Targeting

| iPad Model       | Screen   | Target Age | Notes                                         |
| ---------------- | -------- | ---------- | --------------------------------------------- |
| iPad Mini 8.3"   | Compact  | 3-5 years  | Lightweight, easy for small hands             |
| iPad 10.9"       | Standard | 4-7 years  | Budget-friendly, good balance                 |
| iPad Air 11"/13" | Large    | 5-8 years  | **Primary target** - best coloring experience |
| iPad Pro 11"/13" | Premium  | 6-8 years  | M-series for lowest latency                   |

**Optimization Priority:** iPad Air 11" is the sweet spot for our target
audience.

### Multitasking Compatibility

**Split View / Slide Over:**

- Design UI to work in all size classes (regular and compact horizontal)
- When in Split View: prioritize canvas over UI chrome
- Kids 7-8 might use Split View to reference images while coloring

**Stage Manager (iPadOS 16+):**

- Not relevant for kids 3-8 (professional workflow feature)
- Ensure app works in smaller windows (automatic with proper adaptive layout)
- Focus design on full-screen experience

### Accessibility on iPad (Required for Kids Category)

**VoiceOver:**

- All UI elements need `.accessibilityLabel()`
- Announce color/tool selections: "Red crayon selected"
- Test: Settings > Accessibility > VoiceOver

**Guided Access (Critical for Parents):**

- Parents lock iPad to single app for kids
- App must work flawlessly with Guided Access enabled
- Don't rely on system gestures (Home, Control Center, etc.)
- Provide in-app navigation for all features

**Switch Control:**

- Support for kids with motor impairments
- All elements navigable without touch
- Test: Settings > Accessibility > Switch Control

### Family & Parental Controls

**Screen Time Integration:**

- iOS automatically reports app usage to parents
- Gracefully handle time limit expiry (iOS suspends app)
- No intrusive "time's up" warnings - let OS handle

**Family Sharing:**

- Support multiple profiles if implementing cloud save
- Each child's artwork linked to their Apple Account
- Or: Device-level profile selection at app launch

**No Aggressive Upselling:**

- Gate premium features behind parental approval
- Never pressure kids to spend money
- Required for Kids category compliance

---

## React Native Technical Capabilities (2025)

### React Native Skia v2.4+

**What Skia Provides:**

- Hardware-accelerated 2D graphics (Skia is Chrome/Android's rendering engine)
- Custom shaders for effects (glitter, glow, rainbow)
- Path manipulation for complex brush strokes
- Image filters for blur, color adjustments

**Skia + Reanimated Integration:**

- 86% of developers use Skia with Reanimated
- `useAnimatedProps` for animated path properties
- `withSpring`/`withTiming` for smooth brush effects

**Flood Fill Limitation:**

- **No native flood fill in Skia** - must implement manually
- Options: WebAssembly-based fill, pixel manipulation, or pre-computed regions
- Chunky Crayon uses pre-computed `colorMapJson` (no runtime fill needed)

**Skottie (Lottie in Skia):**

- Play Lottie animations directly in Skia canvas
- Better performance than lottie-react-native for canvas overlays
- Use for: confetti, sparkles, magic effects on canvas

### React Native Reanimated v4.2+

**New in v4 (2024-2025):**

- CSS animations: `useAnimatedStyle` with CSS-like timing
- Shared element transitions between screens
- Improved gesture handling with react-native-gesture-handler v2
- 3x performance with `processNestedWorklets` flag

**LTS Option:** v3.19+ for stability if not needing latest features

**Performance Flags (Enable These):**

```json
// babel.config.js
[
  "react-native-reanimated/plugin",
  {
    "processNestedWorklets": true
  }
]
```

**Key Animations for Chunky Crayon:**

- Tool selection: Spring bounce
- Color picker: Scale pulse
- Sticker placement: Pop + wiggle
- Achievement unlock: Shared element transition + confetti

### Gesture Handler v2.24+

**Multi-touch Gestures:**

- Pinch-to-zoom: `PinchGestureHandler`
- Two-finger pan: `PanGestureHandler` with `minPointers={2}`
- Avoid complex gestures for ages 3-5

**Pencil vs Finger Detection:**

- Detect Apple Pencil via touch event properties
- Can have different behaviors for pencil (draw) vs finger (pan)

---

## COPPA/GDPR-K Compliance Guide (2025)

### Regulatory Overview

**Children's Online Privacy Protection Act (COPPA)**

- Applies to: Children under 13 in the United States
- Key requirement: No personal information collection without verifiable
  parental consent
- Enforcement: FTC can levy fines up to $50,120 per violation

**2025 COPPA Updates (FTC Final Rule)**

- Effective: June 23, 2025
- Full compliance required: April 22, 2026
- Key changes:
  - Biometric data explicitly classified as personal information
  - Expanded definition of "support for internal operations"
  - Stricter requirements for third-party disclosure

**GDPR-K (EU)**

- Applies to: Children under 16 (UK: under 13, varies by member state)
- Explicit consent required from parent/guardian
- "Right to be forgotten" applies to children's data

### What Counts as Personal Information (COPPA)

| Data Type                        | Status          | Notes                                 |
| -------------------------------- | --------------- | ------------------------------------- |
| Name, email, address             | PII             | Never collect without VPC             |
| Device identifiers (IDFA, GAID)  | PII             | Advertising IDs require consent       |
| Location data                    | PII             | Even coarse location                  |
| Photos/videos with faces         | PII (2025)      | Biometric data under new rules        |
| Voice recordings                 | PII (2025)      | Biometric data under new rules        |
| Persistent identifiers (cookies) | Conditional     | OK for "internal operations" only     |
| IP addresses                     | Conditional     | OK if only for internal operations    |
| Analytics without user ID        | Generally OK    | Aggregate only, no behavioral profile |
| Subscription purchase data (IAP) | App Store holds | Apple/Google handle payment PII       |

### Third-Party SDK Danger Zone

**Critical Finding:** 45% of kids apps have COPPA violations from embedded SDKs.

**SDKs to AVOID in Kids Apps:**

| SDK Type           | Risk Level | Reason                                |
| ------------------ | ---------- | ------------------------------------- |
| Firebase Analytics | HIGH       | Collects device ID, causes rejections |
| Google Analytics   | HIGH       | Behavioral tracking                   |
| Facebook SDK       | HIGH       | Device fingerprinting                 |
| AdMob              | CRITICAL   | Behavioral advertising                |
| Crashlytics        | MEDIUM     | May collect device identifiers        |
| Segment            | MEDIUM     | Data routing to third parties         |
| Mixpanel           | MEDIUM     | User identification                   |

**Safer Alternatives:**

| Need            | Recommended                                 |
| --------------- | ------------------------------------------- |
| Analytics       | PostHog (self-hosted) or Amplitude w/limits |
| Crash reporting | Sentry (privacy-focused config)             |
| Attribution     | None - rely on App Store data               |
| Ads             | None - subscription only                    |

### Recommended Architecture for Chunky Crayon

```
✅ RECOMMENDED APPROACH:
┌─────────────────────────────────────────────────────────────┐
│                     CHUNKY CRAYON MOBILE                    │
├─────────────────────────────────────────────────────────────┤
│  LOCAL STORAGE ONLY:                                        │
│  • Artwork files (device storage)                           │
│  • User preferences (AsyncStorage)                          │
│  • Progress/achievements (local)                            │
│  • Cached coloring pages (local)                            │
├─────────────────────────────────────────────────────────────┤
│  NETWORK (Minimal):                                         │
│  • Subscription status (via App Store)                      │
│  • Gallery images (public, no user data)                    │
│  • AI generation (prompt only, no user ID)                  │
├─────────────────────────────────────────────────────────────┤
│  OPTIONAL PARENT ACCOUNT:                                   │
│  • Cloud backup (requires parental consent)                 │
│  • Cross-device sync (requires parental consent)            │
│  • Share to family gallery (requires parental consent)      │
└─────────────────────────────────────────────────────────────┘
```

**Key Principle:** "Collect nothing, store locally, monetize via subscriptions."

### Verifiable Parental Consent (VPC) Methods

If you DO need to collect PII (not recommended), these methods are FTC-approved:

| Method                   | Complexity | Cost          | Best For                |
| ------------------------ | ---------- | ------------- | ----------------------- |
| Credit card verification | Low        | ~$0.50/verify | Quick implementation    |
| Knowledge-based Q&A      | Medium     | Free          | Low-friction            |
| Government ID scan       | High       | ~$2-5/verify  | High-value accounts     |
| Video consent            | High       | ~$1-3/verify  | Requires review process |
| Signed consent form      | Medium     | ~$1/verify    | Schools/institutions    |

**For Chunky Crayon:** Avoid VPC entirely by not collecting PII.

### Safe Harbor Programs

Certification provides legal protection and marketing value:

| Program                | Cost/Year     | Review Time | Notes                    |
| ---------------------- | ------------- | ----------- | ------------------------ |
| kidSAFE Seal           | $3,500-8,000  | 4-8 weeks   | Most recognized for apps |
| iKeepSafe              | $2,500-5,000  | 4-6 weeks   | Education-focused        |
| ESRB Privacy Certified | $2,000-6,000  | 6-8 weeks   | Gaming industry standard |
| PRIVO                  | $4,000-10,000 | 6-10 weeks  | Comprehensive solution   |

**Recommendation:** Consider kidSAFE for launch credibility.

### Chunky Crayon Compliance Checklist

```
PRE-LAUNCH COMPLIANCE:
□ Remove ALL analytics SDKs that collect device IDs
□ Remove ALL advertising SDKs
□ Ensure AI prompts don't include user identifiers
□ Store all artwork locally (not cloud by default)
□ Subscription via App Store (Apple/Google handle billing PII)
□ No user registration required for core functionality
□ Parental gate for any external links
□ Privacy policy written in plain language
□ Privacy policy link in App Store listing

IF ADDING PARENT ACCOUNTS (OPTIONAL):
□ Age gate at signup
□ Parental email verification
□ Clear data deletion process
□ No marketing emails without explicit consent
□ Data export capability (GDPR)

POST-LAUNCH MONITORING:
□ Regular SDK audit (quarterly)
□ Monitor FTC enforcement actions
□ Update privacy policy for new features
□ Respond to data deletion requests within 30 days
```

---

## Apple Kids Category Approval Guide

### Kids Category Age Bands

| Band           | Target Ages | Age Rating | Recommended For                 |
| -------------- | ----------- | ---------- | ------------------------------- |
| Ages 5 & Under | 0-5         | 4+         | Simple tap, no reading required |
| Ages 6-8       | 6-8         | 4+         | Basic reading, simple choices   |
| Ages 9-11      | 9-11        | 9+         | More complex features           |

**For Chunky Crayon:** Target "Ages 5 & Under" for maximum reach.

### #1 Rejection Reason: Third-Party SDKs

**Critical:** Firebase Analytics causes rejections EVEN WHEN DISABLED.

```
REJECTED SDK EXAMPLES (from developer reports):
- Firebase Analytics (even with analytics_collection_enabled: false)
- Google Analytics for Firebase
- Facebook SDK (any version)
- AdMob (obviously)
- Crashlytics standalone
- Any SDK that references IDFA
```

**Solution:** Complete removal from project, not just disabling.

```bash
# Check for problematic dependencies
# In your iOS Podfile.lock, search for:
grep -i "firebase\|google\|facebook\|admob" Podfile.lock

# Remove from package.json
pnpm remove @react-native-firebase/app
pnpm remove @react-native-firebase/analytics
```

### Parental Gate Requirements

External links, IAP, and permissions require parental gates:

**Approved Parental Gate Patterns:**

```
1. MATH PUZZLE (Apple-approved)
   "What is 8 + 7?"
   [Randomized, not easily guessed]

2. WORD PUZZLE
   "Type the word CONTINUE"
   [Too complex for young children]

3. MULTI-STEP
   "Hold these two buttons for 3 seconds"
   [Requires coordination beyond toddlers]

4. DATE OF BIRTH
   "Enter your birth year"
   [Quick but verify 13+ or 18+]
```

**Must Use Parental Gate For:**

- Subscription purchase flow
- External links (even App Store review)
- Camera/microphone permissions
- Social sharing features
- Contact forms

### "Made for Kids" Designation

**CRITICAL:** This designation is PERMANENT.

```
⚠️ CANNOT BE CHANGED AFTER APPROVAL
Once an app is approved as "Made for Kids":
- Cannot add behavioral advertising EVER
- Cannot add third-party analytics EVER
- Cannot change target age band
- Limited promotional strategies

THINK CAREFULLY before choosing this designation.
```

**Implications:**

- No App Store Search Ads (behavioral)
- No cross-promotion with non-kids apps
- Stricter ongoing review process
- But: Protected placement in Kids category

### Pre-Submission Checklist

```
DATA & PRIVACY:
□ Remove ALL third-party analytics SDKs
□ Remove ALL advertising SDKs
□ Verify NO device ID collection
□ Verify NO IDFA access
□ Verify NO location data
□ Privacy policy specifically addresses children

PARENTAL GATES:
□ Gate before subscription flow
□ Gate before any external links
□ Gate before camera access
□ Gate before microphone access
□ Math puzzles use random numbers

CONTENT:
□ All content age-appropriate
□ No user-generated content visible to other users
□ No chat or messaging features
□ No social features without parental consent

UI/UX:
□ No dark patterns (urgency, FOMO)
□ No loot boxes or gacha mechanics
□ Clear subscription terms
□ Easy subscription cancellation info

METADATA:
□ Age band selected in App Store Connect
□ Privacy policy URL included
□ Support URL included
□ Screenshots show typical experience
```

### Review Timeline & Process

| Stage                    | Duration     | Notes                            |
| ------------------------ | ------------ | -------------------------------- |
| Initial submission       | 24-72 hours  | Faster for kids apps generally   |
| First rejection (common) | +24-48 hours | SDK issues are quick to identify |
| Resubmission             | 24-48 hours  | Expedited if minor fixes         |
| Total typical time       | 1-2 weeks    | Plan buffer for launch           |

**Common First Submission Issues:**

1. Analytics SDK detected (even disabled)
2. Missing parental gate for IAP
3. Privacy policy doesn't mention children
4. External links without gates

### 2025 Policy Changes

**New Age Rating System (Effective January 31, 2026)**

Apple is implementing a new age rating questionnaire:

- More granular content classification
- Explicit questions about data collection
- AI content disclosure requirements

**State-Level Requirements:**

- Texas HB 18: Age verification by January 2026
- California AADC: Enhanced protections by January 2027
- Other states likely to follow

**Action Items:**

- Monitor Apple Developer News for updates
- Prepare for age verification requirements
- Consider geographic feature flags

---

## App Store Optimization for Kids Apps

### Keyword Strategy

**Parents Search, Kids Use**

Target parent concerns, not child interests:

```
PRIMARY KEYWORDS (high intent):
- "coloring app for kids"
- "safe coloring games"
- "educational coloring"
- "no ads kids app"
- "COPPA compliant"
- "kids creative app"

SECONDARY KEYWORDS:
- "toddler coloring"
- "preschool colors"
- "learning colors app"
- "offline coloring"
- "subscription coloring"

LONG-TAIL (less competition):
- "AI coloring pages for kids"
- "custom coloring book app"
- "voice activated coloring"
```

**Apple Search Ads:** Not available for Kids category (behavioral targeting
prohibited).

### Screenshot Optimization

**Design for Parents Scanning Quickly:**

| Position | Purpose                   | Content                        |
| -------- | ------------------------- | ------------------------------ |
| 1        | Hook - Primary value prop | Child happily coloring on iPad |
| 2        | Safety - Trust signal     | "No Ads • COPPA Safe" badge    |
| 3        | Feature - AI generation   | Voice/text input demonstration |
| 4        | Feature - Rich tools      | Stickers, effects, magic brush |
| 5        | Feature - Retention       | Colo mascot, achievements      |

**Design Guidelines:**

- 64-75px minimum touch targets visible
- Bright, saturated colors (attract both kids and parents)
- Show iPad frame for tablet-optimized message
- First screenshot most critical (autoplay in search)
- Include "parental seal" badges if certified

### App Preview Video

**Optimal Video:**

- Duration: 15-30 seconds (15s preferred)
- Hook in first 3 seconds (no title cards)
- Shows muted by default - add captions
- Demonstrate core loop: generate → color → celebrate
- End with call-to-action + subscription value

**Video Structure:**

```
0-3s:  Child's hand coloring (engagement hook)
3-8s:  AI generation feature (differentiation)
8-18s: Coloring with effects (feature showcase)
18-25s: Achievement unlock, Colo reaction (delight)
25-30s: App icon + "Try Free" CTA
```

### App Icon Optimization

**Kids App Icon Best Practices:**

| Element         | Recommendation                     |
| --------------- | ---------------------------------- |
| Primary subject | Colo mascot (character-driven)     |
| Color palette   | 2-3 bright colors max              |
| Background      | Simple gradient or solid           |
| Detail level    | Low - must read at 29x29px         |
| Text            | None - doesn't read at small sizes |

**A/B Testing:** Use App Store Connect's product page optimization.
**Benchmark:** Icon changes can lift conversion 10-25%.

### Ratings & Reviews Strategy

**Target:** 4.5+ stars within first 3 months

**Review Prompt Timing:**

- After completing first artwork (positive moment)
- After unlocking an achievement (dopamine high)
- NOT during paywall or frustration points

**Responding to Reviews:**

- Respond to all negative reviews within 24 hours
- Thank positive reviewers
- Never blame the user

### Localization Priority (by Market Size)

| Market        | Kids App Revenue | Growth (YoY) | Priority |
| ------------- | ---------------- | ------------ | -------- |
| United States | $0.65B           | +12%         | 1 (done) |
| Brazil        | Growing fast     | +31%         | 2        |
| Mexico        | Growing fast     | +26%         | 3        |
| UK            | $0.12B           | +8%          | 4        |
| Germany       | $0.10B           | +6%          | 5        |
| Japan         | $0.08B           | +4%          | 6        |

**Localization Beyond Translation:**

- Adjust pricing for local purchasing power
- Localize screenshots with local scripts
- Consider local character preferences (Japan: kawaii style)

### Seasonal Trends

| Season          | Strategy                            |
| --------------- | ----------------------------------- |
| Back to School  | "Educational" positioning, Jul-Sept |
| Summer          | Peak usage, maintain presence       |
| Winter Holidays | Gift positioning, bundle promotions |
| Spring Break    | Travel entertainment angle          |

### Conversion Benchmarks

| Metric               | Kids Category Avg | Target |
| -------------------- | ----------------- | ------ |
| Page view → Download | 30-35%            | 40%+   |
| Download → Trial     | 15-20%            | 25%+   |
| Trial → Paid         | 8-12%             | 15%+   |
| Day 1 Retention      | 25-30%            | 35%+   |
| Day 7 Retention      | 8-12%             | 15%+   |

---

## Competitor Feature Matrix

### Direct Competitors Analysis

| Feature                | Lake      | Pigment     | Crayola Adventures | Tayasui Color | Chunky Crayon |
| ---------------------- | --------- | ----------- | ------------------ | ------------- | ------------- |
| **Pricing**            | $40/year  | $60/year    | $50/year (Arcade)  | $8 one-time   | £8/mo planned |
| **Library Size**       | 1,500+    | 10,000+     | Story-based        | 54+           | AI-generated  |
| **AI Generation**      | ❌        | ❌          | ❌                 | ❌            | ✅            |
| **Voice Input**        | ❌        | ❌          | ❌                 | ❌            | ✅            |
| **Custom from Sketch** | ❌        | ❌          | ❌                 | ❌            | ✅            |
| **ASMR/Sound Engine**  | ✅ (Best) | ❌          | ❌                 | ✅ (Patented) | ⏳ Planned    |
| **Brush Effects**      | Basic     | 25+ tools   | Basic              | 10+           | 10+           |
| **Stickers/Stamps**    | ❌        | ✅          | Limited            | ✅            | ✅            |
| **Journaling/Notes**   | ✅        | ❌          | ❌                 | ❌            | ❌            |
| **Story Creation**     | ❌        | ❌          | ✅ (Core feature)  | ❌            | ❌            |
| **Mascot/Character**   | ❌        | ❌          | ❌                 | ❌            | ✅ (Colo)     |
| **Gamification**       | Minimal   | Challenges  | Story progress     | ❌            | ✅ (Full)     |
| **Community Features** | ❌        | ✅ (Strong) | ❌                 | ❌            | Sharing only  |
| **Offline Mode**       | ✅        | ✅          | ✅ (Arcade)        | ✅            | ✅ (Planned)  |
| **Apple Design Award** | 2017      | ❌          | 2024               | App of Year   | ❌            |

### Competitor Deep Dive

**Lake Coloring**

- Strength: ASMR sound engine, relaxation focus
- Weakness: Limited tools, no customization
- Target: Adults seeking relaxation
- Lesson: Sound design matters significantly

**Pigment**

- Strength: Largest library, professional tools, active community
- Weakness: Overwhelming for kids, premium pricing
- Target: Adult hobbyists
- Lesson: Community drives retention

**Crayola Adventures (Apple Arcade)**

- Strength: Brand recognition, story mode, safety guaranteed
- Weakness: Arcade-only, limited creativity
- Target: Families with Apple Arcade
- Lesson: Story/narrative adds engagement layer

**Tayasui Color**

- Strength: One-time purchase, patented sound, quality
- Weakness: Small library, no updates
- Target: Quality-focused minimalists
- Lesson: Premium one-time can work

### Chunky Crayon Differentiation

**Unique Strengths (No Competitor Has):**

| Feature            | Competitive Advantage                   |
| ------------------ | --------------------------------------- |
| AI Generation      | Infinite library, personalized to child |
| Voice Input        | Perfect for pre-readers (3-5 year olds) |
| Sketch to Coloring | Draw anything → color it                |
| Colo Evolution     | Mascot that grows with the child        |
| Magic Color AI     | Helps stuck kids, educational           |

**Positioning Statement:**

> "The only coloring app where your child's imagination becomes the coloring
> page."

### Feature Parity Requirements

To compete, Chunky Crayon MUST have:

| Feature                 | Priority | Why Essential                 |
| ----------------------- | -------- | ----------------------------- |
| Smooth fill tool        | P0       | Table stakes for coloring     |
| Undo/redo               | P0       | Kids make mistakes            |
| 5+ brush types          | P0       | Variety expected              |
| Zoom/pan                | P0       | Detail work, iPad essential   |
| Stickers                | P1       | Decoration delight            |
| Effects (glitter, etc.) | P1       | "Wow" moments                 |
| Sound effects           | P1       | Lake and Tayasui set standard |
| Haptic feedback         | P1       | Modern app expectation        |
| Achievements            | P1       | Retention driver              |
| Offline mode            | P2       | Travel use case               |

### Pricing Strategy Insights

| Competitor                | Model       | Effective Daily Cost |
| ------------------------- | ----------- | -------------------- |
| Lake                      | $40/year    | $0.11/day            |
| Pigment                   | $60/year    | $0.16/day            |
| Crayola (in Arcade)       | $50/year    | $0.14/day            |
| Tayasui                   | $8 one-time | Pennies over time    |
| **Chunky Crayon current** | £8/month    | £0.27/day            |
| **Chunky Crayon target**  | £3.99/month | £0.13/day            |

**Key Insight:** Current pricing is 2x the market. £3.99/month would be
competitive.

---

## Package Dependencies (Complete List)

### Strategy: Install All Upfront

To minimize Expo prebuild cycles, install ALL packages before first native
build:

```bash
# One-time install, one prebuild
pnpm add [all packages]
pnpm prebuild:ios
pnpm prebuild:android
```

### Target SDK 54 Core Packages

After upgrading to Expo SDK 54, these are the bundled versions:

```json
{
  // Core Framework (SDK 54 bundled)
  "expo": "~54.0.0",
  "react": "19.1.0",
  "react-native": "0.81.0",

  // Navigation & Routing
  "@react-navigation/bottom-tabs": "^7.0.14",
  "@react-navigation/native": "^7.0.9",
  "expo-router": "~5.2.0",

  // Graphics & Canvas
  "@shopify/react-native-skia": "^1.8.0",
  "react-native-svg": "~15.11.0",

  // Animation & Gestures (SDK 54 bundled)
  "react-native-gesture-handler": "~2.24.0",
  "react-native-reanimated": "~3.17.0",

  // Lists & Performance
  "@shopify/flash-list": "~1.8.0",

  // Analytics & Monitoring
  "@sentry/react-native": "~6.14.0",
  "posthog-react-native": "^4.9.1",

  // Data Fetching
  "@tanstack/react-query": "^5.62.0",
  "axios": "^1.7.8",

  // Validation
  "zod": "^3.23.8",

  // Icons
  "@expo/vector-icons": "^14.0.4",
  "@fortawesome/fontawesome-svg-core": "^6.7.1",
  "@fortawesome/react-native-fontawesome": "^0.3.2"
}
```

### SDK 54 Bundled Expo Packages

These are automatically included/versioned with SDK 54:

```json
{
  "expo-constants": "~17.1.0",
  "expo-dev-client": "~5.2.0",
  "expo-font": "~13.3.0",
  "expo-image": "~2.2.0",
  "expo-insights": "~0.9.0",
  "expo-linear-gradient": "~14.1.0",
  "expo-linking": "~7.1.0",
  "expo-print": "~14.1.0",
  "expo-sharing": "~13.1.0",
  "expo-splash-screen": "~0.30.0",
  "expo-status-bar": "~2.2.0",
  "expo-system-ui": "~5.0.0",
  "expo-updates": "~0.28.0",
  "expo-web-browser": "~14.2.0",
  "react-native-safe-area-context": "~5.4.0",
  "react-native-screens": "~4.11.0",
  "react-native-web": "~0.20.0"
}
```

### To Remove

```json
{
  "formik": "^2.4.6", // Replace with @tanstack/react-form
  "zod-formik-adapter": "^1.3.0", // No longer needed
  "twrnc": "^4.6.0", // Replace with nativewind
  "react-native-html-to-pdf": "^0.12.0" // Use expo-print instead
}
```

### To Add - Core (Native Modules - Require Prebuild)

```json
{
  // Authentication
  "@invertase/react-native-apple-authentication": "^2.4.1",
  "@react-native-google-signin/google-signin": "^16.0.0",

  // Storage (SDK 54 bundled versions)
  "@react-native-async-storage/async-storage": "~2.2.0",
  "expo-secure-store": "~14.2.0",

  // Payments (RevenueCat)
  "react-native-purchases": "^9.5.4",
  "react-native-purchases-ui": "^9.5.4",

  // UI Components
  "@gorhom/bottom-sheet": "^5.2.6",

  // Media & Haptics (SDK 54 bundled versions)
  // NOTE: expo-av is DEPRECATED in SDK 54 - use expo-audio instead
  "expo-audio": "~1.1.1",
  "expo-haptics": "~14.1.0",
  "expo-image-picker": "~16.1.0",
  "expo-camera": "~16.1.0",

  // Notifications (SDK 54 bundled)
  "expo-notifications": "~0.31.0",

  // Localization (SDK 54 bundled)
  "expo-localization": "~16.1.0",

  // Device Info (SDK 54 bundled)
  "expo-device": "~7.1.0",
  "expo-application": "~6.1.0",
  "expo-file-system": "~18.1.0",

  // Visual Effects (SDK 54 bundled)
  "expo-blur": "~14.1.0",

  // Speech (for voice input, SDK 54 bundled)
  "expo-speech": "~13.1.0",

  // Animations
  "lottie-react-native": "^7.2.2"
}
```

**Important SDK 54 Notes:**

- `expo-av` is **DEPRECATED** → Use `expo-audio` for audio and `expo-video` for
  video
- `expo-audio` has a new API based on `useAudioPlayer` hook
- Minimum iOS 15.1+, Android 7+ (API 23)

### To Add - JavaScript Only (No Prebuild Required)

```json
{
  // Forms (replacing formik)
  "@tanstack/react-form": "^1.23.8",
  "@hookform/resolvers": "^4.0.0",

  // State Management
  "zustand": "^5.0.3",

  // Styling
  "nativewind": "^4.1.23",
  "class-variance-authority": "^0.7.0",
  "clsx": "^2.1.1",
  "tailwind-merge": "^3.0.1",

  // Date handling
  "date-fns": "^3.6.0",

  // Analytics
  "posthog-react-native": "^4.9.1",

  // Carousel for onboarding
  "react-native-reanimated-carousel": "^4.0.3"
}
```

### Full Install Command (SDK 54)

```bash
# Step 1: Upgrade to Expo SDK 54
pnpm expo install expo@^54.0.0
pnpm expo install --fix  # Auto-fix all bundled packages to SDK 54 versions

# Step 2: Remove deprecated packages
pnpm remove formik zod-formik-adapter twrnc react-native-html-to-pdf

# Step 3: Add all new packages at once (SDK 54 compatible)
pnpm add \
  @invertase/react-native-apple-authentication@^2.4.1 \
  @react-native-google-signin/google-signin@^16.0.0 \
  @react-native-async-storage/async-storage@~2.2.0 \
  react-native-purchases@^9.5.4 \
  react-native-purchases-ui@^9.5.4 \
  @gorhom/bottom-sheet@^5.2.6 \
  lottie-react-native@^7.2.2 \
  @tanstack/react-form@^1.23.8 \
  @hookform/resolvers@^4.0.0 \
  zustand@^5.0.3 \
  nativewind@^4.1.23 \
  class-variance-authority@^0.7.0 \
  clsx@^2.1.1 \
  tailwind-merge@^3.0.1 \
  date-fns@^3.6.0 \
  posthog-react-native@^4.9.1 \
  react-native-reanimated-carousel@^4.0.3

# Step 4: Install SDK 54 bundled expo packages (auto-versioned)
pnpm expo install \
  expo-audio \
  expo-haptics \
  expo-image \
  expo-image-picker \
  expo-camera \
  expo-notifications \
  expo-localization \
  expo-device \
  expo-application \
  expo-file-system \
  expo-blur \
  expo-speech \
  expo-secure-store

# Step 5: Single prebuild after all installs
pnpm prebuild:ios
pnpm prebuild:android
```

**Note:** Using `pnpm expo install` for Expo packages ensures correct SDK 54
versions.

### Package Justification

| Package                            | Purpose            | Kids Experience Impact          |
| ---------------------------------- | ------------------ | ------------------------------- |
| `expo-haptics`                     | Tactile feedback   | Every tap feels alive           |
| `expo-audio`                       | Sound effects      | Audio reinforcement for actions |
| `lottie-react-native`              | Rich animations    | Celebrations, mascot, delight   |
| `react-native-reanimated-carousel` | Onboarding flow    | Smooth swipe experience         |
| `@gorhom/bottom-sheet`             | Tool panels        | Large, easy-to-use drawers      |
| `react-native-purchases`           | RevenueCat IAP     | Seamless subscription           |
| `expo-image`                       | Fast image loading | Snappy gallery browsing         |
| `posthog-react-native`             | Analytics          | Understand kid behavior         |
| `zustand`                          | State management   | Fast, reactive UI               |
| `nativewind`                       | Styling            | Consistent with web approach    |

---

## Technical Stack Summary

### Core Framework

- **Expo SDK 54** - Managed workflow with prebuild
- **React Native 0.81** - Latest stable (Dec 2024)
- **React 19.1.0** - Concurrent features

### Canvas & Graphics

- **@shopify/react-native-skia** - High-performance 2D graphics
- **react-native-svg** - SVG support for icons/patterns
- **expo-blur** - Blur effects for overlays

### Animation & Feedback

- **react-native-reanimated 3.17** - 60fps animations
- **lottie-react-native** - Complex animations (celebrations, mascot)
- **expo-haptics** - Tactile feedback
- **expo-audio** - Sound effects (replaces deprecated expo-av)

### State & Data

- **zustand** - Lightweight state management
- **@tanstack/react-query** - Server state
- **@tanstack/react-form** - Form handling
- **@react-native-async-storage/async-storage** - Persistent storage

### Authentication

- **@invertase/react-native-apple-authentication** - Apple Sign In
- **@react-native-google-signin/google-signin** - Google Sign In
- **expo-secure-store** - Secure token storage

### Payments

- **react-native-purchases** - RevenueCat SDK
- **react-native-purchases-ui** - Paywall UI components

### UI Components

- **@gorhom/bottom-sheet** - Bottom sheet drawers
- **@shopify/flash-list** - Performant lists
- **react-native-reanimated-carousel** - Onboarding carousel

### Styling

- **nativewind** - Tailwind for React Native
- **class-variance-authority** - Variant management
- **tailwind-merge** - Class merging

### Media

- **expo-image** - Fast image rendering
- **expo-image-picker** - Camera/gallery for photo-to-coloring feature
- **expo-speech** - Voice input

### Utilities

- **expo-notifications** - Push notifications
- **expo-localization** - i18n support
- **expo-file-system** - File operations
- **date-fns** - Date formatting
- **zod** - Schema validation

### Analytics & Monitoring

- **posthog-react-native** - Product analytics
- **@sentry/react-native** - Error tracking

---

## Success Metrics

### Launch Criteria (MVP)

- [ ] Fill tool working smoothly
- [ ] Undo/redo functional
- [ ] All brush types available
- [ ] Zoom/pan gestures
- [ ] 10+ sticker achievements
- [ ] Colo evolution (3 stages minimum)
- [ ] RevenueCat payments working
- [ ] Apple Sign In working
- [ ] iPad layout optimized
- [ ] 60fps performance on iPad Air

### Post-Launch Targets

| Metric          | 1 Month | 3 Months | 6 Months |
| --------------- | ------- | -------- | -------- |
| Downloads       | 1,000   | 5,000    | 20,000   |
| Conversion Rate | 1%      | 2%       | 3%       |
| MRR (Mobile)    | £100    | £500     | £1,500   |
| Rating          | 4.0+    | 4.3+     | 4.5+     |

---

## Risk Mitigation

| Risk                              | Impact | Likelihood | Mitigation                                   |
| --------------------------------- | ------ | ---------- | -------------------------------------------- |
| App Store rejection               | High   | Medium     | Follow guidelines strictly, TestFlight early |
| Performance issues                | High   | Medium     | Profile early, optimize Skia usage           |
| RevenueCat integration complexity | Medium | Medium     | Use their React Native docs, test thoroughly |
| Scope creep                       | High   | High       | Strict MVP definition, phase approach        |
| Web-mobile feature drift          | Medium | Low        | Shared server actions, regular parity checks |

---

## Timeline Summary

| Phase                | Duration | Key Deliverables                     |
| -------------------- | -------- | ------------------------------------ |
| 1. Core Coloring     | Week 1-2 | Fill, undo/redo, brushes, zoom       |
| 2. Effects           | Week 2-3 | Patterns, stickers, glitter, haptics |
| 3. Magic Features    | Week 3-4 | Magic color, auto-color              |
| 4. Retention         | Week 4-5 | Stickers, evolution, challenges      |
| 5. Onboarding & Auth | Week 5-6 | Carousel, guest mode, OAuth          |
| 6. Payments          | Week 6-7 | RevenueCat, webhooks                 |
| 7. Polish & Launch   | Week 7-8 | iPad optimization, App Store         |

**Total: 8 weeks to App Store submission**

---

## Next Steps

1. [ ] Set up RevenueCat account and products
2. [ ] Create API endpoints structure
3. [ ] Implement Skia fill tool
4. [ ] Build onboarding carousel
5. [ ] Port sticker system from web
6. [ ] Test on physical iPad devices

---

## Shared Assets Package

### Monorepo Asset Sharing Strategy

Sound effects, Lottie animations, and other assets should be shared between web
and mobile via a new package:

```
packages/
├── assets/                    # NEW: Shared assets package
│   ├── package.json
│   ├── sounds/               # MP3/WAV files
│   ├── animations/           # Lottie JSON files
│   └── index.ts              # Exports for both platforms
├── db/
└── translations/
```

**Package structure:**

```json
// packages/assets/package.json
{
  "name": "@chunky-crayon/assets",
  "version": "0.1.0",
  "main": "index.ts",
  "exports": {
    "./sounds/*": "./sounds/*",
    "./animations/*": "./animations/*"
  }
}
```

**Usage in apps:**

```typescript
// Web (apps/web)
import toolSelect from '@chunky-crayon/assets/sounds/tool-select.mp3';

// Mobile (apps/mobile) - requires metro.config.js update
import toolSelect from '@chunky-crayon/assets/sounds/tool-select.mp3';
```

**Benefits:**

- Single source of truth for assets
- No manual copying between web and mobile
- Easy to update/replace sounds across both platforms
- Version controlled like any other code

---

## Sound & Animation Assets Required

### Sound Effects Library

Create/source these audio files (`packages/assets/sounds/`):

| Sound              | Filename                 | Duration | Notes                 |
| ------------------ | ------------------------ | -------- | --------------------- |
| Tool select        | `tool-select.mp3`        | 0.1s     | Soft click            |
| Crayon tool        | `tool-crayon.mp3`        | 0.1s     | Pencil scratch hint   |
| Marker tool        | `tool-marker.mp3`        | 0.1s     | Smooth swoosh         |
| Fill tool          | `tool-fill.mp3`          | 0.1s     | Liquid prep           |
| Color pick         | `color-pick.mp3`         | 0.1s     | Gentle blip           |
| Crayon stroke      | `stroke-crayon.mp3`      | 0.5s     | Paper texture, loop   |
| Marker stroke      | `stroke-marker.mp3`      | 0.5s     | Smooth glide, loop    |
| Fill pour          | `fill-pour.mp3`          | 0.4s     | Liquid splash         |
| Stamp place        | `stamp-place.mp3`        | 0.2s     | Playful pop           |
| Sticker unlock     | `sticker-unlock.mp3`     | 0.8s     | Magical chime         |
| Challenge complete | `challenge-complete.mp3` | 1.5s     | Celebratory fanfare   |
| Colo evolution     | `colo-evolve.mp3`        | 2.0s     | Level-up magic        |
| Button press       | `button-press.mp3`       | 0.1s     | Soft click            |
| Error/blocked      | `error-gentle.mp3`       | 0.3s     | Soft bonk (not scary) |
| Undo               | `undo.mp3`               | 0.2s     | Reverse swoosh        |
| Redo               | `redo.mp3`               | 0.2s     | Forward swoosh        |
| Save success       | `save-success.mp3`       | 0.5s     | Happy confirmation    |
| Share              | `share.mp3`              | 0.3s     | Whoosh send           |

**Sourcing options:**

- ElevenLabs sound effects (we have integration)
- Pixabay royalty-free
- Custom creation via ElevenLabs

### Lottie Animations

Create/source these animation files (`packages/assets/animations/`):

| Animation       | Filename             | Duration | Loop | Notes                     |
| --------------- | -------------------- | -------- | ---- | ------------------------- |
| Confetti burst  | `confetti.json`      | 2s       | No   | Achievement unlock        |
| Stars sparkle   | `stars.json`         | 1.5s     | No   | Success moments           |
| Colo idle       | `colo-idle.json`     | 3s       | Yes  | Mascot breathing/blinking |
| Colo happy      | `colo-happy.json`    | 2s       | No   | On achievements           |
| Colo evolve 1→2 | `colo-evolve-1.json` | 3s       | No   | Level up animation        |
| Colo evolve 2→3 | `colo-evolve-2.json` | 3s       | No   | Level up animation        |
| Colo evolve 3→4 | `colo-evolve-3.json` | 3s       | No   | Level up animation        |
| Colo evolve 4→5 | `colo-evolve-4.json` | 3s       | No   | Level up animation        |
| Colo evolve 5→6 | `colo-evolve-5.json` | 3s       | No   | Final evolution           |
| Loading bounce  | `loading.json`       | 1s       | Yes  | Colo bouncing             |
| Sticker pop     | `sticker-pop.json`   | 0.5s     | No   | Sticker placement         |
| Progress fill   | `progress-fill.json` | 1s       | No   | Challenge progress        |
| Glitter effect  | `glitter.json`       | 2s       | Yes  | Glitter brush overlay     |
| Rainbow trail   | `rainbow.json`       | 1s       | Yes  | Rainbow brush hint        |
| Magic sparkle   | `magic-sparkle.json` | 1.5s     | No   | Magic color activation    |

**Sourcing options:**

- LottieFiles marketplace
- Custom design in After Effects + Bodymovin
- Rive (alternative to Lottie, higher performance)

### Haptic Patterns

Define in `utils/haptics.ts`:

```typescript
import * as Haptics from 'expo-haptics';

export const haptics = {
  // Light feedback
  toolSelect: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light),
  colorPick: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light),
  buttonPress: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light),

  // Medium feedback
  stampPlace: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium),
  fillComplete: () =>
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success),

  // Heavy feedback
  stickerUnlock: async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    await new Promise((r) => setTimeout(r, 100));
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  },

  challengeComplete: async () => {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await new Promise((r) => setTimeout(r, 150));
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    await new Promise((r) => setTimeout(r, 100));
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  },

  // Soft feedback
  undo: () => Haptics.selectionAsync(),
  redo: () => Haptics.selectionAsync(),

  // Error feedback
  error: () =>
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning),
};
```

### Audio Manager Pattern (SDK 54 - expo-audio)

```typescript
// utils/audio.ts
// NOTE: expo-audio replaces deprecated expo-av in SDK 54
// New hook-based API using useAudioPlayer

import { useAudioPlayer, AudioSource } from 'expo-audio';

// Define sound sources
const soundSources: Record<string, AudioSource> = {
  toolSelect: require('../assets/sounds/tool-select.mp3'),
  colorPick: require('../assets/sounds/color-pick.mp3'),
  fillPour: require('../assets/sounds/fill-pour.mp3'),
  stampPlace: require('../assets/sounds/stamp-place.mp3'),
  stickerUnlock: require('../assets/sounds/sticker-unlock.mp3'),
  buttonPress: require('../assets/sounds/button-press.mp3'),
  undo: require('../assets/sounds/undo.mp3'),
  redo: require('../assets/sounds/redo.mp3'),
};

// Hook-based approach (recommended for SDK 54)
export function useSoundEffect(soundName: keyof typeof soundSources) {
  const player = useAudioPlayer(soundSources[soundName]);

  const play = async () => {
    player.seekTo(0);
    player.play();
  };

  return { play };
}

// Component usage example:
// const { play: playToolSelect } = useSoundEffect('toolSelect');
// <Pressable onPress={() => { playToolSelect(); selectTool('crayon'); }}>

// For non-hook contexts, use Audio.Sound directly:
import { Audio } from 'expo-audio';

class AudioManager {
  private sounds: Map<string, Audio.Sound> = new Map();
  private enabled = true;

  async preload() {
    for (const [name, source] of Object.entries(soundSources)) {
      const sound = new Audio.Sound();
      await sound.loadAsync(source);
      this.sounds.set(name, sound);
    }
  }

  async play(name: string) {
    if (!this.enabled) return;
    const sound = this.sounds.get(name);
    if (sound) {
      await sound.setPositionAsync(0);
      await sound.playAsync();
    }
  }

  setEnabled(enabled: boolean) {
    this.enabled = enabled;
  }

  async cleanup() {
    for (const sound of this.sounds.values()) {
      await sound.unloadAsync();
    }
    this.sounds.clear();
  }
}

export const audioManager = new AudioManager();
```

---

## Appendix: Web Feature Reference

Features to port from web (in `apps/web/components/ColoringCanvas/`):

- `useFillTool.ts` - Flood fill algorithm
- `useUndoRedo.ts` - History management
- `BrushTextures.ts` - Crayon/marker textures
- `PatternFills.ts` - Pattern definitions
- `StickerLibrary.ts` - Emoji stickers
- `BrushEffects.ts` - Glitter/rainbow/glow/neon
- `MagicColorProvider.tsx` - AI color suggestions
- `AutoColorTool.ts` - One-click fill all

Retention mechanics in `apps/web/components/`:

- `StickerAlbum/` - Achievement system
- `ColoEvolution/` - Mascot progression
- `WeeklyChallenges/` - Challenge system
- `ShareArtwork/` - Social sharing

---

## Design System Translation Guide

_Last Updated: December 30, 2024_

This guide documents the web design system and provides direct translations for
React Native mobile implementation. **The goal is to maintain visual
consistency** between platforms while adapting to native mobile patterns.

### Philosophy

1. **Match the Web Look & Feel** - Colors, typography, spacing, and overall
   aesthetic should be identical
2. **Translate, Don't Recreate** - Use mobile-native equivalents (bottom sheets,
   haptics, gestures)
3. **iPad-First** - Optimize for larger screens, scale down gracefully to iPhone
4. **Playful & Warm** - The "Warm Canvas Design System" uses analogous
   coral/peach/yellow tones

---

### Color Palette

The web uses CSS HSL variables. For React Native, convert to hex or RGB values.

#### Primary Colors (Crayon Palette)

| Color               | CSS Variable            | HSL Value     | Hex       | Usage                      |
| ------------------- | ----------------------- | ------------- | --------- | -------------------------- |
| **Crayon Orange**   | `--crayon-orange`       | `12 75% 58%`  | `#E8734A` | Primary CTA, focus rings   |
| Crayon Orange Light | `--crayon-orange-light` | `12 80% 75%`  | `#F4A588` | Hover states, backgrounds  |
| Crayon Orange Dark  | `--crayon-orange-dark`  | `12 70% 48%`  | `#C45A34` | Active states              |
| **Crayon Teal**     | `--crayon-teal`         | `25 80% 72%`  | `#F0B88A` | Secondary CTA (peach tone) |
| Crayon Teal Light   | `--crayon-teal-light`   | `25 85% 85%`  | `#F9D9C0` | Subtle backgrounds         |
| Crayon Teal Dark    | `--crayon-teal-dark`    | `25 75% 58%`  | `#D99A5C` | Active states              |
| **Crayon Pink**     | `--crayon-pink`         | `355 65% 72%` | `#E89DA1` | Accent, playful elements   |
| Crayon Pink Light   | `--crayon-pink-light`   | `355 70% 86%` | `#F5CED0` | Soft backgrounds           |
| Crayon Pink Dark    | `--crayon-pink-dark`    | `355 60% 58%` | `#C96A70` | Active states              |
| **Crayon Yellow**   | `--crayon-yellow`       | `42 95% 62%`  | `#F5C842` | Highlights, celebration    |
| Crayon Yellow Light | `--crayon-yellow-light` | `42 100% 80%` | `#FFE599` | Glow effects               |
| Crayon Yellow Dark  | `--crayon-yellow-dark`  | `42 90% 48%`  | `#D4A122` | Active states              |
| **Crayon Green**    | `--crayon-green`        | `85 35% 52%`  | `#8AAE5C` | Success, nature            |
| **Crayon Purple**   | `--crayon-purple`       | `340 30% 65%` | `#C499A9` | Creative, dusty rose       |
| **Crayon Sky**      | `--crayon-sky`          | `30 50% 85%`  | `#EDD9C9` | Warm tan accent            |

#### Text Colors

| Color          | CSS Variable       | HSL Value    | Hex       | Usage               |
| -------------- | ------------------ | ------------ | --------- | ------------------- |
| Text Primary   | `--text-primary`   | `20 20% 22%` | `#433631` | Main text           |
| Text Secondary | `--text-secondary` | `20 12% 40%` | `#6E635B` | Descriptions        |
| Text Muted     | `--text-muted`     | `25 10% 55%` | `#938B84` | Placeholders        |
| Text Inverted  | `--text-inverted`  | `0 0% 100%`  | `#FFFFFF` | On dark backgrounds |

#### Background Colors

| Color                 | CSS Variable      | HSL Value    | Hex       | Usage              |
| --------------------- | ----------------- | ------------ | --------- | ------------------ |
| Background (Cream)    | `--bg-cream`      | `38 55% 97%` | `#FCF9F5` | App background     |
| Background Cream Dark | `--bg-cream-dark` | `35 40% 93%` | `#F3EDE6` | Card backgrounds   |
| Background Lavender   | `--bg-lavender`   | `30 45% 96%` | `#FAF7F3` | Alternate sections |
| Background White      | `--bg-white`      | `40 30% 99%` | `#FEFDFB` | Pure white cards   |

#### React Native Color Constants

```typescript
// apps/mobile/lib/colors.ts
export const COLORS = {
  // Primary
  crayonOrange: '#E8734A',
  crayonOrangeLight: '#F4A588',
  crayonOrangeDark: '#C45A34',

  // Secondary (Peach)
  crayonTeal: '#F0B88A',
  crayonTealLight: '#F9D9C0',
  crayonTealDark: '#D99A5C',

  // Accent (Blush Pink)
  crayonPink: '#E89DA1',
  crayonPinkLight: '#F5CED0',
  crayonPinkDark: '#C96A70',

  // Highlight (Sunshine Yellow)
  crayonYellow: '#F5C842',
  crayonYellowLight: '#FFE599',
  crayonYellowDark: '#D4A122',

  // Success (Sage Green)
  crayonGreen: '#8AAE5C',
  crayonGreenLight: '#B5D08C',
  crayonGreenDark: '#6B8B47',

  // Creative (Dusty Rose)
  crayonPurple: '#C499A9',
  crayonPurpleLight: '#DCC5CE',
  crayonPurpleDark: '#A77389',

  // Text
  textPrimary: '#433631',
  textSecondary: '#6E635B',
  textMuted: '#938B84',
  textInverted: '#FFFFFF',

  // Backgrounds
  background: '#FCF9F5',
  backgroundDark: '#F3EDE6',
  backgroundCard: '#FEFDFB',

  // Borders
  borderLight: '#E8E2DA',
  borderMedium: '#D6CEC3',

  // Semantic
  destructive: '#E53935',
} as const;
```

---

### Typography

#### Font Families

| Web Font    | CSS Variable         | Mobile Equivalent                         |
| ----------- | -------------------- | ----------------------------------------- |
| Tondo Trial | `--font-tondo`       | `TondoTrial-Bold`, `TondoTrial-Regular`   |
| Rooney Sans | `--font-rooney-sans` | `RooneySans-Regular`, `RooneySans-Medium` |

**Note:** Custom fonts must be loaded via `expo-font` in the mobile app.

#### Font Sizes (Web → Mobile)

| Web Class | Size (rem) | Size (px) | Mobile (pt) | Usage          |
| --------- | ---------- | --------- | ----------- | -------------- |
| text-xs   | 0.75rem    | 12px      | 12pt        | Fine print     |
| text-sm   | 0.875rem   | 14px      | 14pt        | Secondary text |
| text-base | 1rem       | 16px      | 16pt        | Body text      |
| text-lg   | 1.125rem   | 18px      | 18pt        | Emphasized     |
| text-xl   | 1.25rem    | 20px      | 20pt        | Subheadings    |
| text-2xl  | 1.5rem     | 24px      | 24pt        | Headings       |
| text-3xl  | 1.875rem   | 30px      | 30pt        | Page titles    |
| text-4xl  | 2.25rem    | 36px      | 36pt        | Hero text      |

**Kids Accessibility:**

- Ages 3-5: Minimum 24pt font size
- Ages 6-8: Minimum 18pt acceptable

---

### Spacing

The web uses Tailwind's spacing scale. Convert to React Native numeric values.

| Tailwind Class | Value (rem) | Value (px) | RN Value |
| -------------- | ----------- | ---------- | -------- |
| p-1 / m-1      | 0.25rem     | 4px        | 4        |
| p-2 / m-2      | 0.5rem      | 8px        | 8        |
| p-3 / m-3      | 0.75rem     | 12px       | 12       |
| p-4 / m-4      | 1rem        | 16px       | 16       |
| p-5 / m-5      | 1.25rem     | 20px       | 20       |
| p-6 / m-6      | 1.5rem      | 24px       | 24       |
| p-8 / m-8      | 2rem        | 32px       | 32       |
| p-10 / m-10    | 2.5rem      | 40px       | 40       |
| p-12 / m-12    | 3rem        | 48px       | 48       |
| p-16 / m-16    | 4rem        | 64px       | 64       |

**Touch Targets:**

- Minimum button height: 44pt (Apple HIG)
- Spacing between buttons: 64px minimum (kids app)

---

### Border Radius

| Web Variable    | Value          | Mobile Usage            |
| --------------- | -------------- | ----------------------- |
| `--radius-sm`   | 0.75rem (12px) | Small chips, tags       |
| `--radius`      | 1rem (16px)    | Buttons, inputs         |
| `--radius-lg`   | 1.5rem (24px)  | Cards, modals           |
| `--radius-xl`   | 2rem (32px)    | Featured cards          |
| `--radius-full` | 9999px         | Circular avatars, pills |

```typescript
export const RADIUS = {
  sm: 12,
  md: 16,
  lg: 24,
  xl: 32,
  full: 9999,
} as const;
```

---

### Shadows (Web → React Native)

Web uses `box-shadow`, React Native uses `shadowColor`, `shadowOffset`,
`shadowOpacity`, `shadowRadius` (iOS) or `elevation` (Android).

#### Shadow Presets

```typescript
import { Platform, ViewStyle } from 'react-native';

export const SHADOWS = {
  // Light shadow for cards
  card: Platform.select<ViewStyle>({
    ios: {
      shadowColor: '#E8734A', // crayon orange tint
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.08,
      shadowRadius: 6,
    },
    android: {
      elevation: 4,
    },
  }),

  // Medium shadow for elevated elements
  cardHover: Platform.select<ViewStyle>({
    ios: {
      shadowColor: '#E8734A',
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.12,
      shadowRadius: 15,
    },
    android: {
      elevation: 8,
    },
  }),

  // Button shadow (primary CTA)
  buttonPrimary: Platform.select<ViewStyle>({
    ios: {
      shadowColor: '#E8734A',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.4,
      shadowRadius: 14,
    },
    android: {
      elevation: 6,
    },
  }),

  // Subtle inner glow for inputs
  inputFocus: Platform.select<ViewStyle>({
    ios: {
      shadowColor: '#E8734A',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.1,
      shadowRadius: 3,
    },
    android: {
      elevation: 2,
    },
  }),
} as const;
```

---

### Gradients

The web uses Tailwind gradient classes. Use `expo-linear-gradient` for mobile.

#### Key Gradients

```typescript
import { LinearGradient } from 'expo-linear-gradient';

// Button gradient (orange primary)
<LinearGradient
  colors={['#E8734A', '#C45A34']}
  start={{ x: 0, y: 0 }}
  end={{ x: 1, y: 1 }}
  style={styles.button}
/>

// Paper background gradient
<LinearGradient
  colors={['#FCF9F5', '#F3EDE6']}
  start={{ x: 0, y: 0 }}
  end={{ x: 1, y: 1 }}
  style={styles.background}
/>

// Rainbow text effect (use MaskedView)
colors={['#E8734A', '#E89DA1', '#C499A9', '#F0B88A']}
```

---

### Animations (Web → React Native)

Web uses CSS keyframes and Tailwind `animate-*` classes. Use
`react-native-reanimated` for mobile.

#### Animation Translations

| Web Animation            | Duration    | React Native Implementation                                                   |
| ------------------------ | ----------- | ----------------------------------------------------------------------------- |
| `animate-wiggle`         | 0.5s        | `withSequence(rotate(-5), rotate(5), rotate(-5), rotate(5), rotate(0))`       |
| `animate-float`          | 3s infinite | `withRepeat(withSequence(translateY(0), translateY(-10), translateY(0)), -1)` |
| `animate-bounce-in`      | 0.5s        | `withSequence(scale(0.3), scale(1.05), scale(0.9), scale(1))`                 |
| `animate-squish`         | 0.3s        | `withSequence(scale(1), scale(0.9), scale(1))`                                |
| `animate-happy-jump`     | 0.6s        | `withSequence(translateY(-12), translateY(0), translateY(-8), translateY(0))` |
| `animate-reaction-float` | 0.8s        | `withTiming(translateY(-40), { duration: 800 })` with `opacity: 0`            |
| `animate-spin-slow`      | 4s infinite | `withRepeat(withTiming(rotate(360), { duration: 4000 }), -1)`                 |

#### Reanimated Spring Config

```typescript
const SPRING_CONFIG = {
  damping: 8,
  stiffness: 200,
};

// Bounce animation
scale.value = withSequence(
  withSpring(1.15, { damping: 5, stiffness: 400 }),
  withSpring(1, SPRING_CONFIG),
);
```

---

### Component Patterns

#### Buttons

**Web (btn-crayon class):**

- Gradient background
- Rounded-xl (24px)
- Font-bold Tondo
- Inner highlight (inset 0 1px 0 white/20)
- Colored shadow
- Scale 1.05 on hover, 0.95 on active

**Mobile Translation:**

```tsx
<TouchableOpacity onPress={handlePress} activeOpacity={0.9}>
  <LinearGradient
    colors={['#E8734A', '#C45A34']}
    style={[styles.button, SHADOWS.buttonPrimary]}
  >
    <Animated.View style={[animatedStyle]}>
      <Text style={styles.buttonText}>{label}</Text>
    </Animated.View>
  </LinearGradient>
</TouchableOpacity>
```

#### Cards

**Web (card-crayon class):**

- White background
- Rounded-2xl (32px)
- Padding 24px
- Subtle orange-tinted shadow
- Border 1px border-light
- Scale on hover

**Mobile Translation:**

```tsx
<View style={[styles.card, SHADOWS.card]}>{children}</View>;

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FEFDFB',
    borderRadius: 32,
    padding: 24,
    borderWidth: 1,
    borderColor: '#E8E2DA',
  },
});
```

#### Input Fields

**Web (input-crayon class):**

- White background
- Border 2px border-medium
- Rounded-xl (24px)
- Orange border + glow on focus

**Mobile Translation:**

```tsx
<TextInput
  style={[styles.input, focused && styles.inputFocused]}
  onFocus={() => setFocused(true)}
  onBlur={() => setFocused(false)}
/>;

const styles = StyleSheet.create({
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#D6CEC3',
    borderRadius: 24,
    padding: 16,
    fontFamily: 'TondoTrial-Regular',
    fontSize: 16,
  },
  inputFocused: {
    borderColor: '#E8734A',
    ...SHADOWS.inputFocus,
  },
});
```

---

### Mobile-Native Enhancements

While maintaining visual consistency, use native patterns:

1. **Bottom Sheets** instead of modals (react-native-reanimated-bottom-sheet)
2. **Haptic Feedback** on all interactions (expo-haptics)
3. **Gesture Handlers** for swipes, pinch, pan (react-native-gesture-handler)
4. **Native Blur** for overlays (expo-blur)
5. **Safe Area** handling for notches/home indicators
6. **Keyboard Avoiding** views for forms
7. **Pull-to-Refresh** where appropriate

---

### Colo Avatar Stage Colors

Used for the mascot avatar based on evolution stage:

| Stage | Name    | Gradient From           | Gradient To             |
| ----- | ------- | ----------------------- | ----------------------- |
| 1     | Baby    | `#FDE68A` (amber-200)   | `#F59E0B` (amber-400)   |
| 2     | Little  | `#A7F3D0` (emerald-200) | `#10B981` (emerald-400) |
| 3     | Growing | `#BAE6FD` (sky-200)     | `#0EA5E9` (sky-400)     |
| 4     | Happy   | `#FBCFE8` (pink-200)    | `#EC4899` (pink-400)    |
| 5     | Artist  | `#DDD6FE` (violet-200)  | `#8B5CF6` (violet-400)  |
| 6     | Master  | `#FDBA74` (orange-300)  | `#F59E0B` (amber-500)   |

---

### Web Screenshots Reference

Screenshots captured from web app for visual reference (stored in
`.playwright-mcp/`):

| Page                | File                    | Key Design Elements                                               |
| ------------------- | ----------------------- | ----------------------------------------------------------------- |
| Homepage            | `web-home.png`          | Hero with Colo mascot, "Create Magic" CTA card, input method tabs |
| Gallery             | `web-gallery.png`       | Category tabs, daily coloring feature, community section          |
| Coloring Experience | `web-coloring-page.png` | 20-color palette, 12 tool buttons, brush size selector            |
| Sign In             | `web-signin.png`        | Social auth buttons, email option, minimal design                 |
| Pricing             | `web-pricing.png`       | 3-tier pricing cards (Splash/Rainbow/Sparkle), feature lists      |
| Blog                | `web-blog.png`          | Article cards with images, clean layout                           |

---

### Implementation Checklist

When translating each screen to mobile:

- [ ] Use correct color constants from `COLORS`
- [ ] Apply proper `SHADOWS` for depth
- [ ] Use `LinearGradient` for gradient backgrounds
- [ ] Match typography (font family, size, weight)
- [ ] Apply consistent spacing values
- [ ] Use correct border radius from `RADIUS`
- [ ] Implement animations with reanimated
- [ ] Add haptic feedback on interactions
- [ ] Test on both iPhone and iPad
- [ ] Ensure minimum touch target sizes (44pt)
- [ ] Handle safe areas properly

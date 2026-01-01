# Mobile-Web API Integration Plan

## Overview

This document tracks the integration between the React Native mobile app and the Next.js web API layer, including authentication, profile management, and data synchronization.

**Branch**: `claude/connect-mobile-web-endpoints-mgSGt`

---

## Completed Work ✅

### 1. Mobile API Client (`apps/mobile/api.ts`)

Full Axios-based API client with:

- **Automatic device registration** on first API call
- **Auth interceptor** that injects Bearer tokens on all requests
- **Secure token storage** via `expo-secure-store`

#### Endpoints Implemented

| Category       | Endpoints                                                                    |
| -------------- | ---------------------------------------------------------------------------- |
| Auth           | `register`, `google`, `apple`, `facebook`, `magic-link`, `magic-link/verify` |
| Profiles       | `list`, `create`, `update`, `delete`, `setActive`                            |
| Saved Artworks | `list`, `get`, `save`, `delete`                                              |
| Colo Evolution | `get`, `evolve`, `unlockAccessory`                                           |
| Stickers       | `list`, `unlock`, `markSeen`                                                 |
| Challenges     | `getActive`, `getProgress`, `updateProgress`, `claimReward`                  |

### 2. Authentication System

#### Device-Based Anonymous Auth

- JWT tokens with 365-day expiration
- `MobileDeviceSession` Prisma model links devices to users
- Anonymous users created automatically on device registration

#### OAuth Integration

| Provider | Backend  | Mobile SDK       | Status      |
| -------- | -------- | ---------------- | ----------- |
| Google   | ✅ Ready | ✅ Installed     | **Working** |
| Apple    | ✅ Ready | ✅ Installed     | **Working** |
| Facebook | ✅ Ready | ❌ Not installed | **Pending** |

#### Magic Link (Passwordless)

- Custom branded HTML email via Resend
- 15-minute token expiration
- Deep link redirect to mobile app

#### Account Merging

When an anonymous user signs in with OAuth:

1. Check if email already exists in database
2. If exists: merge anonymous user's data into existing account
3. Transfer: profiles, saved artworks, stickers, challenge progress
4. Delete anonymous user record
5. Update device session to point to merged account

### 3. Profile Service (`apps/web/lib/profiles/service.ts`)

Extracted shared service layer for:

- `getProfilesForUser()` - List all profiles with stats
- `getProfileById()` - Get single profile with ownership check
- `createProfileForUser()` - Create with age-based difficulty defaults
- `updateProfileForUser()` - Update with auto-difficulty adjustment
- `deleteProfileForUser()` - Delete with default profile reassignment
- `setActiveProfileForUser()` - Switch active profile
- `getActiveProfileForUser()` - Get current active profile

**Constraints:**

- Max 10 profiles per account
- First profile is automatically set as default
- Age group determines default difficulty level

### 4. Schema Changes (`packages/db/prisma/schema.prisma`)

```prisma
// User.email now optional for anonymous mobile users
model User {
  email String? @unique
  // ...
}

// New model for device-user linking
model MobileDeviceSession {
  id         String   @id @default(cuid())
  deviceId   String   @unique
  userId     String
  user       User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt
  lastSeenAt DateTime @default(now())

  @@map("mobile_device_sessions")
}
```

### 5. Web API Endpoints

| Endpoint                             | Method       | Description                |
| ------------------------------------ | ------------ | -------------------------- |
| `/api/mobile/auth/register`          | POST         | Register device, get token |
| `/api/mobile/auth/google`            | POST         | Exchange Google token      |
| `/api/mobile/auth/apple`             | POST         | Exchange Apple token       |
| `/api/mobile/auth/facebook`          | POST         | Exchange Facebook token    |
| `/api/mobile/auth/magic-link`        | POST         | Send magic link email      |
| `/api/mobile/auth/magic-link/verify` | POST         | Verify magic link token    |
| `/api/mobile/profiles`               | GET/POST     | List/create profiles       |
| `/api/mobile/profiles/[id]`          | PATCH/DELETE | Update/delete profile      |
| `/api/mobile/profiles/[id]/activate` | POST         | Set active profile         |

---

## Mobile Content Strategy ✅

### Decision: No User-Generated Content on Mobile

For child safety (ages 3-8, COPPA/GDPR-K compliance), the mobile app will **not** display community/user-generated images. Users could potentially generate inappropriate content that other children might see.

### Content Sources

| Source                   | Display   | Description                                 |
| ------------------------ | --------- | ------------------------------------------- |
| `GenerationType.USER`    | ❌ Hidden | User-generated images - not shown on mobile |
| `GenerationType.DAILY`   | ✅ Shown  | Today's curated pick                        |
| `GenerationType.WEEKLY`  | ✅ Shown  | Weekly themed collection                    |
| `GenerationType.MONTHLY` | ✅ Shown  | Monthly featured images                     |
| User's own SavedArtwork  | ✅ Shown  | Their own saved colored art                 |

### Home Feed Architecture ("For You" Tab)

The home screen presents a curated, safe experience:

```
┌─────────────────────────────────┐
│  Today's Pick                   │  ← DAILY image with notification tie-in
│  "The Unicorn Knight"           │
│  [Large preview with CTA]       │
└─────────────────────────────────┘
┌─────────────────────────────────┐
│  Active Challenge               │  ← From WeeklyChallenge table
│  "Color 5 animals this week!"   │
│  Progress: ███░░ 3/5            │
└─────────────────────────────────┘
┌─────────────────────────────────┐
│  Recent Art                     │  ← User's own SavedArtwork
│  [Horizontal scroll of thumbs]  │
└─────────────────────────────────┘
┌─────────────────────────────────┐
│  Weekly Collection              │  ← WEEKLY themed images
│  "Space Adventures"             │
│  [Grid of 4-6 images]           │
└─────────────────────────────────┘
```

### Push Notification Strategy

Daily notifications tied to curated content:

- "Today's coloring page: The Unicorn Knight is waiting!"
- "New weekly collection: Space Adventures"
- "Challenge reminder: 2 more animals to complete!"

### API Endpoint Changes Needed

New endpoint: `GET /api/mobile/feed`

```typescript
// Returns curated content for home feed
{
  todaysPick: ColoringImage | null,      // DAILY for today
  activeChallenge: WeeklyChallenge | null,
  recentArt: SavedArtwork[],             // User's own (limit 10)
  weeklyCollection: ColoringImage[],     // WEEKLY images
  monthlyFeatured: ColoringImage[],      // MONTHLY images
}
```

---

## Remaining Work ⚠️

### 1. Install Facebook SDK (High Priority)

The Facebook OAuth backend is ready but the mobile SDK is not installed.

**Current behavior** (`apps/mobile/contexts/AuthContext.tsx`):

```typescript
Alert.alert(
  "Coming Soon",
  "Facebook sign-in will be available in a future update.",
);
```

**To complete:**

```bash
cd apps/mobile
pnpm add react-native-fbsdk-next
pnpm prebuild:ios
pnpm prebuild:android
```

Then update `AuthContext.tsx` to use the actual SDK:

```typescript
import { LoginManager, AccessToken } from "react-native-fbsdk-next";

const signInWithFacebookHandler = async () => {
  const result = await LoginManager.logInWithPermissions([
    "public_profile",
    "email",
  ]);
  if (result.isCancelled) return null;

  const data = await AccessToken.getCurrentAccessToken();
  const response = await api.auth.facebook(data.accessToken);
  // ... handle response
};
```

### 2. Fix Enum Mismatch (Bug)

In `apps/web/lib/mobile-auth.ts:97-98`, profile creation uses incorrect string values:

**Current (broken):**

```typescript
ageGroup: "5_7",
difficulty: "easy",
```

**Should be:**

```typescript
ageGroup: AgeGroup.CHILD,
difficulty: Difficulty.BEGINNER,
```

### 3. Improvements from parking-ticket-pal (Recommended)

The parking-ticket-pal project has a mature auth implementation with patterns we should adopt:

#### Facebook SDK Configuration

Update `apps/mobile/app.config.ts` to include proper Facebook SDK config:

```typescript
[
  "react-native-fbsdk-next",
  {
    appID: `${process.env.EXPO_PUBLIC_FACEBOOK_APP_ID}`,
    displayName: "Chunky Crayon",
    clientToken: `${process.env.EXPO_PUBLIC_FACEBOOK_CLIENT_TOKEN}`,
    scheme: "chunkycrayon",
  }
],
```

Also add URL scheme configuration for iOS deep linking:

```typescript
ios: {
  infoPlist: {
    CFBundleURLTypes: [
      {
        CFBundleURLSchemes: [`fb${process.env.EXPO_PUBLIC_FACEBOOK_APP_ID}`],
      },
    ],
  },
},
```

#### Periodic Token Validity Checks

Add a background check every 10 minutes to detect expired tokens:

```typescript
useEffect(() => {
  const interval = setInterval(
    async () => {
      const token = await getToken();
      if (token) {
        const isValid = await api.auth.validateToken();
        if (!isValid) {
          await signOut();
        }
      }
    },
    10 * 60 * 1000,
  ); // 10 minutes

  return () => clearInterval(interval);
}, []);
```

#### Auth Event Analytics

Track auth events for monitoring and debugging:

- `auth_sign_in_started` - When user initiates sign-in
- `auth_sign_in_success` - When sign-in completes
- `auth_sign_in_failed` - When sign-in fails (include error type)
- `auth_sign_out` - When user signs out
- `auth_merge_complete` - When anonymous account merges

#### Proper Sign-Out Cleanup

Ensure sign-out cleans up all services:

```typescript
const signOut = async () => {
  // Clear stored tokens
  await SecureStore.deleteItemAsync("auth_token");

  // Sign out from OAuth providers if needed
  await GoogleSignIn.signOutAsync();

  // Reset analytics identity
  posthog.reset();

  // Clear RevenueCat user
  await Purchases.logOut();

  // Reset auth state
  setUser(null);
};
```

#### Google Token Verification

Backend should verify Google tokens using `google-auth-library`:

```typescript
import { OAuth2Client } from "google-auth-library";

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

async function verifyGoogleToken(idToken: string) {
  const ticket = await client.verifyIdToken({
    idToken,
    audience: process.env.GOOGLE_CLIENT_ID,
  });
  return ticket.getPayload();
}
```

### 4. Future Enhancements

- [ ] Add biometric authentication option
- [ ] Implement push notification token registration
- [ ] Add offline mode with sync queue
- [ ] Rate limiting on auth endpoints
- [ ] Device management UI (see/revoke linked devices)

---

## Testing Checklist

- [ ] Device registration creates anonymous user
- [ ] Anonymous user can create/edit profiles
- [ ] Google OAuth creates/links account
- [ ] Apple OAuth creates/links account
- [ ] Facebook OAuth creates/links account (after SDK install)
- [ ] Magic link email sends and verifies
- [ ] Anonymous → OAuth merge preserves all data
- [ ] Profile switching updates active profile
- [ ] Token refresh works after expiration

---

## Related Files

| File                                   | Description                    |
| -------------------------------------- | ------------------------------ |
| `apps/mobile/api.ts`                   | Mobile API client              |
| `apps/mobile/contexts/AuthContext.tsx` | Auth state management          |
| `apps/web/lib/mobile-auth.ts`          | JWT and device session helpers |
| `apps/web/lib/profiles/service.ts`     | Profile CRUD service           |
| `apps/web/app/api/mobile/**`           | All mobile API routes          |
| `packages/db/prisma/schema.prisma`     | Database schema                |

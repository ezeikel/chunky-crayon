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

#### API Client Methods (`apps/mobile/api.ts`)

| Category       | Methods                                                                                                                                       |
| -------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| Auth           | `registerDevice`, `getAuthMe`, `linkAccount`, `signInWithGoogle`, `signInWithApple`, `signInWithFacebook`, `sendMagicLink`, `verifyMagicLink` |
| User           | `getCurrentUser`                                                                                                                              |
| Profiles       | `getProfiles`, `createProfile`, `getActiveProfile`, `setActiveProfile`, `updateProfile`, `deleteProfile`                                      |
| Feed           | `getFeed`                                                                                                                                     |
| Saved Artworks | `getSavedArtworks`, `saveArtwork`                                                                                                             |
| Colo Evolution | `getColoState`, `checkColoEvolution`                                                                                                          |
| Stickers       | `getStickers`, `markStickersAsViewed`                                                                                                         |
| Challenges     | `getChallenges`, `claimChallengeReward`                                                                                                       |

### 2. Authentication System

#### Device-Based Anonymous Auth

- JWT tokens with 365-day expiration
- `MobileDeviceSession` Prisma model links devices to users
- Anonymous users created automatically on device registration

#### OAuth Integration

| Provider | Backend  | Mobile SDK   | Status      |
| -------- | -------- | ------------ | ----------- |
| Google   | ✅ Ready | ✅ Installed | **Working** |
| Apple    | ✅ Ready | ✅ Installed | **Working** |
| Facebook | ✅ Ready | ✅ Installed | **Working** |

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

| Endpoint                             | Method       | Description                  |
| ------------------------------------ | ------------ | ---------------------------- |
| `/api/mobile/auth/register`          | POST         | Register device, get token   |
| `/api/mobile/auth/google`            | POST         | Exchange Google token        |
| `/api/mobile/auth/apple`             | POST         | Exchange Apple token         |
| `/api/mobile/auth/facebook`          | POST         | Exchange Facebook token      |
| `/api/mobile/auth/magic-link`        | POST         | Send magic link email        |
| `/api/mobile/auth/magic-link/verify` | POST         | Verify magic link token      |
| `/api/mobile/auth/me`                | GET          | Get current auth status      |
| `/api/mobile/auth/link`              | POST         | Link OAuth to device         |
| `/api/mobile/profiles`               | GET/POST     | List/create profiles         |
| `/api/mobile/profiles/[id]`          | PATCH/DELETE | Update/delete profile        |
| `/api/mobile/profiles/active`        | GET/POST     | Get/set active profile       |
| `/api/mobile/user`                   | GET/PATCH    | Get/update user info         |
| `/api/mobile/feed`                   | GET          | Get curated home feed        |
| `/api/mobile/saved-artworks`         | GET/POST     | List/save artworks           |
| `/api/mobile/colo`                   | GET/PATCH    | Get/evolve Colo              |
| `/api/mobile/stickers`               | GET/POST     | List/unlock stickers         |
| `/api/mobile/challenges`             | GET/POST     | List challenges/update prog. |
| `/api/mobile/challenges/claim`       | POST         | Claim challenge reward       |

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

### Feed API Endpoint ✅

Implemented: `GET /api/mobile/feed`

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

## Recently Completed ✅

### Middleware → Proxy Consolidation

Next.js 16 renamed `middleware.ts` to `proxy.ts`. The mobile JWT authentication logic has been consolidated into `proxy.ts`:

- Mobile API auth with JWT verification via `jose`
- Header injection (`x-user-id`, `x-profile-id`, `x-device-id`)
- Skip auth for token-creating endpoints (register, OAuth)
- Unified with i18n and PostHog ingest routing

### Facebook SDK Integration

Facebook OAuth is fully integrated:

- SDK installed: `react-native-fbsdk-next`
- `AuthContext.tsx` updated with `LoginManager` and `AccessToken` usage
- Backend endpoint ready at `/api/mobile/auth/facebook`

### Periodic Token Validity Checks

Added 10-minute background check in `AuthContext.tsx` to detect expired tokens and trigger sign-out.

### Facebook SDK Configuration

Full Facebook SDK integration in `apps/mobile/app.config.ts`:

- Plugin configured with `appID`, `displayName`, `clientToken`, and `scheme`
- iOS URL scheme added for deep linking (`fb${FACEBOOK_APP_ID}`)
- `AuthContext.tsx` updated with `LoginManager` and `AccessToken` from `react-native-fbsdk-next`

### Google Token Verification

Backend verifies Google ID tokens using `google-auth-library` in `/api/mobile/auth/google`:

```typescript
import { OAuth2Client } from "google-auth-library";

const ticket = await googleClient.verifyIdToken({
  idToken,
  audience: [GOOGLE_CLIENT_ID, GOOGLE_WEB_CLIENT_ID, GOOGLE_IOS_CLIENT_ID],
});
```

---

## Remaining Work ⚠️

### 1. Pending Service Initialization

These improvements are blocked until their respective services are set up:

#### Auth Event Analytics (Pending: PostHog installation)

Track auth events for monitoring and debugging. Requires PostHog SDK to be installed on mobile first.

Events to track:

- `auth_sign_in_started` - When user initiates sign-in
- `auth_sign_in_success` - When sign-in completes
- `auth_sign_in_failed` - When sign-in fails (include error type)
- `auth_sign_out` - When user signs out
- `auth_merge_complete` - When anonymous account merges

#### Sign-Out Cleanup Extensions (Pending: RevenueCat initialization)

Currently sign-out cleans up:

- ✅ Stored auth tokens via `expo-secure-store`
- ✅ Google sign-in state via `GoogleSignin.signOut()`
- ✅ Local auth state reset

When services are initialized, add:

- ⏳ `posthog.reset()` - Reset analytics identity (when PostHog installed)
- ⏳ `Purchases.logOut()` - Clear RevenueCat user (when RevenueCat initialized)

### 2. Future Enhancements

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

# Mobile API Architecture Plan

_Created: January 2025_ _Last Updated: January 2025_ _Status: Planning Complete,
Implementation In Progress_

---

## Overview

This document defines the architecture pattern for mobile API endpoints in
chunky-crayon, based on the proven pattern from parking-ticket-pal.

### Goal

Unify web and mobile code paths so that:

- **Server actions** contain all business logic (single source of truth)
- **API routes** are thin wrappers that call server actions
- **Auth is unified** via `getUserId()` that works for both web sessions and
  mobile JWT

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         Middleware                               │
│  1. Check web session (NextAuth)                                │
│  2. If no session, check Authorization header for mobile JWT    │
│  3. Decrypt JWT → add x-user-id, x-profile-id to headers        │
└─────────────────────────────────────────────────────────────────┘
                              │
           ┌──────────────────┴──────────────────┐
           ▼                                      ▼
    ┌─────────────┐                       ┌─────────────┐
    │  Web Forms  │                       │  API Routes │
    │  (direct)   │                       │ /api/mobile │
    └──────┬──────┘                       └──────┬──────┘
           │                                      │
           │  Calls directly                      │  Thin wrapper:
           │                                      │  - Parse request
           │                                      │  - Call server action
           │                                      │  - Return JSON + CORS
           │                                      │
           └──────────────────┬───────────────────┘
                              ▼
                    ┌─────────────────┐
                    │  Server Actions │
                    │  "use server"   │
                    │                 │
                    │  getUserId() ───┼──► Checks BOTH:
                    │                 │    - Web session
                    │                 │    - x-user-id header
                    │                 │
                    │  Business logic │
                    │  DB operations  │
                    │  Validation     │
                    └────────┬────────┘
                             │
                             ▼
                    ┌─────────────────┐
                    │  Service Layer  │
                    │  (optional)     │
                    │                 │
                    │  Complex queries│
                    │  Shared utils   │
                    └─────────────────┘
```

---

## Key Principles

### 1. Server Actions = Business Logic

All business logic lives in server actions (`app/actions/*.ts`). This includes:

- Database operations
- Input validation
- Authorization checks
- Error handling

### 2. API Routes = Thin Wrappers

Mobile API routes (`app/api/mobile/*`) should:

- Parse request parameters
- Call the appropriate server action
- Handle CORS headers
- Return JSON response
- NOT contain business logic

### 3. Unified Auth via getUserId()

The `getUserId()` utility checks both auth sources:

```typescript
export const getUserId = async (action?: string) => {
  // Check web session first
  const session = await auth();
  if (session?.user?.id) return session.user.id;

  // Fall back to mobile JWT (set by middleware)
  const headersList = await headers();
  const mobileUserId = headersList.get("x-user-id");
  if (mobileUserId) return mobileUserId;

  // Not authenticated
  if (action) console.error(`Auth required for: ${action}`);
  return null;
};
```

### 4. Middleware Handles Mobile JWT

Middleware decrypts mobile JWT and sets headers:

```typescript
// In middleware.ts
if (pathname.startsWith("/api/mobile")) {
  const token = req.headers.get("authorization")?.split(" ")[1];
  if (token) {
    const payload = await decryptMobileToken(token);
    reqHeaders.set("x-user-id", payload.userId);
    reqHeaders.set("x-profile-id", payload.profileId);
  }
}
```

---

## Implementation Checklist

### Phase 1: Infrastructure

- [ ] Update middleware to decrypt mobile JWT and set user headers
- [ ] Create `decryptMobileToken()` utility in `lib/mobile-auth.ts`
- [ ] Update `getUserId()` to check `x-user-id` header as fallback
- [ ] Create `getProfileId()` utility that checks `x-profile-id` header
- [ ] Add tests for unified auth flow

### Phase 2: Refactor Existing Mobile Endpoints

#### Feed Endpoint

- [ ] Create server action: `app/actions/feed.ts` with `getMobileFeedAction()`
- [ ] Refactor `/api/mobile/feed/route.ts` to call server action
- [ ] Verify feed works for both authenticated and anonymous users

#### Challenges Endpoint

- [ ] Create server action: `app/actions/challenges.ts` (may already exist)
- [ ] Refactor `/api/mobile/challenges/route.ts` to call server action
- [ ] Refactor `/api/mobile/challenges/claim/route.ts` to call server action

#### User Endpoint

- [ ] Verify `app/actions/user.ts` has necessary functions
- [ ] Refactor `/api/mobile/user/route.ts` to call server action

#### Profiles Endpoints

- [ ] Verify `app/actions/profiles.ts` has necessary functions
- [ ] Refactor `/api/mobile/profiles/route.ts` to call server action
- [ ] Refactor `/api/mobile/profiles/active/route.ts` to call server action
- [ ] Refactor `/api/mobile/profiles/[profileId]/route.ts` to call server action

#### Saved Artworks Endpoint

- [ ] Create/update server action for saved artworks
- [ ] Refactor `/api/mobile/saved-artworks/route.ts` to call server action

#### Colo (Evolution) Endpoint

- [ ] Create/update server action for colo state
- [ ] Refactor `/api/mobile/colo/route.ts` to call server action

#### Stickers Endpoint

- [ ] Create/update server action for stickers
- [ ] Refactor `/api/mobile/stickers/route.ts` to call server action

#### Auth Endpoints (Special Case)

Auth endpoints are different - they CREATE tokens, not consume them:

- [ ] `/api/mobile/auth/register` - Keep as-is (creates initial token)
- [ ] `/api/mobile/auth/me` - Can use unified pattern after middleware update
- [ ] `/api/mobile/auth/link` - Keep as-is (modifies token)
- [ ] `/api/mobile/auth/google` - Keep as-is (OAuth flow)
- [ ] `/api/mobile/auth/apple` - Keep as-is (OAuth flow)
- [ ] `/api/mobile/auth/facebook` - Keep as-is (OAuth flow)
- [ ] `/api/mobile/auth/magic-link/*` - Keep as-is (creates token)

### Phase 3: Cleanup & Documentation

- [ ] Remove `getMobileAuthFromHeaders()` calls from refactored routes
- [ ] Update this document with completed items
- [ ] Add inline documentation to key files
- [ ] Update CLAUDE.md if needed

---

## Current State (Before Refactor)

```
Web App:     Server Action → Service Layer → DB
Mobile API:  API Route     → Service Layer → DB (BYPASSES server actions)
```

**Problems:**

- Business logic duplicated between server actions and API routes
- Different auth mechanisms (`getUserId()` vs `getMobileAuthFromHeaders()`)
- Harder to maintain - changes need to be made in multiple places

---

## Target State (After Refactor)

```
Web App:     Server Action → Service Layer → DB
Mobile API:  API Route → Server Action → Service Layer → DB
```

**Benefits:**

- Single source of truth for business logic
- Unified auth via `getUserId()`
- Changes made once, work everywhere
- Consistent validation and error handling

---

## Example: Feed Endpoint Refactor

### Before (Current)

```typescript
// app/api/mobile/feed/route.ts
export async function GET(request: NextRequest) {
  const { userId } = await getMobileAuthFromHeaders(request.headers);

  let profileId: string | null = null;
  if (userId) {
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { activeProfileId: true },
    });
    profileId = user?.activeProfileId || null;
  }

  const feed = await getMobileFeed(userId, profileId);
  return NextResponse.json(feed, { headers: corsHeaders });
}
```

### After (Refactored)

```typescript
// app/actions/feed.ts
"use server";

import { getUserId, getProfileId } from "@/utils/user";
import { getMobileFeed } from "@/lib/feed/service";

export async function getMobileFeedAction() {
  const userId = await getUserId();
  const profileId = await getProfileId();

  return getMobileFeed(userId, profileId);
}
```

```typescript
// app/api/mobile/feed/route.ts
import { getMobileFeedAction } from "@/app/actions/feed";

const corsHeaders = {
  /* ... */
};

export async function GET() {
  try {
    const feed = await getMobileFeedAction();
    return NextResponse.json(feed, { headers: corsHeaders });
  } catch (error) {
    console.error("Error fetching mobile feed:", error);
    return NextResponse.json(
      { error: "Failed to fetch feed" },
      { status: 500, headers: corsHeaders },
    );
  }
}
```

---

## Special Considerations

### 1. revalidatePath() in Server Actions

Some web server actions use `revalidatePath()` for cache invalidation. This is:

- **Relevant for web** - triggers Next.js ISR revalidation
- **Irrelevant for mobile** - mobile fetches fresh data each time

**Solution:** Keep `revalidatePath()` calls in server actions. They're harmless
for mobile API calls and maintain web functionality.

### 2. Anonymous Users

Mobile supports anonymous (device-only) users who aren't linked to an account:

- `userId` may be null for some endpoints
- Middleware should handle missing JWT gracefully
- Server actions should handle null userId appropriately

### 3. Profile Context

Mobile has an "active profile" concept:

- Middleware extracts `profileId` from JWT and sets `x-profile-id` header
- Create `getProfileId()` utility similar to `getUserId()`
- Some actions need profile context (challenges, stickers, colo evolution)

---

## Migration Notes

### Rollback Plan

If issues arise, the old pattern still works. Each endpoint can be reverted
individually by:

1. Removing the server action call
2. Restoring direct service layer call
3. Using `getMobileAuthFromHeaders()` again

### Testing Strategy

1. Test each endpoint after refactor with:
   - Valid mobile JWT
   - Expired/invalid JWT
   - No JWT (anonymous)
   - Web session (should still work)

2. Verify mobile app functionality end-to-end

---

## Reference: parking-ticket-pal Pattern

This architecture is based on the proven pattern from parking-ticket-pal:

```typescript
// parking-ticket-pal/apps/web/utils/user.ts
export const getUserId = async (action?: string) => {
  const session = await auth();
  const headersList = await headers();

  // Check BOTH sources
  const userId = session?.user.id || headersList.get("x-user-id");

  if (!userId) {
    console.error(`You need to be logged in to ${action}.`);
    return null;
  }
  return userId;
};
```

```typescript
// parking-ticket-pal/apps/web/middleware.ts
if (pathname.startsWith("/api")) {
  if (session) return NextResponse.next();

  const token = req.headers.get("authorization")?.split(" ")[1];
  if (token) {
    const payload = await decrypt(token);
    reqHeaders.set("x-user-id", payload.id);
    reqHeaders.set("x-user-email", payload.email);
  }
}
```

---

## Changelog

| Date     | Change                   | Author |
| -------- | ------------------------ | ------ |
| Jan 2025 | Initial document created | Claude |

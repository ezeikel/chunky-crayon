# Coloring Habitat — Feature Parity Plan

Goal: Bring Coloring Habitat to full feature parity with Chunky Crayon (minus kid-specific features: Colo mascot, stickers, parental gates, multi-profile, age groups, mobile JWT auth).

---

## Phase 1: Payment Infrastructure ✅

- [x] 1.1 Port Stripe webhook handler (GROVE/SANCTUARY/OASIS plans)
- [x] 1.2 Add `formatNumber.ts` and `formatPenniesToPounds.ts` utils
- [x] 1.3 Enhance `utils/stripe.ts` with credit calculations, proration logic
- [x] 1.4 Add `/api/subscription/credit-drip` route
- [x] 1.5 Create Billing page (3-tier: Grove/Sanctuary/Oasis)
- [x] 1.6 Create billing success page
- [x] 1.7 Add `PaymentFailedEmail.tsx` email template
- [x] 1.8 Add `email.ts` server action
- [x] 1.9 Separate Stripe account for Coloring Habitat (acct_1TGNOxPVKi0lifb0)
- [x] 1.10 Create Stripe products, prices, and webhook endpoint
- [x] 1.11 3-tier pricing: Grove £9.99/mo, Sanctuary £17.99/mo, Oasis £29.99/mo

## Phase 2: Core UI Components & Header ✅

- [x] 2.1 Copy 11 shadcn UI primitives
- [x] 2.2 Create Loading component
- [x] 2.5 Create HeaderDropdown with credits display + account menu
- [x] 2.6 Upgrade Header with auth-aware nav
- [x] 2.7 Improve mobile menu
- [x] 2.8 Add sonner Toaster

## Phase 3: Account Pages ✅

- [x] 3.1 Create My Artwork page with delete/share
- [x] 3.2 Create Settings page with community toggle
- [x] 3.3 Port share actions (create/revoke share links, R2 upload)
- [x] 3.4 Create ShareArtworkModal with social sharing
- [x] 3.5 Create shared artwork public page
- [x] 3.6 Add auth middleware protecting `/account/*`
- [x] 3.7 Port entitlements action

## Phase 4: Gallery Enhancements ✅

- [x] 4.1 Create gallery data layer with categories, difficulties, pagination
- [x] 4.2 Port gallery server actions (load-gallery-images, load-more)
- [x] 4.3 Create GalleryGrid component with load-more
- [x] 4.4 Create DifficultyFilter pill selector
- [x] 4.5 Add gallery sub-routes (`/gallery/[category]`, `/gallery/difficulty/[difficulty]`)
- [x] 4.6 Add cacheLife profiles for gallery
- [x] 4.7 Add R2 rewrite in next.config
- [x] 4.8 Add galleryRefresh util
- [x] 4.9 Port PDF generation

## Phase 5: Guest Mode & Conversion ✅

- [x] 5.1 Port `useGuestMode` hook (2 free daily generations via localStorage)
- [x] 5.2 Update `useUser` with guest mode integration (canGenerate/blockedReason)
- [x] 5.3 Add PostHog UserIdentify component
- [x] 5.4 Add proper analytics-client with posthog.capture
- [x] 5.5 Separate PostHog project for Coloring Habitat (phc_QGU3Tyq9FKxBZUsltXExZPmyhZjv3YACxOrB1E7fQnC)
- [x] 5.6 Fix server-side PostHog tracking (per-request client, direct EU endpoint)

## Phase 6: Content, SEO & Polish ✅

- [x] 6.1 Add `/api/canvas/progress` route for cross-session persistence
- [x] 6.2 Add `/api/coloring-image/generate-scene` with Perplexity Sonar + dedup
- [x] 6.3 Add `/gallery/daily` page
- [x] 6.4 Connect Blog to Sanity CMS (project 1od8pera, event-driven auto-generation)
- [x] 6.5 Add RecentCreations component + hook
- [x] ~~6.6 Add Plausible analytics proxy~~ (removed — using PostHog only)
- [ ] 6.7 Add `/admin/social` page
- [x] 6.8 Clean up orphaned kid-specific stubs (deleted 8 files)

## Phase 7: Extract Shared Packages (Future)

Reduce duplication between Chunky Crayon and Coloring Habitat.

- [x] 7.1 `packages/storage` — R2 client (`@one-colored-pixel/storage`)
- [x] 7.2 `packages/canvas` — floodFill, brushTextures, fillPatterns, regionDetection, parseSvg, fetchSvg, iconCursor (`@one-colored-pixel/canvas`)
- [ ] 7.3 `packages/ui` — shadcn components (button, card, dialog, dropdown, etc.)
- [ ] 7.4 `packages/coloring-core` — AI schemas, image providers with `BrandConfig` pattern
- [ ] 7.5 `packages/auth-core` — getUserId, session helpers
- [ ] 7.6 `packages/stripe-shared` — webhook patterns, credit calculations with plan config

---

## Not Applicable (kid-specific, excluded)

- Colo mascot, stickers, parental gates, multi-profile, mobile JWT auth, RevenueCat, i18n, age group filters, holiday pages, weekly challenges

# Coloring Habitat — Feature Parity Plan

Goal: Bring Coloring Habitat to full feature parity with Chunky Crayon (minus kid-specific features: Colo mascot, stickers, parental gates, multi-profile, age groups, mobile JWT auth).

---

## Phase 1: Payment Infrastructure (CRITICAL)

Without this, monetization is broken — Stripe webhook is a stub.

- [x] 1.1 Port Stripe webhook handler (CC's 559-line implementation → Habitat plan names GROVE/SANCTUARY)
- [x] 1.2 Add `formatNumber.ts` and `formatPenniesToPounds.ts` utils
- [x] 1.3 Enhance `utils/stripe.ts` with credit calculations, proration logic
- [x] 1.4 Add `/api/subscription/credit-drip` route for monthly subscriber credit drip
- [x] 1.5 Create Billing page (`/account/billing/page.tsx`) with Billing component
- [x] 1.6 Create billing success page (`/account/billing/success/page.tsx`)
- [x] 1.7 Add `PaymentFailedEmail.tsx` email template
- [x] 1.8 Add `email.ts` server action for sending emails via Resend

## Phase 2: Core UI Components & Header

Enables all subsequent pages — header dropdown, shadcn primitives, layout components.

- [x] 2.1 Copy shadcn UI primitives from CC: button, card, dialog, dropdown-menu, sonner/toast, input, textarea, select, switch, badge, avatar
- [x] 2.2 Create Loading component
- [ ] 2.3 Create PageWrap component
- [ ] 2.4 Create Breadcrumbs component
- [x] 2.5 Create HeaderDropdown with account menu (billing, settings, sign out) + credits display
- [x] 2.6 Upgrade Header to show authenticated nav (My Artwork link), credits pill, dropdown
- [x] 2.7 Improve mobile menu with full nav items and auth state
- [x] 2.8 Add sonner Toaster to root layout for toast notifications

## Phase 3: Account Pages

User retention — artwork management, settings, sharing.

- [ ] 3.1 Create My Artwork page (`/account/my-artwork/page.tsx`)
- [ ] 3.2 Create Settings page (`/account/settings/page.tsx`) with `settings.ts` server action
- [ ] 3.3 Port `share-artwork.ts` and `share.ts` server actions
- [ ] 3.4 Create ShareArtworkModal and SocialShare components
- [ ] 3.5 Create shared artwork page (`/shared/[code]/page.tsx`)
- [ ] 3.6 Add `proxy.ts` for auth protection on `/account/*` routes
- [ ] 3.7 Port `entitlements.ts` server action for feature gating

## Phase 4: Gallery Enhancements

SEO, discoverability, user engagement.

- [ ] 4.1 Create gallery data layer (`/app/data/gallery.ts`) with categories, difficulties, pagination, caching
- [ ] 4.2 Port `load-gallery-images.ts` and `load-more-images.ts` server actions
- [ ] 4.3 Create InfiniteScrollGallery component
- [ ] 4.4 Create DifficultyFilter component (adapted for Habitat theming)
- [ ] 4.5 Add gallery sub-routes: `/gallery/[category]`, `/gallery/difficulty/[difficulty]`, `/gallery/tag/[tag]`
- [ ] 4.6 Add `next.config.ts` cacheLife profiles for gallery pages
- [ ] 4.7 Add R2 rewrite in `next.config.ts` for CORS-free asset serving
- [ ] 4.8 Add `galleryRefresh.ts` util for cache invalidation
- [ ] 4.9 Port PDF generation (`generatePDF.tsx` + `generatePDFNode.tsx`)

## Phase 5: Guest Mode & Conversion

Growth — let anonymous users try before signing up.

- [ ] 5.1 Port `useGuestMode` hook for anonymous free generations
- [ ] 5.2 Update `useUser` hook to integrate guest mode with `canGenerate` / `blockedReason`
- [ ] 5.3 Add analytics identification (PostHog `UserIdentify` component)
- [ ] 5.4 Add conversion tracking (PixelTracker or equivalent)

## Phase 6: Content, SEO & Polish

Long-term growth and quality.

- [ ] 6.1 Add `/api/canvas/progress` route for saving coloring progress cross-session
- [ ] 6.2 Add `/api/coloring-image/generate-scene` for daily scene generation
- [ ] 6.3 Add `/gallery/daily` and `/gallery/community` pages
- [ ] 6.4 Connect Blog to Sanity CMS with `[slug]` and category pages
- [ ] 6.5 Add `RecentCreations` component and hook
- [ ] 6.6 Add Plausible analytics proxy in next.config
- [ ] 6.7 Add `/admin/social` page for content management
- [ ] 6.8 Clean up orphaned kid-specific stubs (ColoEvolutionCelebration, StickerReward, etc.)

---

## Not Applicable (kid-specific, excluded)

- Colo mascot (avatar, evolution, voice)
- Sticker system (book, rewards, selector)
- Parental gates
- Multi-profile system (profiles, profile switching, age groups)
- Mobile JWT auth (`/api/mobile/*`)
- RevenueCat integration
- Language switcher (no i18n for now)
- Age group gallery filters (`/gallery/for-kids`, etc.)
- Holiday themed pages
- Weekly challenges

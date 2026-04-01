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
- [x] 6.7 Add `/admin/social` page with TikTok + Pinterest OAuth, connect/disconnect/test post
- [x] 6.8 Clean up orphaned kid-specific stubs (deleted 8 files)

## Phase 7: Extract Shared Packages ✅

Reduce duplication between Chunky Crayon and Coloring Habitat.

- [x] 7.1 `packages/storage` — R2 client (`@one-colored-pixel/storage`)
- [x] 7.2 `packages/canvas` — floodFill, brushTextures, fillPatterns, regionDetection, parseSvg, fetchSvg, iconCursor (`@one-colored-pixel/canvas`)
- [ ] 7.3 `packages/ui` — DEFERRED. Only 12 small shadcn files, designed for copy-paste. Shared Tailwind config is the real challenge. Cost exceeds value.
- [x] 7.4 `packages/coloring-core` — AI models, tracing with injectable PostHog client (`@one-colored-pixel/coloring-core`). Schemas stay in apps (Zod type inference issue). Prompts/image-providers stay in apps (brand-specific).
- [ ] 7.5 `packages/auth-core` — DEFERRED. Only 125 lines in CH, coupled to `"use server"` + `@/auth` + `@/constants`. Factory pattern overhead exceeds duplication cost.
- [x] 7.6 `packages/stripe-shared` — credit calculations, status mapping, configurable plan helpers (`@one-colored-pixel/stripe-shared`)

## Phase 8: Shared Coloring UI Components (Next)

Extract the core coloring experience into `@one-colored-pixel/coloring-ui` — unstyled/base components that each app themes independently. This is the highest-value remaining extraction (~3,700 lines of identical code that IS the core product).

### Architecture

Base components accept theme/config props and render with CSS variables or `className` overrides. Each app wraps them with brand-specific styling:

```
packages/coloring-ui/         → Base components (logic + structure)
  ├── BaseImageCanvas          → 2,066 lines — canvas engine, brush rendering, touch/mouse handling
  ├── BaseColorPalette         → 80 lines — color grid, selection state
  ├── BaseDesktopColorPalette  → 105 lines — desktop layout wrapper
  ├── BaseMobileColoringToolbar → 616 lines — mobile tool switcher, brush/pattern/color pickers
  ├── BaseColoringArea         → 679 lines — orchestrator (canvas + palette + toolbar)
  └── BaseAutoColorButton      → 125 lines — magic brush trigger

apps/chunky-crayon-web/        → CC wrappers (crayon theme, kid-safe UX)
apps/coloring-habitat-web/     → CH wrappers (nature theme, adult UX)
```

### Key design decisions

- Components use CSS custom properties for colors/spacing — each app sets `--coloring-primary`, `--coloring-bg`, etc.
- Brush types, fill patterns, and color palettes are configuration, not code — passed as props
- Canvas engine (touch handling, undo/redo, stroke rendering) is 100% shared logic
- Toolbar layout can differ between apps but tool switching logic is shared
- Hooks (`useMagicColorMap`, `useColoringProgress`) have small differences — extract shared core, keep app-specific wrappers

### Steps

- [ ] 8.1 Define `ColoringTheme` type and CSS variable contract
- [ ] 8.2 Extract `BaseImageCanvas` — separate rendering logic from styling
- [ ] 8.3 Extract `BaseColorPalette` + `BaseDesktopColorPalette`
- [ ] 8.4 Extract `BaseMobileColoringToolbar` — tool config as props
- [ ] 8.5 Extract `BaseColoringArea` — orchestration logic
- [ ] 8.6 Extract `BaseAutoColorButton`
- [ ] 8.7 Extract shared hooks core (`useColoringEngine`, `useMagicColor`)
- [ ] 8.8 Create CC wrapper components with crayon theme
- [ ] 8.9 Create CH wrapper components with nature/wellness theme
- [ ] 8.10 Delete duplicated component files from both apps

### Audit: Current duplication

| Component             | Lines     | Status                          |
| --------------------- | --------- | ------------------------------- |
| ImageCanvas           | 2,066     | 100% identical between apps     |
| MobileColoringToolbar | 616       | 100% identical                  |
| ColoringArea          | 679       | 100% identical                  |
| AutoColorButton       | 125       | 100% identical                  |
| DesktopColorPalette   | 105       | 100% identical                  |
| ColorPalette          | 80        | 100% identical                  |
| **Total**             | **3,671** | All identical, ready to extract |

### Hooks with differences

| Hook             | Diff              | Reason                             |
| ---------------- | ----------------- | ---------------------------------- |
| useMagicColorMap | 81 changed lines  | Different constants imports        |
| useGuestMode     | 121 changed lines | Different branding/limits          |
| useUser          | 65 changed lines  | Different profile/sticker features |

---

## Phase 9: TikTok API Approval (Pending)

- [x] 9.1 Add `UserSocialAccount` DB model for per-user social tokens
- [x] 9.2 Build user-facing TikTok OAuth + Content Posting API (both apps)
- [x] 9.3 Build TikTok Post Composer component (creator_info, privacy, caption, toggles)
- [x] 9.4 Wire "Share to TikTok" into share modals (both apps)
- [x] 9.5 Feature-flag TikTok sharing in CC (kids app — only visible to admin for demo)
- [ ] 9.6 Register callback URLs in TikTok developer portal
- [ ] 9.7 Record demo video showing end-to-end user flow
- [ ] 9.8 Resubmit TikTok app for Content Posting API (video.publish scope) approval

---

## Not Applicable (kid-specific, excluded)

- Colo mascot, stickers, parental gates, multi-profile, mobile JWT auth, RevenueCat, i18n, age group filters, holiday pages, weekly challenges

# Chunky Crayon Analytics Enhancement Plan

> Created: December 2024 Updated: December 2025 Status: ✅ Phase 1 Complete

## Table of Contents

1. [Current State Analysis](#current-state-analysis)
2. [Existing PostHog Dashboards & Insights](#existing-posthog-dashboards--insights)
3. [Business Questions We Want to Answer](#business-questions-we-want-to-answer)
4. [Tracking Gaps & Implementation Plan](#tracking-gaps--implementation-plan)
5. [New Dashboard Recommendations](#new-dashboard-recommendations)
6. [Implementation Checklist](#implementation-checklist)

---

## Current State Analysis

### Analytics Infrastructure

| Platform             | Purpose                      | Status                      |
| -------------------- | ---------------------------- | --------------------------- |
| **PostHog**          | Primary product analytics    | ✅ Configured (EU instance) |
| **Vercel Analytics** | Performance metrics          | ✅ Configured               |
| **Plausible**        | Privacy-first web analytics  | ✅ Configured               |
| **Facebook Pixel**   | Ad attribution & conversions | ✅ Configured               |
| **Pinterest Tag**    | Ad attribution & conversions | ✅ Configured               |

### Current Tracking Utilities

- **Client-side**: `useAnalytics()` hook in `utils/analytics-client.ts`
- **Server-side**: `track()` and `trackWithUser()` in
  `utils/analytics-server.ts`
- **Pixel utilities**: `utils/pixels.ts` with unified tracking functions
- **User identification**: `UserIdentify.tsx` component

### Events Currently Tracked (~25 of 60+ defined)

| Category            | Tracked        | Not Tracked |
| ------------------- | -------------- | ----------- |
| Authentication      | 1              | 4           |
| Guest Mode          | 2              | 1           |
| Creation Flow       | 1              | 5           |
| Voice/Image Input   | 5              | 3           |
| Coloring Engagement | 2              | 4           |
| Download/Print      | 2              | 1           |
| Email Signup        | 3              | 0           |
| Pricing/Checkout    | 2 (pixel only) | 6           |
| Subscription        | 0              | 4           |
| Credits             | 0              | 3           |
| Marketing           | 0              | 6           |
| Errors              | 0              | 4           |

---

## Existing PostHog Dashboards & Insights

### Dashboards (12 total)

| Dashboard                                 | ID     | Purpose                     | Status      |
| ----------------------------------------- | ------ | --------------------------- | ----------- |
| **Analytics basics**                      | 466328 | Core metrics overview       | ✅ Exists   |
| **Growth & Acquisition**                  | 466343 | User acquisition tracking   | ✅ Exists   |
| **Revenue & Monetization**                | 466341 | Revenue metrics             | ✅ Exists   |
| **User Journey & Engagement**             | 466342 | User behavior funnel        | ✅ Exists   |
| **AI Operations**                         | 466771 | Generation/AI tracking      | ✅ Exists   |
| **Content Analytics - Ad Strategy**       | 466584 | Ad performance              | ✅ Exists   |
| **Email Analytics**                       | 468413 | Email signup tracking       | ✅ Exists   |
| **showAuthButtons Usage**                 | 467107 | Auth component analysis     | ✅ Exists   |
| **Feature Usage**                         | 471230 | Tool/feature usage tracking | ✅ Exists   |
| **Content Discovery**                     | 471231 | Gallery/blog engagement     | ✅ Exists   |
| **Internationalization (i18n) Analytics** | 471232 | Language/locale analytics   | ✅ Enhanced |
| **LLM Analytics**                         | 471294 | AI model usage & costs      | ✅ Exists   |

### Key Existing Insights (53 total)

#### User Metrics

- DAU (Daily Active Users)
- WAU (Weekly Active Users)
- Retention (First Week)
- Retention (First Month)
- Monthly User Signups
- Sign-in by Method

#### Creation & Content

- Coloring Pages Created Over Time
- Creation Funnel (daily, weekly)
- Pages Colored (tracking coloring activity)
- Coloring Activity
- Voice Input Usage
- Image Upload for Generation Usage

#### Conversion & Revenue

- Checkout Completions
- Checkout Conversion Rate
- Revenue by Product Type
- Subscription Lifecycle
- Creation to Download Conversion
- Pricing to Checkout Funnel

#### Downloads & Engagement

- PDF Downloads vs Prints
- Unique Downloaders
- Downloads Over Time
- Email List Signups
- Email List Signups by Page
- Newsletter Signups by Signup Form

---

## Business Questions We Want to Answer

### Conversion & Revenue

1. **Guest to Paid Conversion Rate**
   - How many users use the 2 free guest generations?
   - What % of guests convert to signup?
   - What % of signups convert to paid?
   - Average time from first visit to conversion?

2. **Attribution**
   - Which channel drives highest-converting traffic? (Facebook vs Pinterest vs
     Organic)
   - What's our CAC per channel?
   - Which campaigns perform best?

3. **Subscription Health**
   - Monthly churn rate?
   - Upgrade vs downgrade trends?
   - Credit pack purchase patterns?

### Feature Usage

4. **Tool/Profile Usage**
   - Which profiles/tools are most popular?
   - Do users switch between tools?
   - Which tools correlate with higher retention?

5. **Coloring Experience**
   - What brushes do people use most?
   - Most popular colors?
   - Average time spent coloring?
   - Number of strokes per session?

6. **Generation Patterns**
   - Text vs Voice vs Image input breakdown?
   - What are people generating? (themes/topics)
   - Average generations per user?
   - Peak usage times?

### Engagement

7. **Content Discovery**
   - Gallery page engagement?
   - Blog post views and time on page?
   - Category/filter usage?
   - Stickers page interactions?

8. **Sharing & Virality**
   - Share button usage (social vs link)?
   - Download vs Print ratio?
   - Save to gallery rate?

9. **Internationalization**
   - Language distribution?
   - Language switching behavior?
   - Conversion rates by language?

---

## Tracking Gaps & Implementation Plan

### Priority 1: Revenue & Conversion (Critical)

#### 1.1 Checkout & Payment Events

**File**: `apps/web/app/api/webhooks/stripe/route.ts`

```typescript
// Events to add in Stripe webhook handler:
- CHECKOUT_COMPLETED: { planId, amount, currency, isUpgrade }
- SUBSCRIPTION_STARTED: { planId, interval, amount }
- SUBSCRIPTION_RENEWED: { planId, interval, amount }
- SUBSCRIPTION_CHANGED: { fromPlan, toPlan, isUpgrade }
- SUBSCRIPTION_CANCELLED: { planId, reason?, feedback? }
- CREDITS_PURCHASED: { packId, credits, amount }
```

#### 1.2 Pricing Page Events

**File**: `apps/web/app/[locale]/pricing/page.tsx`

```typescript
// Events to add:
- PRICING_PAGE_VIEWED: { source, userId? }
- PRICING_INTERVAL_TOGGLED: { from, to } // monthly <-> annual
- PRICING_PLAN_CLICKED: { planId, interval, price }
- PRICING_CREDITS_CLICKED: { packId, credits, price }
```

#### 1.3 Guest Conversion Funnel

**Files**: Various signup CTAs

```typescript
// Track when guest users click signup prompts:
- GUEST_SIGNUP_CLICKED: { source, generationsUsed, prompt }
```

### Priority 2: User Engagement (High)

#### 2.1 Profile/Tool Switching

**File**: `apps/web/components/ProfileSwitcher/` (or equivalent)

```typescript
- PROFILE_SWITCHED: { fromProfile, toProfile, userId }
- PROFILE_VIEWED: { profileId, profileName }
```

#### 2.2 Coloring Experience

**File**: `apps/web/components/ImageCanvas/ImageCanvas.tsx`

```typescript
// Enhanced tracking:
- PAGE_VIEWED: { imageId, source, isGuest }
- PAGE_COLORED: { imageId, duration, strokeCount }
- BRUSH_SELECTED: { brushType, previousBrush }
- PAGE_SAVED: { imageId, hasColoring }
- PAGE_SHARED: { imageId, method: 'social' | 'link', platform? }
```

#### 2.3 Gallery & Content

**Files**: Gallery, Blog, Stickers pages

```typescript
- GALLERY_VIEWED: { filter?, category?, page }
- GALLERY_IMAGE_CLICKED: { imageId, position }
- BLOG_POST_VIEWED: { postSlug, readTime }
- STICKERS_PAGE_VIEWED: { category? }
- STICKER_SELECTED: { stickerId, stickerName }
```

#### 2.4 Category & Filtering

**File**: Category/filter components

```typescript
- CATEGORY_SELECTED: { categoryId, categoryName, source }
- FILTER_APPLIED: { filterType, filterValue }
- SEARCH_PERFORMED: { query, resultsCount }
```

### Priority 3: Generation Insights (Medium)

#### 3.1 Creation Flow Enhancement

**File**:
`apps/web/components/CreateColoringPageForm/CreateColoringPageForm.tsx`

```typescript
// Add these events:
- CREATION_STARTED: { inputMode, isGuest }
- INPUT_MODE_CHANGED: { from, to }
- CREATION_COMPLETED: { inputMode, generationTime, promptLength }
- CREATION_FAILED: { inputMode, error, retryCount }
- CREATION_RETRIED: { inputMode, previousError }
```

#### 3.2 Prompt Analysis (Server-side)

**File**: `apps/web/actions/coloring-image.ts`

```typescript
// Enhanced generation tracking:
- IMAGE_GENERATION_COMPLETED: {
    promptLength,
    promptTheme?, // AI-detected theme
    inputMode,
    generationTime,
    modelUsed
  }
```

### Priority 4: Internationalization (Medium)

#### 4.1 Language Tracking

**File**: Language switcher component

```typescript
- LANGUAGE_CHANGED: { from, to, page }
- Enrich all events with: { locale }
```

### Priority 5: Marketing & Discovery (Lower)

#### 5.1 CTA & Social Tracking

**Various files**

```typescript
- CTA_CLICKED: { ctaId, ctaText, location, variant }
- SOCIAL_LINK_CLICKED: { platform, location }
- TESTIMONIAL_CLICKED: { testimonialId, action }
- APP_STORE_CLICKED: { platform: 'ios' | 'android', location }
```

#### 5.2 Error Tracking

**File**: `apps/web/app/global-error.tsx` and error boundaries

```typescript
- ERROR_OCCURRED: { type, message, page, userId? }
- ERROR_API: { endpoint, status, message }
- ERROR_GENERATION: { step, error, inputMode }
- ERROR_PAYMENT: { step, error, amount? }
```

---

## New Dashboard Recommendations

Based on existing dashboards, these are the **gaps** that need new dashboards:

### NEW: Feature Usage Dashboard

**Purpose**: Understand how people use product features (NOT currently covered)

| Insight                 | Type | Query                           | Status              |
| ----------------------- | ---- | ------------------------------- | ------------------- |
| Profile/Tool Usage      | Bar  | profile_switched by profileId   | 🔴 Needs event      |
| Popular Colors          | Bar  | page_color_selected by color    | 🔴 Needs event      |
| Brush Usage             | Bar  | brush_selected by brushType     | 🔴 Needs event      |
| Input Mode Distribution | Pie  | creation_submitted by inputMode | ⚠️ Partially exists |
| Sticker Usage           | Bar  | sticker_selected by stickerName | 🔴 Needs event      |

### NEW: Content Discovery Dashboard

**Purpose**: Understand content engagement (NOT currently covered)

| Insight            | Type  | Query                             | Status         |
| ------------------ | ----- | --------------------------------- | -------------- |
| Gallery Views      | Trend | gallery_viewed over time          | 🔴 Needs event |
| Popular Categories | Bar   | category_selected by categoryName | 🔴 Needs event |
| Blog Engagement    | Table | blog_post_viewed with read time   | 🔴 Needs event |
| Search Terms       | Table | search_performed by query         | 🔴 Needs event |

### NEW: Internationalization Dashboard

**Purpose**: Track multi-language performance (NOT currently covered)

| Insight                | Type  | Query                               | Status                          |
| ---------------------- | ----- | ----------------------------------- | ------------------------------- |
| Users by Language      | Pie   | By locale property                  | ⚠️ Need to add locale to events |
| Conversion by Language | Bar   | Funnel completion by locale         | ⚠️ Need to add locale to events |
| Language Switches      | Trend | language_changed over time          | 🔴 Needs event                  |
| Popular Languages      | Table | With user count and conversion rate | ⚠️ Need to add locale to events |

### ENHANCE: User Journey & Engagement Dashboard

**Purpose**: Add missing guest conversion tracking

| Insight                 | Type       | Query                                          | Status                  |
| ----------------------- | ---------- | ---------------------------------------------- | ----------------------- |
| Guest → Signup Rate     | Funnel     | guest_generation_used → auth_sign_up_completed | ⚠️ May need enhancement |
| Guest Signup CTA Clicks | Trend      | guest_signup_clicked over time                 | 🔴 Needs event          |
| Share Rate              | Percentage | page_shared / page_viewed                      | 🔴 Needs event          |
| Saved Images            | Trend      | page_saved over time                           | 🔴 Needs event          |

### ENHANCE: Revenue & Monetization Dashboard

**Purpose**: Add Stripe webhook events for better subscription tracking

| Insight               | Type  | Query                                      | Status         |
| --------------------- | ----- | ------------------------------------------ | -------------- |
| Subscription Renewals | Trend | subscription_renewed over time             | 🔴 Needs event |
| Plan Changes          | Table | subscription_changed (upgrades/downgrades) | 🔴 Needs event |
| Credit Pack Sales     | Trend | credits_purchased over time                | 🔴 Needs event |
| Churn Rate            | Trend | subscription_cancelled / total active      | 🔴 Needs event |

---

## Implementation Checklist

> **Note**: 8 dashboards and 53 insights already exist in PostHog. This
> checklist focuses on **true gaps**.

### Phase 1: Revenue & Subscription Events (High Priority) ✅ COMPLETE

**Goal**: Add Stripe webhook tracking to enhance existing Revenue dashboard

- [x] Add Stripe webhook event tracking
      (`apps/web/app/api/payment/webhook/route.ts`)
  - [x] `SUBSCRIPTION_STARTED` - track new subscriptions
  - [x] `SUBSCRIPTION_RENEWED` - track renewals
  - [x] `SUBSCRIPTION_CHANGED` - track upgrades/downgrades
  - [x] `SUBSCRIPTION_CANCELLED` - track cancellations with reason
  - [x] `CREDITS_PURCHASED` - track credit pack sales
- [x] Add pricing page PostHog events (currently pixel-only)
  - [x] `PRICING_PAGE_VIEWED` - track page views
  - [x] `PRICING_INTERVAL_TOGGLED` - monthly ↔ annual toggle
  - [x] `PRICING_PLAN_CLICKED` - which plan clicked
- [x] Add `GUEST_SIGNUP_CLICKED` to signup CTAs
- [x] **LLM Analytics**: Integrated via `@posthog/ai` with `withTracing()` for
      automatic observability

### Phase 2: New Feature Tracking (High Priority)

**Goal**: Track newly added features not in current analytics

- [ ] Profile/Tool switching
  - [ ] `PROFILE_SWITCHED` - which profile switched to
  - [ ] `PROFILE_VIEWED` - profile page views
- [ ] Stickers page
  - [ ] `STICKERS_PAGE_VIEWED`
  - [ ] `STICKER_SELECTED` - which sticker selected
- [ ] Gallery page
  - [ ] `GALLERY_VIEWED` - with filter/category context
  - [ ] `GALLERY_IMAGE_CLICKED` - image position tracking
- [ ] Blog page
  - [ ] `BLOG_POST_VIEWED` - post slug and read time
- [ ] Category/filtering
  - [ ] `CATEGORY_SELECTED`
  - [ ] `FILTER_APPLIED`
  - [ ] `SEARCH_PERFORMED`
- [ ] **Dashboard**: Create NEW "Feature Usage" dashboard
- [ ] **Dashboard**: Create NEW "Content Discovery" dashboard

### Phase 3: Coloring & Sharing (Medium Priority)

**Goal**: Enhanced coloring experience tracking

- [ ] Coloring enhancements
  - [ ] `BRUSH_SELECTED` - brush type changes
  - [ ] `COLOR_SELECTED` - popular colors tracking
  - [ ] Enhance `PAGE_COLORED` with stroke count
- [ ] Sharing & saving
  - [ ] `PAGE_SAVED` - save to gallery tracking
  - [ ] `PAGE_SHARED` - social vs link share
  - [ ] `SHARE_PLATFORM_SELECTED` - which social platform
- [ ] **Dashboard**: Enhance existing "User Journey & Engagement" dashboard

### Phase 4: Internationalization (Medium Priority) ✅ COMPLETE

**Goal**: Multi-language performance tracking

- [x] Add `locale` as PostHog user property ✅ **Set on initial load
      (UserIdentify) and updated on switch (LanguageSwitcher)**
- [x] `LANGUAGE_CHANGED` - track language switches ✅ **Implemented in
      LanguageSwitcher component**
- [x] **Dashboard**: Enhanced existing "Internationalization (i18n) Analytics"
      dashboard ✅ **Dashboard ID: 471232**
  - Top Countries by Usage (world map - existing)
  - Locale Usage Over Time (trend - existing)
  - Creations by Locale (bar chart - existing)
  - Users by Language (pie chart by locale user property - added)
  - Language Switches Over Time (trend of language_changed events - added)
  - Language Switch Destinations (toLocale breakdown - added)
  - Language Switch Origins (fromLocale table - added)

### Phase 5: Error & CTA Tracking (Lower Priority)

- [ ] Error tracking
  - [ ] `ERROR_OCCURRED` - client-side errors
  - [ ] `ERROR_API` - API failures
  - [ ] `ERROR_GENERATION` - generation failures
- [ ] Marketing CTA tracking
  - [ ] `CTA_CLICKED` - with CTA location/variant
  - [ ] `SOCIAL_LINK_CLICKED` - footer/header social links
- [ ] Review all existing dashboards for optimization

---

## Event Property Standards

All events should include these base properties when applicable:

```typescript
interface BaseEventProperties {
  // User context
  userId?: string;
  isGuest: boolean;
  locale: string;

  // Session context
  sessionId?: string;

  // Attribution
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;

  // Device
  device: 'mobile' | 'tablet' | 'desktop';
  browser?: string;

  // Page context
  page: string;
  referrer?: string;
}
```

---

## Notes

- All events are type-safe via TypeScript enums in `constants.ts`
- PostHog is configured for EU hosting (GDPR compliance)
- Facebook & Pinterest pixels handle ad attribution
- Server-side tracking is used for critical events (payments, generations)
- Client-side tracking for user interactions

---

## Summary: What Exists vs What's Missing

### ✅ Already Covered (8 dashboards, 53 insights)

- Daily/Weekly active users
- Basic retention tracking
- Creation funnel (generation → download)
- Voice input & image upload usage
- Checkout completions & conversion rates
- Email signup tracking
- PDF downloads vs prints
- Basic subscription lifecycle

### ✅ Implemented in Phase 1 (December 2025)

| Category             | Implemented Events                                                                                                    |
| -------------------- | --------------------------------------------------------------------------------------------------------------------- |
| **Subscriptions**    | `SUBSCRIPTION_STARTED`, `SUBSCRIPTION_RENEWED`, `SUBSCRIPTION_CHANGED`, `SUBSCRIPTION_CANCELLED`, `CREDITS_PURCHASED` |
| **Pricing**          | `PRICING_PAGE_VIEWED`, `PRICING_INTERVAL_TOGGLED`, `PRICING_PLAN_CLICKED`                                             |
| **Guest Conversion** | `GUEST_SIGNUP_CLICKED`, `GUEST_GENERATION_USED`, `GUEST_LIMIT_REACHED`                                                |
| **LLM Analytics**    | Automatic via `@posthog/ai` integration with `withTracing()` - tracks latency, tokens, costs, errors for all AI calls |

### 🔴 Missing Events (Future Phases)

| Category              | Missing Events                                                                                            |
| --------------------- | --------------------------------------------------------------------------------------------------------- |
| **Profiles/Tools**    | `PROFILE_SWITCHED`, `PROFILE_VIEWED`                                                                      |
| **Content Discovery** | `GALLERY_VIEWED`, `GALLERY_IMAGE_CLICKED`, `BLOG_POST_VIEWED`, `STICKERS_PAGE_VIEWED`, `STICKER_SELECTED` |
| **Categories**        | `CATEGORY_SELECTED`, `FILTER_APPLIED`, `SEARCH_PERFORMED`                                                 |
| **Coloring**          | `BRUSH_SELECTED`, `COLOR_SELECTED` (enhanced)                                                             |
| **Sharing**           | `PAGE_SAVED`, `PAGE_SHARED`, `SHARE_PLATFORM_SELECTED`                                                    |
| **i18n**              | ✅ `locale` user property, ✅ `LANGUAGE_CHANGED` event - **COMPLETE**                                     |
| **Errors**            | `ERROR_OCCURRED`, `ERROR_API`, `ERROR_GENERATION`                                                         |
| **Marketing**         | `CTA_CLICKED`, `SOCIAL_LINK_CLICKED`                                                                      |

### 🆕 New Dashboards Needed

1. ~~**Feature Usage** - Profile/tool switching, brush/color usage, stickers~~
   ✅ **EXISTS (Dashboard ID: 471230)**
2. ~~**Content Discovery** - Gallery, blog, categories, search~~ ✅ **EXISTS
   (Dashboard ID: 471231)**
3. ~~**Internationalization** - Language distribution, conversion by locale~~ ✅
   **ENHANCED (Dashboard ID: 471232)**

### 🔧 Dashboards to Enhance

1. **Revenue & Monetization** - Add Stripe webhook events
2. **User Journey & Engagement** - Add sharing/saving tracking

---

## Next Steps

1. ~~**Start with Phase 1** - Revenue events have highest business impact~~ ✅
   **COMPLETE**
2. **Continue with Phase 2** - Feature tracking (profiles, stickers, gallery,
   blog)
3. **Create new dashboards** as events are added
4. **Add locale to all events** for internationalization insights
5. Consider PostHog feature flags for future A/B testing

---

## Changelog

### December 2025

- ✅ Completed Phase 1: Revenue & Subscription Events
- ✅ Added all Stripe webhook event tracking (subscriptions, credits)
- ✅ Added pricing page analytics (page views, interval toggle, plan clicks)
- ✅ Added guest signup tracking (clicks, generations, limits)
- ✅ Integrated LLM analytics via `@posthog/ai` with automatic tracing
- ✅ Added `LANGUAGE_CHANGED` event tracking in LanguageSwitcher component
- ✅ Added `locale` as PostHog user property (set on load, updated on switch)
- ✅ **Completed Phase 4: Internationalization** - Enhanced existing dashboard
  (ID: 471232) with 4 new insights:
  - Users by Language insight (pie chart)
  - Language Switches Over Time insight (trend)
  - Language Switch Destinations insight (toLocale breakdown)
  - Language Switch Origins insight (fromLocale table)

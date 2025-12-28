# Chunky Crayon Internationalization Plan

> Strategic plan for implementing multi-language support to maximize MRR growth

## Executive Summary

This document outlines the internationalization (i18n) strategy for Chunky Crayon, a SaaS kids coloring app targeting parents of children aged 3-8. Based on market research and technical analysis, we will implement a phased rollout prioritizing high-value markets with proven willingness to pay for premium children's educational apps.

**Current State:** English-only (en-GB)
**Target:** 6 languages across 3 phases
**Expected MRR Impact:** 40-60% revenue increase within 18 months
**Technical Approach:** next-intl with Next.js 16 cache components

---

## Market Analysis & Language Prioritization

### Tier 1: Highest Priority (Launch Q1 2026)

#### 1. Japanese (日本語)

| Metric | Value |
|--------|-------|
| Market Size | $70M+ kids app market |
| ARPU Potential | ⭐⭐⭐⭐⭐ |
| Cultural Fit | ⭐⭐⭐⭐⭐ |
| Expected MRR Impact | 15-20% of total revenue |

**Why Japanese is #1:**
- 14-15% of Asia-Pacific kids app market
- Proven high willingness to pay for premium subscriptions (Speak language app hit $1B valuation largely from Japan/Korea)
- Deep cultural appreciation for illustration, manga art, and creative activities
- High iOS penetration = higher ARPU
- Average education app subscription: $8.13/month (our £7.99 Crayon tier is well-positioned)

**Localization Notes:**
- Need culturally appropriate imagery (anime-style characters, kawaii aesthetics)
- Voice input must work flawlessly with Japanese speech recognition
- Consider LINE Pay integration for payments

#### 2. Korean (한국어)

| Metric | Value |
|--------|-------|
| Market Size | Significant edtech market |
| ARPU Potential | ⭐⭐⭐⭐⭐ |
| Cultural Fit | ⭐⭐⭐⭐⭐ |
| Expected MRR Impact | 10-15% of total revenue |

**Why Korean is #2:**
- Highest digital literacy globally with government-backed edtech initiatives
- Proven alongside Japan for premium app subscriptions
- Extremely high expectations for children's educational tools
- Strong cultural emphasis on early childhood development
- High smartphone penetration with premium price tolerance

**Localization Notes:**
- K-style illustrations may resonate better
- Parents expect polished, professional UX
- Consider Kakao Pay integration

### Tier 2: Strong Secondary Markets (Launch Q2 2026)

#### 3. German (Deutsch)

| Metric | Value |
|--------|-------|
| Market Size | 9% of European market ($190M) |
| ARPU Potential | ⭐⭐⭐⭐⭐ |
| Cultural Fit | ⭐⭐⭐⭐ |
| Expected MRR Impact | 12-18% of total revenue |

**Why German:**
- Highest purchasing power in Europe
- Cultural value on quality educational tools
- 28% global market share for kids apps in Europe
- Serves Austria and parts of Switzerland (3 countries, 1 language investment)
- Germans research thoroughly before buying, but are loyal subscribers

**Localization Notes:**
- Detailed product descriptions expected
- Privacy/GDPR compliance crucial
- Quality over flashiness in messaging

#### 4. French (Français)

| Metric | Value |
|--------|-------|
| Market Reach | France + Canada + Belgium + Switzerland |
| ARPU Potential | ⭐⭐⭐⭐ |
| Cultural Fit | ⭐⭐⭐⭐ |
| Expected MRR Impact | 8-12% of total revenue |

**Why French:**
- Multi-market reach with single translation investment
- Canada shows 8% of North American market with strong bilingual demand
- France is developed European market with high purchasing power
- 68% of parents prioritize educational apps

### Tier 3: Volume Markets (Launch Q3-Q4 2026)

#### 5. Spanish (Español)

| Metric | Value |
|--------|-------|
| Market Size | Massive addressable population |
| ARPU Potential | ⭐⭐⭐ |
| Cultural Fit | ⭐⭐⭐⭐ |
| Expected MRR Impact | 5-10% of total revenue |

**Strategy:**
- Launch in Spain first (European pricing tolerance)
- Selectively expand to high-income Latin American markets (Mexico, Chile, Argentina)
- May need 30-50% pricing discount for LATAM

#### 6. Nordic Languages (Future Consideration)

- Highest ARPU globally (Netherlands 1.62x US pricing)
- 90-95% penetration for learning apps
- **Problem:** Small population (~27M combined)
- **Decision:** Wait until localization infrastructure is mature

---

## Technical Architecture

### Current Stack Analysis

```
Framework: Next.js 16.1.0 (with cache components)
Rendering: Static generation with PPR (Partial Pre-Rendering)
CMS: Sanity (for blog content)
Auth: NextAuth 5.0
Payments: Stripe
```

### i18n Library Selection: next-intl

**Why next-intl:**
- Official Next.js ecosystem library
- Full App Router support with Server Components
- Compatible with Next.js 16 caching (`cacheLife`, `cacheTag`)
- Type-safe translations with TypeScript
- Proven in production (aqaryo reference project)

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                         PROXY                                │
│  - Locale detection (URL → Accept-Language → Cookie)        │
│  - URL rewriting (/gallery → /en/gallery)                   │
│  - Redirect handling                                         │
│  - Runs on Node.js runtime (not Edge)                       │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    app/[locale]/...                          │
│  - All routes nested under locale segment                    │
│  - Layout loads translations via getMessages()               │
│  - NextIntlClientProvider wraps app                         │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│              packages/translations                           │
│  - Shared translation files (en.json, ja.json, etc.)        │
│  - TypeScript types for translation keys                    │
│  - Exported for use in web app                              │
└─────────────────────────────────────────────────────────────┘
```

### Directory Structure

```
chunky-crayon/
├── packages/
│   └── translations/              # NEW: Shared translations package
│       ├── src/
│       │   ├── en.json           # English (base)
│       │   ├── ja.json           # Japanese
│       │   ├── ko.json           # Korean
│       │   ├── de.json           # German
│       │   ├── fr.json           # French
│       │   ├── es.json           # Spanish
│       │   └── index.ts          # Exports with types
│       └── package.json
│
├── apps/web/
│   ├── proxy.ts                   # NEW: Locale routing (Next.js 16+)
│   ├── i18n/
│   │   ├── routing.ts            # NEW: Locale config
│   │   └── request.ts            # NEW: Server request config
│   ├── app/
│   │   ├── layout.tsx            # Root layout (minimal)
│   │   └── [locale]/             # NEW: All routes under locale
│   │       ├── layout.tsx        # Locale-specific layout
│   │       ├── page.tsx          # Home
│   │       ├── gallery/
│   │       │   ├── page.tsx
│   │       │   └── [category]/
│   │       ├── coloring-image/
│   │       ├── account/
│   │       ├── pricing/
│   │       ├── blog/
│   │       └── ...
│   └── components/
│       └── ui/
│           └── TranslatedText.tsx  # NEW: Helper component
```

### Caching Strategy with i18n

Next.js 16 cache components require locale-aware caching:

```typescript
// next.config.ts updates
const nextConfig = {
  cacheLife: {
    // Existing profiles remain, cache is per-locale automatically
    'blog-list': { stale: 3600, revalidate: 86400, expire: 2592000 },
    'blog-post': { stale: 86400, revalidate: 604800, expire: 7776000 },
    'gallery-category': { stale: 21600, revalidate: 86400, expire: 2592000 },
    // ... etc
  },
  cacheComponents: true,
};
```

**Key Insight:** With `app/[locale]/` structure, Next.js automatically creates separate cache entries per locale. No additional configuration needed.

### Static Generation with Locales

```typescript
// app/[locale]/gallery/[category]/page.tsx
import { routing } from '@/i18n/routing';

export async function generateStaticParams() {
  const categories = await getCategories();

  // Generate for each locale × category combination
  return routing.locales.flatMap((locale) =>
    categories.map((category) => ({
      locale,
      category: category.slug,
    }))
  );
}
```

**Build Impact:**
- Current: ~500 static pages
- With 6 locales: ~3,000 static pages
- Mitigation: Use ISR for less-critical pages, prioritize en/ja/ko for initial static generation

---

## Translation Scope

### Content Categories

| Category | Items | Priority | Notes |
|----------|-------|----------|-------|
| UI Strings | ~500 keys | P0 | Navigation, buttons, forms |
| Gallery Categories | 40+ | P0 | Category names, descriptions |
| Pricing/Plans | 3 tiers | P0 | Plan names, features, CTAs |
| Error Messages | ~50 | P0 | User-facing errors |
| SEO Metadata | ~30 pages | P0 | Titles, descriptions, OG tags |
| Blog Content | Dynamic | P1 | Via Sanity i18n fields |
| Legal Pages | 2 | P1 | Privacy policy, terms |
| Email Templates | ~10 | P2 | Transactional emails |
| AI Prompts | ~20 | P2 | Default generation prompts |

### Translation File Structure

```json
// en.json example
{
  "common": {
    "loading": "Loading...",
    "error": "Something went wrong",
    "retry": "Try again",
    "save": "Save",
    "cancel": "Cancel"
  },
  "navigation": {
    "home": "Home",
    "gallery": "Gallery",
    "pricing": "Pricing",
    "account": "Account",
    "signIn": "Sign In",
    "signOut": "Sign Out"
  },
  "homepage": {
    "heroTitle": "Create magical coloring pages with AI",
    "heroSubtitle": "Just describe what you want to color and watch it come to life",
    "cta": "Start Creating",
    "features": {
      "aiGeneration": {
        "title": "AI-Powered Creation",
        "description": "Describe any scene and our AI creates a perfect coloring page"
      }
    }
  },
  "gallery": {
    "browseByCategory": "Browse by Category",
    "browseByDifficulty": "Browse by Difficulty",
    "browseByAge": "Browse by Age Group",
    "dailyPage": "Today's Daily Coloring Page",
    "community": "Community Creations",
    "categories": {
      "animals": "Animals",
      "dragons": "Dragons",
      "unicorns": "Unicorns",
      "princesses": "Princesses",
      "space": "Space",
      "vehicles": "Vehicles"
    },
    "difficulty": {
      "beginner": "Beginner",
      "intermediate": "Intermediate",
      "advanced": "Advanced",
      "expert": "Expert"
    },
    "ageGroups": {
      "toddlers": "For Toddlers (2-4)",
      "kids": "For Kids (5-8)",
      "teens": "For Teens (9-12)",
      "adults": "For Adults"
    }
  },
  "coloringPage": {
    "tools": {
      "pan": "Pan",
      "fill": "Fill",
      "brush": "Brush",
      "magicColor": "Magic Color",
      "magicReveal": "Magic Reveal"
    },
    "actions": {
      "save": "Save",
      "download": "Download",
      "share": "Share",
      "print": "Print"
    }
  },
  "pricing": {
    "title": "Choose Your Plan",
    "monthly": "Monthly",
    "yearly": "Yearly",
    "plans": {
      "crayon": {
        "name": "Crayon",
        "price": "{{price}}/month",
        "description": "Perfect for casual creators"
      },
      "palette": {
        "name": "Palette",
        "price": "{{price}}/month",
        "description": "For the creative family"
      },
      "studio": {
        "name": "Studio",
        "price": "{{price}}/month",
        "description": "Unlimited creativity"
      }
    }
  },
  "account": {
    "profiles": "Profiles",
    "billing": "Billing",
    "settings": "Settings",
    "myArtwork": "My Artwork"
  },
  "auth": {
    "signIn": "Sign In",
    "signUp": "Sign Up",
    "signOut": "Sign Out",
    "continueWithGoogle": "Continue with Google",
    "continueWithApple": "Continue with Apple"
  },
  "errors": {
    "generic": "Something went wrong. Please try again.",
    "notFound": "Page not found",
    "unauthorized": "Please sign in to continue"
  },
  "seo": {
    "home": {
      "title": "Chunky Crayon - AI Coloring Pages for Kids",
      "description": "Create magical coloring pages with AI. Perfect for kids aged 3-8."
    }
  }
}
```

---

## Implementation Phases

### Phase 1: Foundation (Weeks 1-4)

**Goal:** Set up i18n infrastructure with English as the base

#### Week 1-2: Core Infrastructure
- [x] Create `packages/translations` workspace ✅
- [x] Install and configure `next-intl` ✅
- [x] Create `proxy.ts` for locale routing (Next.js 16 uses proxy instead of middleware) ✅
- [x] Set up `i18n/routing.ts` and `i18n/request.ts` ✅
- [x] Restructure app to `app/[locale]/...` ✅

#### Week 3-4: String Extraction
- [x] Extract all hardcoded strings from components ✅
- [x] Create `en.json` with proper namespacing ✅ (568 lines, comprehensive)
- [x] Update components to use `useTranslations()` hook ✅ (13+ components)
- [ ] Convert `constants.ts` to locale-aware functions
- [ ] Update SEO metadata to be locale-aware

**Deliverable:** English-only app working with i18n infrastructure ✅ COMPLETE

### Phase 2: Japanese & Korean (Weeks 5-10)

**Goal:** Launch in highest-value Asian markets

**Status:** 🚧 IN PROGRESS

#### Week 5-6: Translation
- [x] AI translation of all strings to Japanese (Claude) ✅
- [x] AI translation of all strings to Korean (Claude) ✅
- [ ] Native speaker review for quality assurance
- [ ] Adjust AI prompt defaults for each locale

#### Week 7-8: Localization
- [ ] Add Japanese/Korean fonts (Noto Sans JP/KR)
- [ ] Test voice input in Japanese/Korean
- [ ] Localize date/number formatting
- [ ] Create locale-specific OG images

#### Week 9-10: Testing & Launch
- [ ] QA testing in both languages
- [ ] Performance testing with additional locales
- [ ] Soft launch to beta users
- [ ] Monitor analytics and fix issues

**Deliverable:** Live Japanese and Korean versions

### Phase 3: German (Weeks 11-14)

**Goal:** Establish European presence

- [ ] AI translation to German (Claude/GPT-4)
- [ ] Native speaker review for quality assurance
- [ ] GDPR compliance review
- [ ] German-specific payment methods (if needed)
- [ ] European App Store optimization

**Deliverable:** Live German version

### Phase 4: French & Spanish (Weeks 15-20)

**Goal:** Complete initial language rollout

- [ ] AI translation to French (Claude/GPT-4)
- [ ] AI translation to Spanish (Claude/GPT-4)
- [ ] Native speaker review for each language
- [ ] Regional pricing strategy for LATAM
- [ ] Full SEO localization

**Deliverable:** All 6 languages live

---

## Database Schema Updates

```prisma
// packages/db/prisma/schema.prisma additions

model User {
  // ... existing fields

  preferredLocale String @default("en") // NEW

  // For locale-specific content preferences
  @@index([preferredLocale])
}

model ColoringImage {
  // ... existing fields

  // For AI-generated descriptions in multiple languages
  titleTranslations Json? // { "en": "...", "ja": "...", ... }
}
```

---

## SEO Strategy

### URL Structure
```
https://chunkycrayon.com/en/gallery
https://chunkycrayon.com/ja/gallery
https://chunkycrayon.com/ko/gallery
https://chunkycrayon.com/de/gallery
```

### Hreflang Implementation
```typescript
// In generateMetadata()
alternates: {
  canonical: `https://chunkycrayon.com/${locale}/gallery`,
  languages: {
    'en': 'https://chunkycrayon.com/en/gallery',
    'ja': 'https://chunkycrayon.com/ja/gallery',
    'ko': 'https://chunkycrayon.com/ko/gallery',
    'de': 'https://chunkycrayon.com/de/gallery',
    'fr': 'https://chunkycrayon.com/fr/gallery',
    'es': 'https://chunkycrayon.com/es/gallery',
    'x-default': 'https://chunkycrayon.com/en/gallery',
  },
}
```

### Locale-Specific Metadata
Each page generates unique metadata per locale including:
- Title and description in local language
- Locale-appropriate keywords
- OG images with localized text (Phase 2)

---

## Analytics & Tracking

### PostHog Events
```typescript
// Track language preferences
posthog.capture('language_changed', {
  from_locale: previousLocale,
  to_locale: newLocale,
});

posthog.capture('page_view', {
  locale: currentLocale,
  // ... other properties
});
```

### Key Metrics to Track
- Conversion rate by locale
- Subscription rate by locale
- Feature usage by locale
- Bounce rate by locale
- Time on site by locale

---

## Risk Mitigation

### Build Time Concerns
**Risk:** 6x increase in static pages could slow builds significantly

**Mitigation:**
1. Use ISR for less-critical pages
2. Implement incremental static regeneration
3. Consider on-demand revalidation
4. Phase locale rollout to manage complexity

### Translation Quality
**Risk:** Poor translations damage brand perception

**Mitigation:**
1. Use AI translation (Claude/GPT-4) with proper context and prompting
2. Native speaker review for each language (can use Fiverr/Upwork for cost-effective review)
3. Establish glossary of key terms to maintain consistency
4. Implement in-app feedback mechanism for translation issues
5. Iterative improvement based on user feedback

### Cultural Appropriateness
**Risk:** AI-generated content may not be culturally appropriate

**Mitigation:**
1. Review AI prompt defaults per locale
2. Curate locale-specific starter galleries
3. Partner with local content reviewers
4. Monitor user feedback by region

---

## Cost Estimates

### AI Translation Approach (Recommended)

| Item | Estimated Cost | Notes |
|------|---------------|-------|
| AI Translation (all 5 langs) | ~$50-100 | Claude/GPT-4 API costs for ~10,000 words × 5 |
| Native Speaker Review (JP) | $100-200 | Fiverr/Upwork reviewer |
| Native Speaker Review (KR) | $100-200 | Fiverr/Upwork reviewer |
| Native Speaker Review (DE) | $100-200 | Fiverr/Upwork reviewer |
| Native Speaker Review (FR) | $100-200 | Fiverr/Upwork reviewer |
| Native Speaker Review (ES) | $100-200 | Fiverr/Upwork reviewer |
| Additional Build Infra | $50-100/month | CI/CD capacity |
| **Total Initial** | **$600-1,100** | One-time |
| Ongoing Maintenance | $50-100/month | AI translation + occasional reviews |

### AI Translation Benefits

1. **Cost Reduction:** ~95% cheaper than professional translation services
2. **Speed:** Translate entire codebase in hours, not weeks
3. **Consistency:** AI maintains terminology consistency across all strings
4. **Iterative:** Easy to re-translate with improved prompts
5. **Context-Aware:** Can provide app context for better translations

### AI SDK Translation Implementation

Since we already use Vercel AI SDK (`@ai-sdk/openai`, `@ai-sdk/google`), we can build a translation script:

**Recommended Model:** `gpt-4.1` or `claude-opus-4-5` - Prioritizing translation quality over speed

| Model | Translation Quality | Speed | Context | Notes |
|-------|-------------------|-------|---------|-------|
| GPT-4.1 | ⭐ Best | Fast | 1M tokens | Excellent instruction following, supports JSON mode |
| Claude Opus 4.5 | ⭐ Best | Medium | 200K | Exceptional reasoning, maintains brand voice |
| o3 / o4-mini | Excellent | Medium | 128K | Reasoning models, best for complex tasks |
| GPT-4o | Good | Fast | 128K | Legacy fallback |

> **Latest Models (Dec 2025):**
> - [GPT-4.1](https://openai.com/index/gpt-4-1/) - Improved instruction following, 1M token context, lower cost than GPT-4.5
> - [o3 / o4-mini](https://openai.com/index/introducing-o3-and-o4-mini/) - Latest reasoning models for math, science, coding

**Add @ai-sdk/anthropic for Claude (optional, excellent quality):**
```bash
pnpm add @ai-sdk/anthropic
```

### Translation Scripts

We have translation scripts in `packages/translations/scripts/`:

#### translate.ts - Main Translation Script

**Location:** `packages/translations/scripts/translate.ts`

**Features:**
- Uses OpenAI SDK with **structured JSON output** (`response_format: { type: 'json_object' }`) for reliable parsing
- Only translates **missing keys** (incremental translation - doesn't re-translate existing strings)
- Batches translations (50 keys per API call) to avoid token limits
- Preserves ICU plural syntax and placeholders

**Usage:**
```bash
# Translate all missing keys for all locales
pnpm tsx packages/translations/scripts/translate.ts

# Translate specific locales only
pnpm tsx packages/translations/scripts/translate.ts es fr

# Requires OPENAI_API_KEY environment variable
export OPENAI_API_KEY=your-api-key
```

#### audit-translations.ts - Translation Audit

**Location:** `packages/translations/scripts/audit-translations.ts`

**Features:**
- Compares translation files across all locales
- Finds missing keys (in target but not in English)
- Finds extra keys (in target but not in English)
- Detects potentially untranslated strings (values matching English exactly)

**Usage:**
```bash
pnpm tsx packages/translations/scripts/audit-translations.ts
```

#### Why Structured JSON Output?

The translation script uses OpenAI's `response_format: { type: 'json_object' }` instead of manually parsing markdown:

```typescript
// ✅ Reliable - structured JSON output
const response = await openai.chat.completions.create({
  model: 'gpt-4o',
  messages: [...],
  response_format: { type: 'json_object' },  // Guarantees valid JSON
  temperature: 0.3,
});
const translatedObj = JSON.parse(response.choices[0]?.message?.content);

// ❌ Fragile - manual markdown cleaning
const { text } = await generateText({ model: openai('gpt-4o'), prompt });
let cleaned = text.replace(/```json/g, '').replace(/```/g, '');  // Can fail
```

**Translation Workflow:**
```bash
# 1. Add new English strings to en.json
# 2. Run translation script
pnpm tsx packages/translations/scripts/translate.ts

# 3. Audit for any issues
pnpm tsx packages/translations/scripts/audit-translations.ts

# 4. Build translations package
pnpm build --filter=@chunky-crayon/translations

# 5. Test in browser
```

### Quality Assurance Process

1. **AI Translation:** Generate initial translations with context-rich prompts
2. **Automated Checks:** Validate JSON structure, check for missing keys
3. **Native Review:** Fiverr/Upwork reviewer checks for naturalness and cultural fit
4. **In-App Testing:** Test strings in context within the actual UI
5. **User Feedback:** Implement "Report translation issue" feature
6. **Iterate:** Improve translations based on feedback

---

## Success Metrics

### Phase 1 (Foundation)
- [ ] Zero regressions in English experience
- [ ] Build time < 2x current
- [ ] All pages render correctly with locale prefix

### Phase 2 (Japanese & Korean)
- [ ] 100+ signups from Japan/Korea in first month
- [ ] Conversion rate within 80% of English baseline
- [ ] < 5% increase in support tickets related to localization

### Phase 3+ (Full Rollout)
- [ ] 30-40% of MRR from non-English markets within 12 months
- [ ] Customer satisfaction scores consistent across languages
- [ ] Organic traffic growth in target markets

---

## References

- [next-intl Documentation](https://next-intl-docs.vercel.app/)
- [Next.js 16 Internationalization](https://nextjs.org/docs/app/building-your-application/routing/internationalization)
- [Next.js 16 Proxy (replaces Middleware)](https://nextjs.org/docs/app/api-reference/file-conventions/proxy)
- [Middleware to Proxy Migration Guide](https://nextjs.org/docs/messages/middleware-to-proxy)
- Aqaryo Reference Implementation: `/Users/ezeikel/Development/Personal/aqaryo`

---

## Next.js 16 Proxy Notes

In Next.js 16, `middleware.ts` has been renamed to `proxy.ts`. Key differences:

1. **File rename:** `middleware.ts` → `proxy.ts`
2. **Function rename:** `middleware()` → `proxy()`
3. **Runtime:** Runs on Node.js runtime (not Edge)
4. **Purpose:** Clarifies the network boundary role for request routing

```typescript
// proxy.ts (Next.js 16+)
import createProxy from "next-intl/proxy"; // Note: next-intl may need updates
import { routing } from "./i18n/routing";

export function proxy(request: NextRequest) {
  // Locale detection and routing logic
}

export const config = {
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
```

> **Note:** Verify next-intl compatibility with Next.js 16 proxy.ts before implementation. The library may need updates or have a migration guide.

---

*Last Updated: December 2025*
*Owner: Chunky Crayon Team*

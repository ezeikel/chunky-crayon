# Pricing Page Improvement Plan

## Status: ✅ COMPLETED

### Completed

- [x] Analyzed current pricing page implementation
- [x] Identified feature gating discrepancies
- [x] Reviewed credits ecosystem analysis (competitive research)
- [x] Drafted new copy strategy
- [x] Review and approve new copy
- [x] Update `packages/translations/src/en.json` (pricing section)
- [x] Update `apps/web/constants.ts` (featureKeys)
- [x] Add "What's Included" platform section to pricing page UI
- [x] Make FAQ component reusable with namespace prop
- [x] Add pricing-specific FAQ to pricing page
- [x] Add commercial use license to Terms of Service

### Remaining (Optional)

- [ ] Update other language files (es, fr, de, ja, ko)
- [ ] Test and deploy

---

## Executive Summary

The pricing page has two problems:

1. **Fake tier differentiators** - "Advanced editing", "Early access", "Bulk
   generation" don't exist or aren't gated
2. **Missing platform value** - Our real advantages vs competitors (online
   coloring, stickers, mobile apps) aren't shown

**Solution:** Remove fake features, add "What's Included" section showing
platform value, simplify tiers to credits + rollover.

---

## Current vs Proposed

### Current Feature Keys

```
SPLASH:  textPrompts, wordsNumbers, adjustments, photoToColoring
RAINBOW: allSplashFeatures, advancedEditing, earlyAccess, rollover1Month
SPARKLE: allRainbowFeatures, bulkGeneration, commercialUse, rollover2Months
```

### Problems

| Feature         | Claimed       | Reality                    |
| --------------- | ------------- | -------------------------- |
| advancedEditing | Rainbow+ only | Everyone gets same editing |
| earlyAccess     | Rainbow+ only | No beta program exists     |
| bulkGeneration  | Sparkle only  | Feature doesn't exist      |

### Our Real Advantages (vs Color Bliss)

These are NOT mentioned on pricing page:

- Online coloring (unique)
- Save to account & favorites
- Share with friends
- Sticker collectibles & gamification
- Mobile apps (iOS + Android)

---

## New Copy

### Hero

**Current:**

```
heroTitle: "Plans for every coloring adventure!"
heroSubtitle: "Whether you're a parent, a young artist, or a grown-up who loves to color..."
```

**Proposed:**

```
heroTitle: "More than just coloring pages"
heroSubtitle: "Create, color online, collect stickers, and share with friends. Pick a plan that fits your family."
```

### NEW: "What's Included" Section (Above Plans)

Show what ALL subscribers get - the platform features that beat competitors:

```json
"included": {
  "title": "Every plan includes",
  "aiCreation": "AI-powered coloring page creation",
  "colorOnline": "Color online or download to print",
  "saveFavorites": "Save favorites to your account",
  "shareCreations": "Share creations with friends",
  "collectStickers": "Collect stickers & earn rewards",
  "mobileApps": "iOS & Android apps"
}
```

### Plan Cards

#### SPLASH (£7.99/mo)

**Current features:**

- Create coloring pages from text prompts
- Create coloring pages with words, names, and numbers
- Adjust color, contrast, and brightness
- Turn photos into coloring pages

**Proposed features:**

- 250 credits/month (~50 pages)
- All platform features
- Credits reset monthly

**Tagline:** "Great for occasional creators"

#### RAINBOW (£13.99/mo) - Most Popular

**Current features:**

- All Splash Plan features
- Advanced editing features ← REMOVE
- Early access to new models ← REMOVE
- Credits roll over (1 month)

**Proposed features:**

- 500 credits/month (~100 pages)
- All platform features
- Unused credits roll over (1 month)
- Priority support

**Tagline:** "Perfect for creative families"

#### SPARKLE (£24.99/mo)

**Current features:**

- All Rainbow Plan features
- Bulk generation ← REMOVE
- Commercial use ← KEEP
- Credits roll over (2 months)

**Proposed features:**

- 1,000 credits/month (~200 pages)
- All platform features
- Extended rollover (2 months)
- Commercial use license

**Tagline:** "For serious creators"

### FAQ Updates

**Update rollover answer:**

```
"Splash credits reset each month. Rainbow rolls over up to 1 month of credits. Sparkle gives you 2 months of rollover."
```

**Add new FAQ:**

```
creditsPerPage:
  question: "How many pages can I make?"
  answer: "Each page costs about 5 credits. Splash = ~50 pages/month, Rainbow = ~100, Sparkle = ~200."
```

---

## Implementation

### File 1: `packages/translations/src/en.json`

Update the pricing section:

```json
"pricing": {
  "heroTitle": "More than just coloring pages",
  "heroSubtitle": "Create, color online, collect stickers, and share with friends. Pick a plan that fits your family.",

  "included": {
    "title": "Every plan includes",
    "aiCreation": "AI-powered coloring page creation",
    "colorOnline": "Color online or download to print",
    "saveFavorites": "Save favorites to your account",
    "shareCreations": "Share creations with friends",
    "collectStickers": "Collect stickers & earn rewards",
    "mobileApps": "iOS & Android apps"
  },

  "plans": {
    "splash": {
      "name": "Splash",
      "tagline": "Great for occasional creators",
      "audience": "Try the full platform at our entry price"
    },
    "rainbow": {
      "name": "Rainbow",
      "tagline": "Perfect for creative families",
      "audience": "Our most popular plan for regular use"
    },
    "sparkle": {
      "name": "Sparkle",
      "tagline": "For serious creators",
      "audience": "Best value for heavy users and small businesses"
    }
  },

  "features": {
    "credits250": "250 credits/month (~50 pages)",
    "credits500": "500 credits/month (~100 pages)",
    "credits1000": "1,000 credits/month (~200 pages)",
    "allFeatures": "All platform features",
    "noRollover": "Credits reset monthly",
    "rollover1Month": "Unused credits roll over (1 month)",
    "rollover2Months": "Extended rollover (2 months)",
    "prioritySupport": "Priority support",
    "commercialUse": "Commercial use license"
  },

  "faq": {
    "cancelAnytime": {
      "question": "Can I cancel anytime?",
      "answer": "Yes! Cancel your subscription anytime, no questions asked."
    },
    "rollover": {
      "question": "Do credits roll over?",
      "answer": "Splash credits reset each month. Rainbow rolls over up to 1 month. Sparkle gives you 2 months of rollover."
    },
    "creditsPerPage": {
      "question": "How many pages can I make?",
      "answer": "Each page costs about 5 credits. Splash = ~50 pages/month, Rainbow = ~100, Sparkle = ~200."
    },
    "audience": {
      "question": "Is this for kids or adults?",
      "answer": "Both! Chunky Crayon is perfect for families, kids, and grown-ups who love to color."
    },
    "gettingStarted": {
      "question": "How do I get started?",
      "answer": "Pick a plan and start creating coloring pages instantly!"
    }
  }
}
```

### File 2: `apps/web/constants.ts`

Update featureKeys:

```typescript
// SPLASH - monthly
featureKeys: [
  'credits250',
  'allFeatures',
  'noRollover',
],

// RAINBOW - monthly
featureKeys: [
  'credits500',
  'allFeatures',
  'rollover1Month',
  'prioritySupport',
],

// SPARKLE - monthly
featureKeys: [
  'credits1000',
  'allFeatures',
  'rollover2Months',
  'commercialUse',
],
```

### File 3: `apps/web/app/[locale]/pricing/page.tsx`

Add "What's Included" section above plan cards:

```tsx
{
  /* What's Included Section */
}
<FadeIn direction="up" delay={0.1}>
  <section className="mb-12 text-center">
    <h2 className="font-tondo text-2xl font-bold mb-6">
      {t('included.title')}
    </h2>
    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 max-w-3xl mx-auto">
      <IncludedFeature icon={Sparkles} text={t('included.aiCreation')} />
      <IncludedFeature icon={Palette} text={t('included.colorOnline')} />
      <IncludedFeature icon={Bookmark} text={t('included.saveFavorites')} />
      <IncludedFeature icon={Share2} text={t('included.shareCreations')} />
      <IncludedFeature icon={Star} text={t('included.collectStickers')} />
      <IncludedFeature icon={Smartphone} text={t('included.mobileApps')} />
    </div>
  </section>
</FadeIn>;
```

---

## Summary

| Element        | Before               | After                         |
| -------------- | -------------------- | ----------------------------- |
| Hero           | Generic              | Platform-focused              |
| Platform value | Not shown            | New "What's Included" section |
| Tier features  | Fake differentiators | Simple: credits + rollover    |
| Credits        | "250 credits/month"  | "250 credits (~50 pages)"     |
| Rollover FAQ   | Vague                | Specific per tier             |

---

## Decisions Made

1. **Priority support** - ✅ Keep for Rainbow+ tier
2. **Commercial use** - ✅ Added Section 3.4 to Terms of Service with permitted
   uses, restrictions, and clarification that Splash/Rainbow are personal use
   only
3. **Annual bonus credits** - ❌ Skipped for now

---

## Implementation Summary

### Files Modified

| File                                     | Changes                                                            |
| ---------------------------------------- | ------------------------------------------------------------------ |
| `apps/web/components/FAQ/FAQ.tsx`        | Made reusable with `namespace` prop (`'homepage'` \| `'pricing'`)  |
| `packages/translations/src/en.json`      | New hero copy, "included" section, honest features, pricing FAQ    |
| `apps/web/constants.ts`                  | Updated all 6 plan featureKeys                                     |
| `apps/web/app/[locale]/pricing/page.tsx` | Added "What's Included" section + `<FAQ namespace="pricing" />`    |
| `apps/web/app/[locale]/terms/page.tsx`   | Updated Section 3 plans + added Section 3.4 Commercial Use License |

---

_Last updated: December 29, 2025_

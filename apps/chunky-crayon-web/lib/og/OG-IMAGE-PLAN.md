# Chunky Crayon OG Image Implementation Plan

Based on the pattern from
[Auntie Marlene's project](/Users/ezeikel/Development/Personal/auntie-marlenes/apps/web),
this document outlines the OG image generation strategy for Chunky Crayon.

## Overview

We're implementing dynamic OG image generation using Next.js `ImageResponse`
(from `next/og`) with:

- **Local custom fonts**: Tondo (playful headings) + Rooney Sans (body)
- **Brand colors**: Warm analogous palette (coral, peach, yellow, cream)
- **Kid-friendly design**: Rounded corners, playful elements, warm tones

## Architecture

```
apps/web/
├── lib/og/
│   ├── fonts.ts          ✅ Font loading utilities
│   ├── constants.ts      ✅ Colors, gradients, design tokens
│   ├── data.ts           ✅ Data fetching for OG images
│   └── OG-IMAGE-PLAN.md  ✅ This document
│
├── app/
│   ├── opengraph-image.tsx           ✅ Generic/homepage OG
│   │
│   └── [locale]/
│       ├── coloring-image/
│       │   └── [id]/
│       │       └── opengraph-image.tsx   ✅ Dynamic coloring image OG
│       │
│       ├── blog/
│       │   └── [slug]/
│       │       └── opengraph-image.tsx   ✅ Dynamic blog post OG
│       │
│       └── shared/
│           └── [code]/
│               └── opengraph-image.tsx   ✅ Shared artwork OG
│
└── app/og-preview/
    └── page.tsx                      ✅ Preview/debug page
```

Legend: ✅ Done | ⬜ Pending | 🚧 In Progress

---

## 1. Generic Homepage OG Image

**Location**: `/app/opengraph-image.tsx`

**Design**:

- Warm cream gradient background with paper texture
- Chunky Crayon logo/wordmark prominently displayed
- Tagline: "Creative Coloring & Learning Fun"
- Decorative crayon elements (colored bars/circles)
- Key features badges: "10,000+ Images", "AI-Generated", "Printable"

**Colors**:

- Background: Cream gradient (#FDF8F3 → #F5EDE5)
- Text: Warm charcoal (#3D3330)
- Accents: Crayon Orange (#E37748)

---

## 2. Coloring Image OG

**Location**: `/app/[locale]/coloring-image/[id]/opengraph-image.tsx`

**Data Source**: Prisma database via `getColoringImageById()`

**Design**:

- Left side: The actual coloring image (thumbnail/SVG)
  - White card background with shadow
  - Rounded corners
- Right side: Text content
  - Image title (Tondo Bold, large)
  - Description (Rooney Sans, smaller)
  - Tags as pill badges
  - Difficulty indicator
  - Branding: "Chunky Crayon" with logo

**Features**:

- Fallback to generic OG if image not found
- Uses `svgUrl` or `url` for the preview
- Shows difficulty level with color coding

---

## 3. Blog Post OG

**Location**: `/app/[locale]/blog/[slug]/opengraph-image.tsx`

**Data Source**: Sanity CMS via `getPost()`

**Design**:

- Featured image as background (blurred) or left side
- Title prominently displayed
- Author name + avatar
- Category badges
- Publication date
- Read time indicator
- Branding footer

**Notes**:

- Uses Sanity's `urlFor()` for image URLs
- Falls back to generic blog OG if no featured image

---

## 4. Shared Artwork OG

**Location**: `/app/[locale]/shared/[code]/opengraph-image.tsx`

**Data Source**: `ArtworkShare` model with `SavedArtwork`

**Design**:

- Colorful gradient background with decorative stars and circles
- Decorative crayon stripe bars at top and bottom
- Centered: The colored artwork image in a white frame
- Title (truncated to 40 chars)
- "Created by [Profile Name]" (uses profile name, not user's full name for
  privacy)
- "Chunky Crayon" branding footer

**Purpose**: When users share their colored artwork on social media

---

## 5. OG Preview Page

**Location**: `/app/og-preview/page.tsx`

**Features**:

- View all OG images in one place
- Social media preview mockups (Twitter, Facebook)
- Direct links to test with validators
- Sample content for each type

---

## Font Loading

```typescript
// Load local fonts from public/fonts/
const [tondoBold, rooneySansRegular, rooneySansBold] = await Promise.all([
  loadTondoBold(),
  loadRooneySansRegular(),
  loadRooneySansBold(),
]);

// Use in ImageResponse
new ImageResponse(jsx, {
  width: 1200,
  height: 630,
  fonts: [
    { name: 'Tondo', data: tondoBold, weight: 700 },
    { name: 'Rooney Sans', data: rooneySansRegular, weight: 400 },
    { name: 'Rooney Sans', data: rooneySansBold, weight: 700 },
  ],
});
```

---

## Color Palette

| Name          | HSL         | Hex     | Usage              |
| ------------- | ----------- | ------- | ------------------ |
| Crayon Orange | 12 75% 58%  | #E37748 | Primary accent     |
| Crayon Pink   | 355 65% 72% | #E89CA5 | Secondary accent   |
| Crayon Yellow | 42 95% 62%  | #F5C842 | Highlights         |
| Crayon Green  | 85 35% 52%  | #8FAA66 | Success/difficulty |
| Text Primary  | 20 20% 22%  | #3D3330 | Main text          |
| BG Cream      | 38 55% 97%  | #FDF8F3 | Background         |

---

## Technical Notes

1. **Runtime**: Use `export const runtime = 'nodejs'` (required for Prisma
   queries)
2. **Dimensions**: 1200x630px (standard OG size)
3. **Format**: PNG output
4. **Caching**: Uses Next.js file-based route caching
5. **Fonts**: Loaded from local files (not Google Fonts)

---

## Testing

1. **Local**: Visit `/og-preview` to see all OG images
2. **Facebook**: https://developers.facebook.com/tools/debug/
3. **Twitter**: https://cards-dev.twitter.com/validator
4. **LinkedIn**: https://www.linkedin.com/post-inspector/

---

## Progress Tracking

- [x] Create font loading utility (`lib/og/fonts.ts`)
- [x] Create design constants (`lib/og/constants.ts`)
- [x] Create data fetching utilities (`lib/og/data.ts`)
- [x] Implement generic homepage OG (`app/opengraph-image.tsx`)
- [x] Implement coloring image dynamic OG
      (`app/[locale]/coloring-image/[id]/opengraph-image.tsx`)
- [x] Implement blog post dynamic OG
      (`app/[locale]/blog/[slug]/opengraph-image.tsx`)
- [x] Implement shared artwork dynamic OG
      (`app/[locale]/shared/[code]/opengraph-image.tsx`)
- [x] Create OG preview page (`app/og-preview/page.tsx`)
- [x] Test with browser and fix issues (locale redirect, text overflow)

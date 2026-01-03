# Colo's Sticker Album - Complete Implementation Guide

**Last Updated:** December 26, 2024 **Status:** Phase 1 In Progress

---

## Context (PRESERVE THIS)

### Why Stickers Over Streaks?

We specifically decided AGAINST traditional streak/daily login mechanics
because:

1. **Screen time is parent-controlled** - Kids can't maintain streaks when
   parents limit usage
2. **Streaks punish absence** - Missing a day feels bad, which is harmful for
   children ages 3-8
3. **Pressure creates anxiety** - Daily requirements add stress rather than fun
4. **Real life happens** - Vacations, sick days shouldn't break progress

**Stickers are better because:**

- Celebrate what they DO, not what they missed
- No time pressure - unlock at their own pace
- Collection joy - kids naturally love collecting things
- Permanent progress - stickers can't be lost
- Rewards the core activity (coloring) not logging in

---

## Implementation Status

### Completed ✅

1. **Type Definitions** - `lib/stickers/types.ts`
   - `StickerRarity`: common, uncommon, rare, legendary
   - `StickerCategory`: milestone, category, special, color, exploration
   - `UnlockConditionType`: artwork_count, category_count, first_category, etc.
   - `Sticker`, `UserStickerData`, `ArtworkStats` types

2. **Sticker Catalog** - `lib/stickers/catalog.ts`
   - 24 stickers defined with unlock conditions
   - Helper functions: `getStickerById`, `getStickersByCategory`,
     `getStickersByRarity`
   - Uses placeholder SVG URL with TODOs for Colo illustrations

3. **Database Schema** - `packages/db/prisma/schema.prisma`

   ```prisma
   model UserSticker {
     id         String   @id @default(cuid())
     userId     String
     user       User     @relation(fields: [userId], references: [id], onDelete: Cascade)
     profileId  String?
     profile    Profile? @relation(fields: [profileId], references: [id])
     stickerId  String   // References catalog ID (not FK - stickers are static)
     isNew      Boolean  @default(true) // Shows "NEW!" badge until viewed
     unlockedAt DateTime @default(now())

     @@unique([userId, stickerId]) // No duplicate stickers
     @@map("user_stickers")
   }
   ```

   - Migration applied: `20251226082927_add_user_stickers`

4. **Unlock Service** - `lib/stickers/service.ts`
   - `checkAndAwardStickers(userId, profileId?)` - Checks conditions, awards new
     stickers
   - `getUserArtworkStats()` - Gets artwork counts by category
   - `normalizeCategory()` - Maps tags to sticker categories
   - `checkUnlockCondition()` - Evaluates unlock conditions
   - `getUserStickers()` - Gets all stickers for sticker book
   - `markStickersAsViewed()` - Removes "NEW" badge
   - `getStickerStats()` - Stats for dashboard

5. **Server Actions** - `app/actions/stickers.ts`
   - `getMyStickers()` - Get current user's stickers
   - `markStickersViewed()` - Mark stickers as seen
   - `getMyStickerStats()` - Get sticker stats

6. **Save Artwork Integration** - `app/actions/saved-artwork.ts`
   - Modified `saveArtworkToGallery()` to call `checkAndAwardStickers()`
   - Returns `newStickers: Sticker[]` in success response

### In Progress 🔄

7. **StickerBook Component** - Display all stickers (unlocked + locked)
8. **StickerReward Component** - Celebration animation when unlocking

### Pending ⏳

9. **My Artwork Page** - Add sticker book link and stats
10. **Sticker Art** - Create 24 Colo SVG illustrations

---

## Sticker Catalog Reference

### Milestone Stickers (Artwork Count)

| ID              | Name            | Requirement  | Rarity    |
| --------------- | --------------- | ------------ | --------- |
| first-steps     | First Steps     | 1 artwork    | Common    |
| getting-started | Getting Started | 3 artworks   | Common    |
| high-five       | High Five       | 5 artworks   | Common    |
| perfect-ten     | Perfect Ten     | 10 artworks  | Uncommon  |
| super-artist    | Super Artist    | 25 artworks  | Rare      |
| master-creator  | Master Creator  | 50 artworks  | Legendary |
| century-club    | Century Club    | 100 artworks | Legendary |

### Category Stickers (First in Theme)

| ID              | Name            | Category  | Rarity |
| --------------- | --------------- | --------- | ------ |
| animal-friend   | Animal Friend   | animals   | Common |
| fantasy-dreamer | Fantasy Dreamer | fantasy   | Common |
| space-explorer  | Space Explorer  | space     | Common |
| nature-lover    | Nature Lover    | nature    | Common |
| vehicle-driver  | Vehicle Driver  | vehicles  | Common |
| dino-hunter     | Dino Hunter     | dinosaurs | Common |
| ocean-diver     | Ocean Diver     | ocean     | Common |
| food-lover      | Food Lover      | food      | Common |
| sports-star     | Sports Star     | sports    | Common |
| holiday-spirit  | Holiday Spirit  | holidays  | Common |

### Category Master Stickers (5+ in Theme)

| ID             | Name           | Category | Rarity   |
| -------------- | -------------- | -------- | -------- |
| animal-master  | Animal Master  | animals  | Uncommon |
| fantasy-master | Fantasy Master | fantasy  | Uncommon |
| space-master   | Space Master   | space    | Uncommon |

### Exploration Stickers

| ID                | Name              | Requirement         | Rarity   |
| ----------------- | ----------------- | ------------------- | -------- |
| category-explorer | Category Explorer | 3 unique categories | Uncommon |
| world-traveler    | World Traveler    | 5 unique categories | Rare     |

---

## File Structure

```
apps/web/
├── lib/stickers/
│   ├── index.ts          # Exports
│   ├── types.ts          # Type definitions
│   ├── catalog.ts        # 24 sticker definitions
│   └── service.ts        # Unlock logic
├── app/actions/
│   ├── stickers.ts       # Server actions
│   └── saved-artwork.ts  # Modified to award stickers
├── components/
│   ├── StickerBook/      # TODO: Collection view
│   └── StickerReward/    # TODO: Celebration
└── public/images/stickers/
    └── placeholder.svg   # TODO: 24 Colo illustrations
```

---

## Component Specifications

### StickerBook Component

**Purpose:** Display all stickers (locked and unlocked) in a collectible album
view.

**Layout:**

- Grid of stickers (3-4 columns on mobile, 5-6 on desktop)
- Category tabs for filtering
- Progress bar at top (X of 24 collected)

**Sticker States:**

1. **Unlocked** - Full color, can tap for details
2. **Locked** - Silhouette with "?" and hint text
3. **New** - Unlocked + "NEW!" badge (pulsing)

**Details Modal:**

- Sticker image large
- Name and description
- Unlock message
- Unlock date
- Rarity indicator (glow/sparkle based on rarity)

### StickerReward Component

**Purpose:** Celebrate when user earns new sticker(s).

**Animation Flow:**

1. Screen dims slightly
2. Sticker floats to center with bounce
3. Glow effect based on rarity
4. Confetti burst
5. Sound effect plays
6. Unlock message appears
7. "Add to Album" button

**Props:**

```tsx
type StickerRewardProps = {
  stickers: Sticker[];
  onComplete: () => void;
};
```

**Behavior:**

- If multiple stickers unlocked, show carousel
- Each sticker gets its moment
- Auto-advance after 3 seconds or tap to continue

---

## Category Mapping

Tags from ColoringImage are mapped to sticker categories:

```typescript
const categoryMappings = {
  animals: ["animal", "animals", "pet", "cat", "dog", "bird", "fish"],
  fantasy: [
    "fantasy",
    "magic",
    "unicorn",
    "dragon",
    "fairy",
    "wizard",
    "castle",
  ],
  space: ["space", "astronaut", "rocket", "planet", "star", "moon", "alien"],
  nature: ["nature", "flower", "tree", "forest", "garden", "plant"],
  vehicles: ["vehicle", "car", "truck", "train", "plane", "boat"],
  dinosaurs: ["dinosaur", "dino", "prehistoric", "t-rex", "jurassic"],
  ocean: ["ocean", "sea", "underwater", "beach", "whale", "dolphin", "shark"],
  food: ["food", "fruit", "vegetable", "cake", "dessert", "cooking"],
  sports: ["sport", "soccer", "football", "basketball", "baseball", "tennis"],
  holidays: ["holiday", "christmas", "halloween", "easter", "birthday"],
};
```

---

## Art Assets Needed

Each sticker needs a custom Colo illustration (SVG format):

| Sticker ID        | Description                   |
| ----------------- | ----------------------------- |
| first-steps       | Colo holding a crayon proudly |
| getting-started   | Colo with 3 crayons           |
| high-five         | Colo giving high five         |
| perfect-ten       | Colo wearing medal            |
| super-artist      | Colo with superhero cape      |
| master-creator    | Colo with crown               |
| century-club      | Colo with golden paintbrush   |
| animal-friend     | Colo wearing animal ears      |
| fantasy-dreamer   | Colo as wizard with hat       |
| space-explorer    | Colo as astronaut             |
| nature-lover      | Colo with flower crown        |
| vehicle-driver    | Colo driving tiny car         |
| dino-hunter       | Colo riding a dinosaur        |
| ocean-diver       | Colo with snorkel and mask    |
| food-lover        | Colo as chef with hat         |
| sports-star       | Colo holding trophy           |
| holiday-spirit    | Colo with party hat           |
| animal-master     | Colo surrounded by animals    |
| fantasy-master    | Colo as powerful wizard       |
| space-master      | Colo standing on moon         |
| category-explorer | Colo with explorer map        |
| world-traveler    | Colo with suitcase            |

---

## Future Retention Features

After stickers are complete, the next features in priority order:

1. **Colo Evolution** - Mascot grows with engagement (6 stages)
2. **Weekly Challenges** - Optional themed goals (not daily streaks)
3. **Shareable Galleries** - Safe sharing with family

See `RETENTION_MECHANICS.md` for full details on these future features.

---

## Testing Checklist

- [ ] Save first artwork → "First Steps" sticker unlocks
- [ ] Save 3 artworks → "Getting Started" unlocks
- [ ] Save animal-tagged artwork → "Animal Friend" unlocks
- [ ] Save 5 animal artworks → "Animal Master" unlocks
- [ ] Save from 3 categories → "Category Explorer" unlocks
- [ ] Sticker book shows all 24 stickers
- [ ] Locked stickers show as silhouettes
- [ ] New stickers have "NEW!" badge
- [ ] Viewing sticker removes "NEW!" badge
- [ ] Celebration plays on unlock
- [ ] Multiple stickers show carousel

---

## Notes for AI Context

**Key Decision:** We chose stickers over streaks because streaks punish kids for
not using the app daily, which conflicts with parent-controlled screen time.

**Architecture:** Stickers are defined in static code (catalog.ts), not
database. Only user's unlocked stickers are stored in DB. This makes adding new
stickers easy without migrations.

**Integration Point:** `saveArtworkToGallery()` in
`app/actions/saved-artwork.ts` calls `checkAndAwardStickers()` and returns new
stickers to the client for celebration display.

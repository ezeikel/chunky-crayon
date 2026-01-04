# Progress Preview Thumbnails

## Overview

Currently, the homescreen/dashboard shows blank SVG outlines for coloring pages and only displays colored artwork for explicitly saved items (`SavedArtwork`). Users with in-progress work (stored in `CanvasProgress`) see no visual indication of their progress in previews.

This plan implements preview thumbnail generation for in-progress coloring work, so users can see a visual preview of their work-in-progress on the homescreen/dashboard.

## Current Architecture

### Data Models

```
ColoringImage
├── svgUrl (blank SVG outline)
└── url (raster preview of blank outline)

CanvasProgress
├── userId
├── coloringImageId
├── actions (JSON - stroke/fill/sticker data)
├── canvasWidth/canvasHeight
└── version

SavedArtwork
├── imageUrl (full raster image with colors)
├── thumbnailUrl (optimized thumbnail)
└── coloringImageId
```

### Current Display Logic

| Location     | Mobile                  | Web                     |
| ------------ | ----------------------- | ----------------------- |
| Feed/Gallery | `svgUrl` (blank)        | `svgUrl` (blank)        |
| Recent Art   | `SavedArtwork.imageUrl` | N/A                     |
| My Artwork   | `SavedArtwork.imageUrl` | `SavedArtwork.imageUrl` |

### Problem

- `CanvasProgress` only stores action data (paths, colors, coordinates)
- No rendered preview exists for in-progress work
- Users can't see their coloring progress on homescreen without opening each image

## Solution Architecture

### Approach: Client-Side Capture + Server Storage

When canvas progress is saved, the client captures a thumbnail from the current canvas state and uploads it alongside the action data.

**Why this approach:**

- Simplest implementation (no server-side canvas rendering needed)
- Canvas already rendered on client - just need to export
- Works with both web Canvas 2D and mobile Skia
- Minimal additional compute cost

### Schema Changes

```prisma
model CanvasProgress {
  id              String   @id @default(cuid())
  userId          String
  coloringImageId String
  actions         Json
  canvasWidth     Int?
  canvasHeight    Int?
  previewUrl      String?  // NEW: URL to progress thumbnail
  previewUpdatedAt DateTime? // NEW: Track when preview was last updated
  version         Int      @default(1)
  updatedAt       DateTime @updatedAt
  createdAt       DateTime @default(now())

  user          User          @relation(fields: [userId], references: [id], onDelete: Cascade)
  coloringImage ColoringImage @relation(fields: [coloringImageId], references: [id], onDelete: Cascade)

  @@unique([userId, coloringImageId])
  @@index([userId])
  @@index([coloringImageId])
  @@map("canvas_progress")
}
```

### Thumbnail Specifications

| Property   | Value     | Rationale                       |
| ---------- | --------- | ------------------------------- |
| Format     | WebP      | Best compression, wide support  |
| Dimensions | 1024×1024 | Crisp display on retina screens |
| Quality    | 92%       | High quality for visual appeal  |
| Max Size   | ~200KB    | Still fast loading on mobile    |
| Background | White     | Match canvas background         |

## Implementation Plan

### Phase 1: Database & API Updates

#### 1.1 Schema Migration

```sql
ALTER TABLE canvas_progress
ADD COLUMN preview_url TEXT,
ADD COLUMN preview_updated_at TIMESTAMP;
```

#### 1.2 Update API Types

**File: `apps/web/app/api/canvas/progress/route.ts`**

- Add `previewDataUrl` to POST request body
- Upload preview to blob storage (Vercel Blob)
- Save `previewUrl` to database
- Return `previewUrl` in GET response

**File: `apps/mobile/api.ts`**

- Update `CanvasProgress` types to include `previewUrl`

### Phase 2: Web Implementation

#### 2.1 Capture Preview on Save

**File: `apps/web/components/ImageCanvas/ImageCanvas.tsx`**

Add method to generate thumbnail:

```typescript
const generatePreviewThumbnail = useCallback((): string | null => {
  if (!canvasRef.current) return null;

  // Create offscreen canvas at thumbnail size
  const thumbCanvas = document.createElement("canvas");
  thumbCanvas.width = 256;
  thumbCanvas.height = 256;
  const thumbCtx = thumbCanvas.getContext("2d");

  if (!thumbCtx) return null;

  // Draw white background
  thumbCtx.fillStyle = "white";
  thumbCtx.fillRect(0, 0, 256, 256);

  // Scale and draw main canvas
  thumbCtx.drawImage(canvasRef.current, 0, 0, 256, 256);

  // Return as WebP data URL
  return thumbCanvas.toDataURL("image/webp", 0.8);
}, []);
```

#### 2.2 Update Save Flow

**File: `apps/web/utils/coloringStorage.ts`**

Update `saveToServer` to accept and upload preview:

```typescript
export async function saveToServer(
  coloringImageId: string,
  actions: ApiCanvasAction[],
  canvasWidth: number,
  canvasHeight: number,
  previewDataUrl?: string, // NEW
): Promise<void>;
```

### Phase 3: Mobile Implementation

#### 3.1 Capture Preview from Skia Canvas

**File: `apps/mobile/components/ImageCanvas/ImageCanvas.tsx`**

Add preview capture using Skia's `makeImageSnapshot`:

```typescript
const generatePreviewThumbnail = useCallback((): string | null => {
  if (!canvasRef.current) return null;

  // Skia can render to an image
  const image = canvasRef.current.makeImageSnapshot();
  if (!image) return null;

  // Resize to thumbnail dimensions
  const thumbWidth = 256;
  const thumbHeight = 256;

  // Create a surface for the thumbnail
  const surface = Skia.Surface.Make(thumbWidth, thumbHeight);
  if (!surface) return null;

  const canvas = surface.getCanvas();
  canvas.clear(Skia.Color("white"));

  // Draw scaled image
  const srcRect = { x: 0, y: 0, width: image.width(), height: image.height() };
  const dstRect = { x: 0, y: 0, width: thumbWidth, height: thumbHeight };
  canvas.drawImageRect(image, srcRect, dstRect, null);

  // Export as base64
  const snapshot = surface.makeImageSnapshot();
  return snapshot?.encodeToBase64() ?? null;
}, []);
```

#### 3.2 Update Save Flow

**File: `apps/mobile/utils/canvasPersistence.ts`**

Update `saveCanvasProgress` to include preview:

```typescript
export async function saveCanvasProgress(
  coloringImageId: string,
  actions: DrawingAction[],
  previewDataUrl?: string, // NEW
): Promise<void>;
```

### Phase 4: Feed/Dashboard Updates

#### 4.1 Update Feed API

**File: `apps/web/lib/feed/service.ts`**

Add new type and query for in-progress work:

```typescript
export type FeedInProgressItem = {
  id: string;
  coloringImageId: string;
  coloringImage: {
    id: string;
    title: string;
    svgUrl: string | null;
  };
  previewUrl: string | null;
  updatedAt: string;
};

export async function getInProgressWork(
  userId: string,
  limit: number = 5,
): Promise<FeedInProgressItem[]> {
  const progress = await db.canvasProgress.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
    take: limit,
    select: {
      id: true,
      coloringImageId: true,
      previewUrl: true,
      updatedAt: true,
      coloringImage: {
        select: {
          id: true,
          title: true,
          svgUrl: true,
        },
      },
    },
  });

  return progress.map((p) => ({
    id: p.id,
    coloringImageId: p.coloringImageId,
    coloringImage: p.coloringImage,
    previewUrl: p.previewUrl,
    updatedAt: p.updatedAt.toISOString(),
  }));
}
```

#### 4.2 Update Mobile Feed

**File: `apps/mobile/api.ts`**

Add to FeedResponse:

```typescript
export type FeedInProgressItem = {
  id: string;
  coloringImageId: string;
  coloringImage: {
    id: string;
    title: string;
    svgUrl: string | null;
  };
  previewUrl: string | null;
  updatedAt: string;
};

export type FeedResponse = {
  todaysPick: FeedColoringImage | null;
  activeChallenge: ChallengeWithProgress | null;
  recentArt: FeedSavedArtwork[];
  inProgress: FeedInProgressItem[]; // NEW
  myCreations: FeedColoringImage[];
  moreToColor: FeedColoringImage[];
  error?: string;
};
```

#### 4.3 Update Mobile Feed UI

**File: `apps/mobile/components/Feed/Feed.tsx`**

Add "Continue Coloring" section:

```tsx
// New card component for in-progress work
const InProgressCard = memo(({ item, size, onPress }) => (
  <Pressable
    style={[styles.card, { width: size, height: size }]}
    onPress={onPress}
  >
    <View style={styles.cardInner}>
      {item.previewUrl ? (
        <Image
          source={{ uri: item.previewUrl }}
          style={styles.artworkImage}
          resizeMode="cover"
        />
      ) : item.coloringImage?.svgUrl ? (
        <SvgUri
          width="100%"
          height="100%"
          uri={item.coloringImage.svgUrl}
          viewBox="0 0 1024 1024"
        />
      ) : (
        <Text style={styles.placeholderText}>🎨</Text>
      )}
      {/* Progress indicator overlay */}
      <View style={styles.inProgressBadge}>
        <Text style={styles.inProgressText}>In Progress</Text>
      </View>
    </View>
  </Pressable>
));
```

### Phase 5: Preview Refresh Strategy

#### When to Update Preview

| Event                 | Update Preview? | Rationale           |
| --------------------- | --------------- | ------------------- |
| Auto-save (debounced) | Yes, throttled  | Keep preview fresh  |
| Manual save           | Yes             | User expectation    |
| Background/blur       | Yes             | Capture final state |
| App close             | Yes             | Last chance         |

#### Throttling

- Only update preview if last update was >30 seconds ago
- Use `previewUpdatedAt` to track
- Reduces storage writes and bandwidth

### Phase 6: Cleanup & Edge Cases

#### 6.1 Preview Cleanup

When `CanvasProgress` is deleted (canvas cleared or artwork saved):

- Delete associated preview from blob storage
- Add cleanup in DELETE handler

#### 6.2 Backward Compatibility

- Existing `CanvasProgress` entries have `previewUrl: null`
- UI falls back to `svgUrl` when no preview exists
- Previews generate on next save

#### 6.3 Storage Considerations

| Metric            | Estimate    |
| ----------------- | ----------- |
| Avg preview size  | 20-30 KB    |
| Previews per user | ~10-20      |
| Storage per user  | ~200-600 KB |
| 10K users         | 2-6 GB      |

Use Vercel Blob with appropriate retention policies.

## File Changes Summary

| File                                                 | Changes                              |
| ---------------------------------------------------- | ------------------------------------ |
| `packages/db/prisma/schema.prisma`                   | Add `previewUrl`, `previewUpdatedAt` |
| `apps/web/app/api/canvas/progress/route.ts`          | Handle preview upload/storage        |
| `apps/web/components/ImageCanvas/ImageCanvas.tsx`    | Add `generatePreviewThumbnail`       |
| `apps/web/utils/coloringStorage.ts`                  | Include preview in save              |
| `apps/web/lib/feed/service.ts`                       | Add `getInProgressWork`              |
| `apps/mobile/api.ts`                                 | Add `FeedInProgressItem` type        |
| `apps/mobile/components/ImageCanvas/ImageCanvas.tsx` | Add Skia preview capture             |
| `apps/mobile/utils/canvasPersistence.ts`             | Include preview in save              |
| `apps/mobile/components/Feed/Feed.tsx`               | Add "Continue Coloring" section      |

## Testing Plan

1. **Unit Tests**
   - Preview generation produces valid WebP
   - Preview dimensions are correct (256×256)
   - Fallback to SVG when no preview

2. **Integration Tests**
   - Save progress → preview appears in feed
   - Cross-platform: save on web → see preview on mobile
   - Preview updates on subsequent saves

3. **Manual Testing**
   - Visual quality of thumbnails
   - Performance impact of capture
   - Feed load times with previews

## Rollout Plan

1. **Week 1**: Schema migration, API updates (backward compatible)
2. **Week 2**: Web preview capture implementation
3. **Week 3**: Mobile preview capture implementation
4. **Week 4**: Feed UI updates, testing, launch

## Success Metrics

- Users see progress previews for in-progress work
- No performance regression on save operations
- Feed load times stay under 500ms
- Preview storage costs within budget

## Open Questions

1. Should we show "Continue Coloring" section prominently or integrate with existing sections?
2. What happens when user has 20+ in-progress items? Pagination?
3. Should we generate previews for existing `CanvasProgress` entries via background job?

---

**Status**: 📋 Planning  
**Priority**: Medium  
**Estimated Effort**: 2 weeks  
**Dependencies**: Canvas sync (completed)

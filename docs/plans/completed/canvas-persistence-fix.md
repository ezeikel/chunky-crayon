# Canvas Persistence Fix Plan

> **Status: ✅ COMPLETED (January 2026)**
>
> This plan has been fully implemented. Cross-platform canvas synchronization between web and mobile is now working.

---

## Summary

Successfully implemented cross-platform canvas progress synchronization between web (Canvas 2D) and mobile (React Native Skia) platforms.

### Problems Solved

1. **Mobile Navigation Issue** - Canvas state was lost when navigating away due to React state timing issues
2. **Cross-Platform Sync** - Drawings made on web now appear on mobile and vice versa

### Key Implementation Details

#### Architecture

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Mobile    │     │   Server    │     │     Web     │
│  (Skia)     │     │             │     │ (Canvas2D)  │
│             │     │             │     │             │
│  Actions ───┼────►│  Database   │◄────┼─── Actions  │
│  (1024px)   │     │  (JSON)     │     │  (~880px)   │
│             │◄────┼─────────────┼────►│             │
└─────────────┘     └─────────────┘     └─────────────┘
```

#### Per-Action Source Dimensions

The key challenge was handling different coordinate systems:

- **Mobile**: Uses SVG viewBox space (typically 1024×1024)
- **Web**: Uses CSS pixel space (varies, e.g., 880×880)

**Solution**: Each action stores its own `sourceWidth`/`sourceHeight` in the data payload. When replaying:

- Mobile scales web actions from 880→1024
- Web scales mobile actions from 1024→880

#### Files Modified

**Web:**

- `apps/web/types/canvasActions.ts` - Added `ActionSourceDimensions` type
- `apps/web/components/ImageCanvas/ImageCanvas.tsx` - Per-action scaling in `replayAction()`, `forceRepaint()` method
- `apps/web/components/ColoringArea/ColoringArea.tsx` - Force repaint after bulk replay
- `apps/web/utils/coloringStorage.ts` - Preserve per-action sourceWidth/sourceHeight from server

**Mobile:**

- `apps/mobile/stores/canvasStore.ts` - Added `sourceWidth`/`sourceHeight` to `DrawingAction` type
- `apps/mobile/utils/canvasPersistence.ts` - Per-action dimension handling in serialization/deserialization
- `apps/mobile/components/ImageCanvas/ImageCanvas.tsx` - Per-action scaling on load, source dimensions on action creation

**Database:**

- `packages/db/prisma/schema.prisma` - `CanvasProgress` model with `canvasWidth`/`canvasHeight` fields

### Known Limitations

- **Brush rendering differences**: Strokes appear slightly different between platforms due to different rendering engines (Skia vs Canvas 2D). Positions are correct, but visual style varies.
- **Web still stores snapshots**: For fast local restore, web keeps PNG snapshots in localStorage alongside actions. Future optimization could remove this.

### Lessons Learned

1. Per-action metadata is essential for mixed-platform data
2. Progress-level dimensions get overwritten; per-action dimensions persist
3. GPU compositor caching requires explicit repaint after bulk canvas operations
4. Round-trip coordinate transformations must be mathematically reversible

---

## Original Problem Analysis

### Issue 1: Mobile Navigation (FIXED)

- `isInitialized` was tracked using React's `useState` (asynchronous)
- Cleanup function saw stale `false` value, skipping save
- **Fix**: Changed to `useRef` for synchronous access

### Issue 2: Cross-Platform Sync (FIXED)

- Web used localStorage (PNG snapshots)
- Mobile used AsyncStorage (action arrays)
- No shared backend storage
- **Fix**: Both platforms now sync to `/api/canvas/progress` endpoint

---

## API Reference

### POST /api/canvas/progress

Save canvas progress (replaces existing).

```typescript
{
  coloringImageId: string;
  actions: CanvasAction[];
  version: number;
  canvasWidth?: number;
  canvasHeight?: number;
}
```

### GET /api/canvas/progress?imageId={id}

Load canvas progress.

```typescript
// Response
{
  actions: CanvasAction[];
  version: number;
  canvasWidth?: number;
  canvasHeight?: number;
}
```

### Action Format

```typescript
{
  id: string;
  type: 'stroke' | 'fill' | 'sticker';
  timestamp: number;
  data: {
    path?: string;           // SVG path string
    color?: string;
    brushType?: string;
    brushSize?: number;
    sourceWidth?: number;    // Original canvas width
    sourceHeight?: number;   // Original canvas height
    x?: number;              // For fills
    y?: number;
    stickerId?: string;      // For stickers
    position?: { x, y };
    scale?: number;
  }
}
```

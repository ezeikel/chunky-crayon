# Canvas Persistence Fix Plan

## Problem Summary

The mobile app's canvas drawing state is not being saved when users navigate away from a coloring image. This is caused by a React state timing issue where the `isInitialized` flag is `false` when the cleanup function runs, even though initialization has completed.

## Root Cause Analysis

### The Issue

- `isInitialized` is tracked using React's `useState` hook (asynchronous updates)
- When `useFocusEffect` cleanup runs (user navigates away), React hasn't committed the state update yet
- The cleanup function checks `isInitialized` and finds it `false`, skipping the save operation
- User's drawing progress is lost

### Evidence from Logs

```
LOG  [CANVAS_INIT] Initialization complete
LOG  [CANVAS_FOCUS] Screen losing focus - Image: cmjka1vdl0000uu5579jlpa36
LOG  [CANVAS_FOCUS] Actions to save: 0, isInitialized: false
LOG  [CANVAS_FOCUS] No actions to save or not initialized
```

## Solution: Use Ref Instead of State

### Why Refs Solve This

- Refs provide synchronous updates (immediate)
- Changes to `ref.current` are available instantly
- No render cycle delays
- Perfect for tracking initialization status in cleanup functions

## Implementation Plan

### File to Modify

`apps/mobile/components/ImageCanvas/ImageCanvas.tsx`

### Changes Required

1. **Line 66: Replace state with ref**

   ```typescript
   // Before:
   const [isInitialized, setIsInitialized] = useState(false);

   // After:
   const isInitializedRef = useRef(false);
   ```

2. **Line 174: Update initialization start**

   ```typescript
   // Before:
   setIsInitialized(false);

   // After:
   isInitializedRef.current = false;
   ```

3. **Line 232: Update initialization complete**

   ```typescript
   // Before:
   setIsInitialized(true);

   // After:
   isInitializedRef.current = true;
   ```

4. **Line 267: Update focus effect check**

   ```typescript
   // Before:
   `[CANVAS_FOCUS] Actions to save: ${actionsToSave.length}, isInitialized: ${isInitialized}`
   // After:
   `[CANVAS_FOCUS] Actions to save: ${actionsToSave.length}, isInitialized: ${isInitializedRef.current}`;
   ```

5. **Line 270: Update save condition**

   ```typescript
   // Before:
   if (actionsToSave.length > 0 && isInitialized) {

   // After:
   if (actionsToSave.length > 0 && isInitializedRef.current) {
   ```

6. **Line 278: Update dependency array**

   ```typescript
   // Before:
   }, [history, historyIndex, coloringImage.id, isInitialized, setDirty]),

   // After:
   }, [history, historyIndex, coloringImage.id, setDirty]), // Remove isInitialized
   ```

7. **Line 283: Update auto-save check**

   ```typescript
   // Before:
   if (!isInitialized) return;

   // After:
   if (!isInitializedRef.current) return;
   ```

8. **Line 303: Update auto-save dependency array**

   ```typescript
   // Before:
   }, [history, historyIndex, coloringImage.id, isInitialized, setDirty]);

   // After:
   }, [history, historyIndex, coloringImage.id, setDirty]); // Remove isInitialized
   ```

## What This Fixes

### 1. Saving on Navigation ✅

- Ref updates are synchronous
- `isInitializedRef.current` will be `true` immediately after initialization
- Cleanup function will correctly save canvas state when navigating away

### 2. Loading Progress from DB ✅

- The existing `initializeCanvas` function (lines 170-234) already handles:
  - Loading saved state via `loadCanvasState(currentImageId)`
  - Restoring actions to the canvas store
  - This will continue to work, now with reliable timing

### 3. Preventing Re-initialization ✅

- Ref values persist across renders without triggering re-renders
- Stable initialization tracking prevents duplicate loads

## Testing Plan

After implementing the fix:

1. **Test Save on Navigation**
   - Open a coloring image
   - Draw some strokes
   - Navigate back to feed
   - Return to the same image
   - Verify drawings are restored

2. **Test Multiple Images**
   - Draw on Image A
   - Navigate to Image B
   - Draw on Image B
   - Navigate back to Image A
   - Verify each image maintains its own state

3. **Test App Restart**
   - Draw on an image
   - Kill the app
   - Reopen and navigate to the same image
   - Verify drawings persist

## Expected Outcome

Users will be able to:

- Draw on any coloring image
- Navigate away and return with their progress intact
- Switch between multiple images without losing work
- Have their progress persist even after app restarts

## Alternative Considerations

While this ref-based approach is the most direct fix, other patterns could be considered for future improvements:

- Using a cleanup ref pattern for more complex cleanup logic
- Moving persistence logic to a custom hook
- Implementing a more robust state machine for initialization

However, the ref solution is the minimal, safe change that fixes the immediate issue without refactoring the entire component.

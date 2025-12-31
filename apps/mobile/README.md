# Chunky Crayon Mobile App

React Native mobile app for Chunky Crayon - a kids coloring app (ages 3-8).

## Tech Stack

- **Expo SDK 54** with Expo Router
- **React Native Skia** for canvas drawing
- **React Native Gesture Handler** for touch interactions
- **React Native Reanimated** for animations
- **Zustand** for state management
- **TanStack Query** for data fetching
- **AsyncStorage** for local persistence

## Development Progress

### Phase 0: Foundation (Completed)

- [x] Expo SDK 54 upgrade
- [x] Native dependencies installation
- [x] FlashList 2.0 migration

### Phase 1: Core Coloring Experience (Completed)

- [x] **Zustand Canvas Store** (`stores/canvasStore.ts`)
  - Tool selection (brush, fill)
  - Color management
  - Brush type selection (crayon, marker, pencil)
  - Undo/redo history stack
  - Zoom/pan state

- [x] **Fill Tool** (`utils/floodFill.ts`)
  - Scanline flood fill algorithm
  - Color tolerance for smooth fills
  - Boundary detection for line art

- [x] **Brush Textures** (`utils/brushShaders.ts`)
  - Crayon: Semi-transparent (0.85 alpha), slightly thicker
  - Marker: Bold strokes with transparency (0.75 alpha)
  - Pencil: Thin, precise lines

- [x] **Zoom/Pan Gestures** (`components/ImageCanvas/ImageCanvas.tsx`)
  - Pinch to zoom (0.5x - 4x)
  - Pan to move canvas
  - Double-tap to reset view
  - Smooth spring animations

- [x] **Auto-save** (`utils/canvasPersistence.ts`)
  - Debounced save (2 seconds after last change)
  - Persists drawing actions to AsyncStorage
  - Restores state on return to image

- [x] **Canvas Toolbar** (`components/CanvasToolbar/CanvasToolbar.tsx`)
  - Draw/Fill tool selection
  - Brush type picker (when brush selected)
  - Undo/redo buttons with disabled states

- [x] **Color Palette** (`constants/Colors.ts`)
  - 21 kid-friendly colors
  - Includes skin tones for inclusive coloring
  - Horizontal scrollable palette

### Phase 2: Enhanced Features (Planned)

- [ ] Magic Brush / Auto-Color using colorMapJson
- [ ] Sticker placement
- [ ] Background music/ambient sounds
- [ ] Share completed artwork

### Phase 3: Gamification (Planned)

- [ ] Colo mascot integration
- [ ] Achievement system
- [ ] Progress tracking

## Getting Started

```bash
# Install dependencies
pnpm install

# Start development server
pnpm start

# Run on iOS simulator
pnpm ios

# Run on Android emulator
pnpm android
```

## Project Structure

```
apps/mobile/
├── app/                    # Expo Router pages
│   ├── coloring-image/     # Coloring page routes
│   └── ...
├── components/
│   ├── ImageCanvas/        # Main canvas component
│   ├── CanvasToolbar/      # Tool selection UI
│   ├── ColorPalette/       # Color picker
│   └── ...
├── stores/
│   └── canvasStore.ts      # Zustand state management
├── utils/
│   ├── floodFill.ts        # Fill algorithm
│   ├── brushShaders.ts     # Brush effects
│   └── canvasPersistence.ts # Save/load
├── constants/
│   └── Colors.ts           # Color palettes
└── hooks/                  # Custom hooks
```

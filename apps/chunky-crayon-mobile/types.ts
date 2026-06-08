import { SkPath } from "@shopify/react-native-skia";

// Enums matching database schema
export type AgeGroup = "TODDLER" | "CHILD" | "TWEEN" | "TEEN" | "ADULT";
export type Difficulty = "BEGINNER" | "INTERMEDIATE" | "ADVANCED" | "EXPERT";

// Grid color map from pre-computed AI analysis (5x5 grid)
export type GridColorCell = {
  row: number; // 1-5 (1=top, 5=bottom)
  col: number; // 1-5 (1=left, 5=right)
  element: string; // What's in the cell (e.g., "sky", "grass")
  suggestedColor: string; // Hex color #RRGGBB
  colorName: string; // Kid-friendly name
  reasoning: string; // 5-7 word explanation
};

export type GridColorMap = {
  sceneDescription: string;
  gridColors: GridColorCell[];
};

// Region-aware fill points (replaces grid approach for new images)
export type FillPoint = {
  x: number;
  y: number;
  color: string;
  label: string;
};

export type FillPointsData = {
  sourceWidth: number;
  sourceHeight: number;
  sceneDescription: string;
  points: FillPoint[];
};

// Region store — the modern Magic Brush / Auto Color data, mirroring
// packages/coloring-ui/src/types.ts. Per-region AI-assigned colours in four
// palette "moods"; the pixel→regionId map lives in a gzipped binary at
// regionMapUrl (decoded client-side). Replaces the legacy fillPoints/colorMap.
export const PALETTE_VARIANTS = [
  "realistic",
  "pastel",
  "cute",
  "surprise",
] as const;
export type PaletteVariant = (typeof PALETTE_VARIANTS)[number];

export type RegionStoreRegion = {
  id: number;
  bounds: { x: number; y: number; width: number; height: number };
  centroid: { x: number; y: number };
  pixelCount: number;
  label: string;
  objectGroup: string;
  palettes: Record<PaletteVariant, { hex: string; colorName: string }>;
};

export type RegionStoreJson = {
  sceneDescription: string;
  sourceWidth: number;
  sourceHeight: number;
  regionPixelCount: number;
  regions: RegionStoreRegion[];
};

export type ColoringImage = {
  id: string;
  title: string;
  // Short kid-friendly name shown in the app (SEO `title` stays for web). May be
  // null on rows created before displayTitle existed / not yet backfilled — the
  // app falls back to cleanTitle(title).
  displayTitle?: string | null;
  description: string;
  alt: string;
  // Generation lifecycle. A freshly-created row (worker/pending flow) starts
  // GENERATING with no svgUrl and is flipped to READY by the worker; the
  // detail screen polls on this. Older sync-created rows arrive READY.
  status?: "GENERATING" | "READY" | "FAILED";
  url?: string;
  svgUrl?: string;
  qrCodeUrl?: string;
  backgroundMusicUrl?: string;
  colorMapJson?: string; // Pre-computed grid color map JSON (legacy)
  fillPointsJson?: string; // Region-aware fill points JSON (legacy-preferred)
  // Region store (modern Magic Brush / Auto Color). The web API already
  // returns these (getColoringImageBase select); they were just never typed
  // or read on mobile. regionsJson arrives as a JSON string.
  regionMapUrl?: string;
  regionMapWidth?: number;
  regionMapHeight?: number;
  regionsJson?: string;
  coloredReferenceUrl?: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
};

export type DrawingPath = {
  path: SkPath;
  color: string;
};

export type Dimension = {
  width: number;
  height: number;
};

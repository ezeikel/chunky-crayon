import { SkPath } from "@shopify/react-native-skia";

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

export type ColoringImage = {
  id: string;
  title: string;
  description: string;
  alt: string;
  url?: string;
  svgUrl?: string;
  qrCodeUrl?: string;
  ambientSoundUrl?: string;
  colorMapJson?: string; // Pre-computed color map JSON
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

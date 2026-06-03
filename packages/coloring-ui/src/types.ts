/**
 * Shared coloring UI types and constants.
 * Re-exports canvas types from @one-colored-pixel/canvas.
 */

// Re-export types that originated in the canvas package
export type { BrushType, FillPattern } from "@one-colored-pixel/canvas";

// Color definition
export type ColorDefinition = {
  readonly name: string;
  readonly hex: string;
};

// Coloring palette structure
export const COLORING_PALETTE = {
  primary: [
    { name: "Cherry Red", hex: "#E53935" },
    { name: "Sunset Orange", hex: "#FB8C00" },
    { name: "Sunshine Yellow", hex: "#FDD835" },
    { name: "Grass Green", hex: "#43A047" },
    { name: "Sky Blue", hex: "#1E88E5" },
    { name: "Grape Purple", hex: "#8E24AA" },
    { name: "Bubblegum Pink", hex: "#EC407A" },
    { name: "Chocolate Brown", hex: "#6D4C41" },
  ],
  secondary: [
    { name: "Coral", hex: "#FF7043" },
    { name: "Mint", hex: "#26A69A" },
    { name: "Lavender", hex: "#AB47BC" },
    { name: "Peach", hex: "#FFAB91" },
    { name: "Navy", hex: "#3949AB" },
    { name: "Forest", hex: "#2E7D32" },
    { name: "Gold", hex: "#FFD54F" },
    { name: "Rose", hex: "#F48FB1" },
  ],
  essentials: [
    { name: "Black", hex: "#212121" },
    { name: "White", hex: "#FFFFFF" },
    { name: "Gray", hex: "#9E9E9E" },
    { name: "Skin Tone", hex: "#FFCC80" },
  ],
  skinTones: [
    { name: "Light", hex: "#FFE0B2" },
    { name: "Medium Light", hex: "#FFCC80" },
    { name: "Medium", hex: "#DEB887" },
    { name: "Medium Dark", hex: "#A0522D" },
    { name: "Dark", hex: "#8B4513" },
    { name: "Deep", hex: "#5D4037" },
  ],
  extended: [
    { name: "Turquoise", hex: "#00ACC1" },
    { name: "Teal", hex: "#00897B" },
    { name: "Indigo", hex: "#283593" },
    { name: "Magenta", hex: "#C2185B" },
    { name: "Lime", hex: "#7CB342" },
    { name: "Amber", hex: "#FFB300" },
    { name: "Crimson", hex: "#B71C1C" },
    { name: "Olive", hex: "#827717" },
    { name: "Tan", hex: "#D2B48C" },
    { name: "Salmon", hex: "#FF8A65" },
    { name: "Slate", hex: "#546E7A" },
    { name: "Cream", hex: "#FFF8E1" },
  ],
} as const;

/** Basic palette (primary + secondary + essentials) — used by kids variant */
export const ALL_COLORING_COLORS = [
  ...COLORING_PALETTE.primary,
  ...COLORING_PALETTE.secondary,
  ...COLORING_PALETTE.essentials,
];

/** Full palette including extended + skin tones — used by adult variant */
export const ALL_COLORING_COLORS_EXTENDED = [
  ...ALL_COLORING_COLORS,
  ...COLORING_PALETTE.extended,
  ...COLORING_PALETTE.skinTones,
];

/**
 * Mood-themed colour sets — one per PaletteVariant. The user picks a mood
 * via the palette tabs and BOTH the manual swatches and the magic tools
 * follow it.
 *
 * Each palette is exactly 18 colours, sequenced so the 6×3 grid reads as
 * a rainbow walk: red → orange → yellow → green → cyan → blue → violet
 * → pink, ending with mood-tinted neutrals. Curated via Perplexity Sonar
 * Deep Research and hand-tuned for adjacency and naming consistency.
 */
export const COLORING_PALETTE_VARIANTS = {
  realistic: [
    { name: "Cherry Red", hex: "#E53935" },
    { name: "Sunset Orange", hex: "#FB8C00" },
    { name: "Sunshine Yellow", hex: "#FDD835" },
    { name: "Grass Green", hex: "#43A047" },
    { name: "Sky Blue", hex: "#1E88E5" },
    { name: "Grape Purple", hex: "#8E24AA" },
    { name: "Bubblegum Pink", hex: "#EC407A" },
    { name: "Chocolate Brown", hex: "#6D4C41" },
    { name: "Coral", hex: "#FF7043" },
    { name: "Mango", hex: "#FDBE02" },
    { name: "Kelly Green", hex: "#4CBB17" },
    { name: "Mint", hex: "#26A69A" },
    { name: "Royal Blue", hex: "#1560BD" },
    { name: "Plum", hex: "#583759" },
    { name: "Rose", hex: "#F48FB1" },
    { name: "Charcoal", hex: "#4A4A4A" },
    { name: "White", hex: "#FFFFFF" },
    { name: "Warm Gray", hex: "#A49A87" },
  ],
  pastel: [
    { name: "Watermelon", hex: "#FF8FA3" },
    { name: "Apricot", hex: "#FFB07A" },
    { name: "Buttercup", hex: "#FFD96B" },
    { name: "Spring Mint", hex: "#7DD8B0" },
    { name: "Sky", hex: "#7CC8EE" },
    { name: "Lavender", hex: "#B894E0" },
    { name: "Cotton Candy", hex: "#FF9EC0" },
    { name: "Cocoa", hex: "#C8A78F" },
    { name: "Coral Glow", hex: "#FF9A7A" },
    { name: "Honeycomb", hex: "#FFC857" },
    { name: "Sage", hex: "#9FCC8F" },
    { name: "Seafoam", hex: "#7ECEC4" },
    { name: "Periwinkle", hex: "#8E9CE6" },
    { name: "Wisteria", hex: "#C28BE0" },
    { name: "Petal", hex: "#FFA8C5" },
    { name: "Soft Sand", hex: "#E8BC8A" },
    { name: "Cream", hex: "#FFE8C7" },
    { name: "Stone", hex: "#A8A39A" },
  ],
  cute: [
    { name: "Strawberry", hex: "#FF3366" },
    { name: "Tangerine", hex: "#FFA800" },
    { name: "Lemon", hex: "#FFEE00" },
    { name: "Apple Green", hex: "#8DB600" },
    { name: "Bubble Blue", hex: "#5BC0EB" },
    { name: "Grape Soda", hex: "#9D4EDD" },
    { name: "Hot Pink", hex: "#FF477E" },
    { name: "Mango", hex: "#FFB347" },
    { name: "Sunbeam", hex: "#FFC857" },
    { name: "Forest Green", hex: "#43A047" },
    { name: "Aqua Pop", hex: "#3FC1C9" },
    { name: "Blueberry", hex: "#4169E1" },
    { name: "Plum", hex: "#C04CFD" },
    { name: "Watermelon", hex: "#FF6F91" },
    { name: "Cocoa", hex: "#8D5524" },
    { name: "Black", hex: "#212121" },
    { name: "Ivory", hex: "#FFFFF0" },
    { name: "Cool Gray", hex: "#A49A87" },
  ],
  surprise: [
    { name: "Volcano", hex: "#FF4500" },
    { name: "Neon Orange", hex: "#FF6600" },
    { name: "Neon Yellow", hex: "#FFFF00" },
    { name: "Lime Lightning", hex: "#7FFF00" },
    { name: "Electric Cyan", hex: "#00FFFF" },
    { name: "Neon Blue", hex: "#0080FF" },
    { name: "UV Purple", hex: "#7C00FF" },
    { name: "Hot Magenta", hex: "#FF1DCE" },
    { name: "Acid Lime", hex: "#CCFF00" },
    { name: "Mermaid Teal", hex: "#1ABC9C" },
    { name: "Ultraviolet", hex: "#8B00FF" },
    { name: "Fuchsia Blast", hex: "#FF00FF" },
    { name: "Royal Violet", hex: "#5E2CA5" },
    { name: "Sunset Coral", hex: "#FF6F61" },
    { name: "Marigold", hex: "#FFC42E" },
    { name: "Jet Black", hex: "#000000" },
    { name: "Snow", hex: "#FFFFFF" },
    { name: "Silver Flash", hex: "#C0C0C0" },
  ],
} as const;

export const BRUSH_SIZES = {
  small: { radius: 4, name: "Fine", icon: "•" },
  medium: { radius: 12, name: "Regular", icon: "●" },
  large: { radius: 24, name: "Chunky", icon: "⬤" },
} as const;

export type BrushSize = keyof typeof BRUSH_SIZES;

export type ColoringTool =
  | "brush"
  | "fill"
  | "pan"
  | "sticker"
  | "magic-reveal"
  | "magic-auto"
  | "eyedropper";

export type StickerCategory =
  | "stars"
  | "hearts"
  | "shapes"
  | "nature"
  | "animals"
  | "fun";

export type Sticker = {
  id: string;
  name: string;
  category: StickerCategory;
  /**
   * Transparent PNG asset path for this sticker. On web this is the
   * `/images/stickers/canvas/<id>.png` public path; on mobile the same id
   * resolves to a bundled asset via the require() registry in
   * `lib/canvasStickers`. Generated by
   * `scripts/generate-canvas-stickers.ts` (gpt-image-2 high + bg removal).
   */
  imageUrl: string;
  /**
   * Legacy emoji glyph. Kept ONLY as a fallback for already-saved artwork
   * whose sticker actions predate the PNG migration (the wire `stickerId`
   * historically carried this glyph). New placements render `imageUrl`.
   */
  emoji: string;
};

// Shared curated canvas-sticker catalog — 6 categories × 6 = 36 stickers,
// flat-vector bold-outline kids' sticker art (transparent PNG). The SINGLE
// source of truth for both web (apps/chunky-crayon-web imports this) and
// mobile (apps/chunky-crayon-mobile/stores/canvasStore re-exports it). The
// `emoji` field is the legacy fallback for pre-migration saved stickers.
const CANVAS_STICKER_IMG = (id: string) => `/images/stickers/canvas/${id}.png`;

export const CANVAS_STICKERS: Sticker[] = [
  // ── stars ──
  {
    id: "star-classic",
    name: "Star",
    category: "stars",
    emoji: "⭐",
    imageUrl: CANVAS_STICKER_IMG("star-classic"),
  },
  {
    id: "star-shooting",
    name: "Shooting Star",
    category: "stars",
    emoji: "💫",
    imageUrl: CANVAS_STICKER_IMG("star-shooting"),
  },
  {
    id: "sparkles",
    name: "Sparkles",
    category: "stars",
    emoji: "✨",
    imageUrl: CANVAS_STICKER_IMG("sparkles"),
  },
  {
    id: "star-burst",
    name: "Star Burst",
    category: "stars",
    emoji: "🌟",
    imageUrl: CANVAS_STICKER_IMG("star-burst"),
  },
  {
    id: "moon-crescent",
    name: "Crescent Moon",
    category: "stars",
    emoji: "🌙",
    imageUrl: CANVAS_STICKER_IMG("moon-crescent"),
  },
  {
    id: "comet",
    name: "Comet",
    category: "stars",
    emoji: "☄️",
    imageUrl: CANVAS_STICKER_IMG("comet"),
  },
  // ── hearts ──
  {
    id: "heart-red",
    name: "Red Heart",
    category: "hearts",
    emoji: "❤️",
    imageUrl: CANVAS_STICKER_IMG("heart-red"),
  },
  {
    id: "heart-double",
    name: "Two Hearts",
    category: "hearts",
    emoji: "💕",
    imageUrl: CANVAS_STICKER_IMG("heart-double"),
  },
  {
    id: "heart-sparkle",
    name: "Sparkle Heart",
    category: "hearts",
    emoji: "💖",
    imageUrl: CANVAS_STICKER_IMG("heart-sparkle"),
  },
  {
    id: "heart-arrow",
    name: "Heart with Arrow",
    category: "hearts",
    emoji: "💘",
    imageUrl: CANVAS_STICKER_IMG("heart-arrow"),
  },
  {
    id: "heart-rainbow",
    name: "Rainbow Heart",
    category: "hearts",
    emoji: "🩷",
    imageUrl: CANVAS_STICKER_IMG("heart-rainbow"),
  },
  {
    id: "heart-wings",
    name: "Winged Heart",
    category: "hearts",
    emoji: "💝",
    imageUrl: CANVAS_STICKER_IMG("heart-wings"),
  },
  // ── shapes ──
  {
    id: "circle",
    name: "Circle",
    category: "shapes",
    emoji: "🔵",
    imageUrl: CANVAS_STICKER_IMG("circle"),
  },
  {
    id: "square",
    name: "Square",
    category: "shapes",
    emoji: "🟦",
    imageUrl: CANVAS_STICKER_IMG("square"),
  },
  {
    id: "triangle",
    name: "Triangle",
    category: "shapes",
    emoji: "🔺",
    imageUrl: CANVAS_STICKER_IMG("triangle"),
  },
  {
    id: "diamond",
    name: "Diamond",
    category: "shapes",
    emoji: "💎",
    imageUrl: CANVAS_STICKER_IMG("diamond"),
  },
  {
    id: "hexagon",
    name: "Hexagon",
    category: "shapes",
    emoji: "⬡",
    imageUrl: CANVAS_STICKER_IMG("hexagon"),
  },
  {
    id: "star-outline",
    name: "Star Shape",
    category: "shapes",
    emoji: "⭐",
    imageUrl: CANVAS_STICKER_IMG("star-outline"),
  },
  // ── nature ──
  {
    id: "flower-daisy",
    name: "Daisy",
    category: "nature",
    emoji: "🌼",
    imageUrl: CANVAS_STICKER_IMG("flower-daisy"),
  },
  {
    id: "sun-smiley",
    name: "Sunshine",
    category: "nature",
    emoji: "☀️",
    imageUrl: CANVAS_STICKER_IMG("sun-smiley"),
  },
  {
    id: "rainbow",
    name: "Rainbow",
    category: "nature",
    emoji: "🌈",
    imageUrl: CANVAS_STICKER_IMG("rainbow"),
  },
  {
    id: "cloud",
    name: "Cloud",
    category: "nature",
    emoji: "☁️",
    imageUrl: CANVAS_STICKER_IMG("cloud"),
  },
  {
    id: "butterfly",
    name: "Butterfly",
    category: "nature",
    emoji: "🦋",
    imageUrl: CANVAS_STICKER_IMG("butterfly"),
  },
  {
    id: "leaf",
    name: "Leaf",
    category: "nature",
    emoji: "🍃",
    imageUrl: CANVAS_STICKER_IMG("leaf"),
  },
  // ── animals ──
  {
    id: "cat",
    name: "Cat",
    category: "animals",
    emoji: "🐱",
    imageUrl: CANVAS_STICKER_IMG("cat"),
  },
  {
    id: "dog",
    name: "Dog",
    category: "animals",
    emoji: "🐶",
    imageUrl: CANVAS_STICKER_IMG("dog"),
  },
  {
    id: "bunny",
    name: "Bunny",
    category: "animals",
    emoji: "🐰",
    imageUrl: CANVAS_STICKER_IMG("bunny"),
  },
  {
    id: "bear",
    name: "Bear",
    category: "animals",
    emoji: "🐻",
    imageUrl: CANVAS_STICKER_IMG("bear"),
  },
  {
    id: "fox",
    name: "Fox",
    category: "animals",
    emoji: "🦊",
    imageUrl: CANVAS_STICKER_IMG("fox"),
  },
  {
    id: "fish",
    name: "Fish",
    category: "animals",
    emoji: "🐠",
    imageUrl: CANVAS_STICKER_IMG("fish"),
  },
  // ── fun ──
  {
    id: "crown",
    name: "Crown",
    category: "fun",
    emoji: "👑",
    imageUrl: CANVAS_STICKER_IMG("crown"),
  },
  {
    id: "rocket",
    name: "Rocket",
    category: "fun",
    emoji: "🚀",
    imageUrl: CANVAS_STICKER_IMG("rocket"),
  },
  {
    id: "balloon",
    name: "Balloon",
    category: "fun",
    emoji: "🎈",
    imageUrl: CANVAS_STICKER_IMG("balloon"),
  },
  {
    id: "gift",
    name: "Gift",
    category: "fun",
    emoji: "🎁",
    imageUrl: CANVAS_STICKER_IMG("gift"),
  },
  {
    id: "cupcake",
    name: "Cupcake",
    category: "fun",
    emoji: "🧁",
    imageUrl: CANVAS_STICKER_IMG("cupcake"),
  },
  {
    id: "party-popper",
    name: "Party Popper",
    category: "fun",
    emoji: "🎉",
    imageUrl: CANVAS_STICKER_IMG("party-popper"),
  },
];

// Category tabs. `iconId` points at the sticker whose PNG fronts the tab
// (replaces the old emoji `icon`); resolved to a PNG the same way as any
// sticker. Kept `icon` (emoji) as a legacy fallback for the tab chip.
export const STICKER_CATEGORIES = {
  stars: { name: "Stars", icon: "⭐", iconId: "star-classic" },
  hearts: { name: "Hearts", icon: "❤️", iconId: "heart-red" },
  shapes: { name: "Shapes", icon: "🔷", iconId: "diamond" },
  nature: { name: "Nature", icon: "🌸", iconId: "flower-daisy" },
  animals: { name: "Animals", icon: "🐱", iconId: "cat" },
  fun: { name: "Fun", icon: "🎉", iconId: "party-popper" },
} as const;

export const FILL_PATTERNS = {
  solid: { name: "Solid", icon: "⬤", description: "Fill with solid color" },
  dots: { name: "Polka Dots", icon: "⚬", description: "Fun polka dot pattern" },
  stripes: { name: "Stripes", icon: "≡", description: "Horizontal stripes" },
  "stripes-diagonal": {
    name: "Diagonal",
    icon: "⟋",
    description: "Diagonal stripes",
  },
  checkerboard: {
    name: "Checkers",
    icon: "▦",
    description: "Checkerboard pattern",
  },
  hearts: { name: "Hearts", icon: "♥", description: "Lovely heart pattern" },
  stars: { name: "Stars", icon: "★", description: "Sparkly star pattern" },
  zigzag: { name: "Zigzag", icon: "⚡", description: "Zigzag waves" },
} as const;

// Palette variants — must match the server-side PaletteVariant in coloring-core.
// Defined here to avoid a cross-package dependency from this client-side package
// to the server-side coloring-core package.
export const PALETTE_VARIANTS = [
  "realistic",
  "pastel",
  "cute",
  "surprise",
] as const;
export type PaletteVariant = (typeof PALETTE_VARIANTS)[number];

// Region store types — mirrors the server-side types from coloring-core.
// Defined locally for the same reason as PaletteVariant above.
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

// Tracking events used by coloring UI components.
// Mirror of `apps/*/constants.ts` TRACKING_EVENTS for the events fired
// from inside the shared package. The CC + CH analytics types live in
// each app's `types/analytics.ts`; this constant is just to avoid
// hand-typed string keys at call sites.
export const TRACKING_EVENTS = {
  PAGE_COLOR_SELECTED: "page_color_selected",
  PAGE_STROKE_MADE: "page_stroke_made",
  PAGE_COLORED: "page_colored",
  PAGE_FIRST_STROKE: "page_first_stroke",
  TOOL_SELECTED: "tool_selected",
  BRUSH_SIZE_CHANGED: "brush_size_changed",
  BRUSH_TYPE_CHANGED: "brush_type_changed",
  PALETTE_VARIANT_CHANGED: "palette_variant_changed",
  CANVAS_UNDO: "canvas_undo",
  CANVAS_REDO: "canvas_redo",
  AUTO_COLOR_USED: "auto_color_used",
  CREATION_SUBMITTED: "creation_submitted",
  CTA_CLICKED: "cta_clicked",
} as const;

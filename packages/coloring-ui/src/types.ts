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
} as const;

export const ALL_COLORING_COLORS = [
  ...COLORING_PALETTE.primary,
  ...COLORING_PALETTE.secondary,
  ...COLORING_PALETTE.essentials,
];

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
  | "magic-auto";

export type StickerCategory =
  | "shapes"
  | "emojis"
  | "stars"
  | "hearts"
  | "nature"
  | "fun";

export type Sticker = {
  id: string;
  name: string;
  category: StickerCategory;
  emoji: string;
};

export const CANVAS_STICKERS: Sticker[] = [
  { id: "star-yellow", name: "Yellow Star", category: "stars", emoji: "⭐" },
  { id: "star-sparkle", name: "Sparkle Star", category: "stars", emoji: "✨" },
  { id: "star-glow", name: "Glowing Star", category: "stars", emoji: "🌟" },
  {
    id: "star-shooting",
    name: "Shooting Star",
    category: "stars",
    emoji: "💫",
  },
  { id: "heart-red", name: "Red Heart", category: "hearts", emoji: "❤️" },
  { id: "heart-pink", name: "Pink Heart", category: "hearts", emoji: "💕" },
  {
    id: "heart-sparkle",
    name: "Sparkle Heart",
    category: "hearts",
    emoji: "💖",
  },
  {
    id: "heart-rainbow",
    name: "Rainbow Heart",
    category: "hearts",
    emoji: "🩷",
  },
  { id: "circle", name: "Circle", category: "shapes", emoji: "🔵" },
  { id: "square", name: "Square", category: "shapes", emoji: "🟦" },
  { id: "triangle", name: "Triangle", category: "shapes", emoji: "🔺" },
  { id: "diamond", name: "Diamond", category: "shapes", emoji: "💎" },
  { id: "flower", name: "Flower", category: "nature", emoji: "🌸" },
  { id: "sun", name: "Sun", category: "nature", emoji: "☀️" },
  { id: "rainbow", name: "Rainbow", category: "nature", emoji: "🌈" },
  { id: "cloud", name: "Cloud", category: "nature", emoji: "☁️" },
  { id: "butterfly", name: "Butterfly", category: "nature", emoji: "🦋" },
  { id: "leaf", name: "Leaf", category: "nature", emoji: "🍃" },
  { id: "smile", name: "Smile", category: "emojis", emoji: "😊" },
  { id: "love", name: "Love Eyes", category: "emojis", emoji: "😍" },
  { id: "cool", name: "Cool", category: "emojis", emoji: "😎" },
  { id: "wink", name: "Wink", category: "emojis", emoji: "😉" },
  { id: "crown", name: "Crown", category: "fun", emoji: "👑" },
  { id: "unicorn", name: "Unicorn", category: "fun", emoji: "🦄" },
  { id: "rocket", name: "Rocket", category: "fun", emoji: "🚀" },
  { id: "balloon", name: "Balloon", category: "fun", emoji: "🎈" },
  { id: "gift", name: "Gift", category: "fun", emoji: "🎁" },
  { id: "cake", name: "Cake", category: "fun", emoji: "🎂" },
];

export const STICKER_CATEGORIES = {
  stars: { name: "Stars", icon: "⭐" },
  hearts: { name: "Hearts", icon: "❤️" },
  shapes: { name: "Shapes", icon: "🔷" },
  nature: { name: "Nature", icon: "🌸" },
  emojis: { name: "Emojis", icon: "😊" },
  fun: { name: "Fun", icon: "🎉" },
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

// Tracking events used by coloring UI components
export const TRACKING_EVENTS = {
  PAGE_COLOR_SELECTED: "page_color_selected",
  PAGE_STROKE_MADE: "page_stroke_made",
  CREATION_SUBMITTED: "creation_submitted",
  CTA_CLICKED: "cta_clicked",
} as const;

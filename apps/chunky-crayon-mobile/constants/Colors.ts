/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

const tintColorLight = "#0a7ea4";
const tintColorDark = "#fff";

export const Colors = {
  light: {
    text: "#11181C",
    background: "#fff",
    tint: tintColorLight,
    icon: "#687076",
    tabIconDefault: "#687076",
    tabIconSelected: tintColorLight,
  },
  dark: {
    text: "#ECEDEE",
    background: "#151718",
    tint: tintColorDark,
    icon: "#9BA1A6",
    tabIconDefault: "#9BA1A6",
    tabIconSelected: tintColorDark,
  },
};

// Enhanced 20-color kid-friendly palette (matching web version)
// Colors are named for accessibility and child-friendliness
export const COLORING_PALETTE = {
  // Primary colors (8) - Large buttons, most used
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
  // Secondary colors (8) - Medium buttons
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
  // Essentials (4) - Always visible
  essentials: [
    { name: "Black", hex: "#212121" },
    { name: "White", hex: "#FFFFFF" },
    { name: "Gray", hex: "#9E9E9E" },
    { name: "Skin Tone", hex: "#FFCC80" },
  ],
  // Skin tones (6) - Accessible via long-press on Skin Tone
  skinTones: [
    { name: "Light", hex: "#FFE0B2" },
    { name: "Medium Light", hex: "#FFCC80" },
    { name: "Medium", hex: "#DEB887" },
    { name: "Medium Dark", hex: "#A0522D" },
    { name: "Dark", hex: "#8B4513" },
    { name: "Deep", hex: "#5D4037" },
  ],
} as const;

// Flat array of all coloring palette colors for easy iteration
export const ALL_COLORING_COLORS = [
  ...COLORING_PALETTE.primary,
  ...COLORING_PALETTE.secondary,
  ...COLORING_PALETTE.essentials,
];

// Legacy flat array for backwards compatibility (hex values only)
export const PALETTE_COLORS = ALL_COLORING_COLORS.map((c) => c.hex);

// Extended palette for color picker (updated with matching tones)
export const EXTENDED_PALETTE = {
  reds: ["#E53935", "#EF5350", "#F44336", "#D32F2F", "#C62828", "#B71C1C"],
  oranges: ["#FB8C00", "#FF9800", "#FFA726", "#F57C00", "#EF6C00", "#E65100"],
  yellows: ["#FDD835", "#FFEB3B", "#FFF176", "#FBC02D", "#F9A825", "#F57F17"],
  greens: ["#43A047", "#4CAF50", "#66BB6A", "#388E3C", "#2E7D32", "#1B5E20"],
  blues: ["#1E88E5", "#2196F3", "#42A5F5", "#1976D2", "#1565C0", "#0D47A1"],
  purples: ["#8E24AA", "#9C27B0", "#AB47BC", "#7B1FA2", "#6A1B9A", "#4A148C"],
  pinks: ["#EC407A", "#E91E63", "#F06292", "#D81B60", "#C2185B", "#880E4F"],
  browns: ["#6D4C41", "#795548", "#8D6E63", "#5D4037", "#4E342E", "#3E2723"],
  grays: ["#FFFFFF", "#E0E0E0", "#9E9E9E", "#757575", "#424242", "#212121"],
};

// Brush presets
export const BRUSH_SIZES = {
  small: 5,
  medium: 10,
  large: 20,
  extraLarge: 35,
};

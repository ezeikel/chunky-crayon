import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import {
  faPalette,
  faIceCream,
  faHeart,
  faDice,
} from "@fortawesome/pro-duotone-svg-icons";
import { PALETTE_VARIANTS, type PaletteVariant } from "@/types";

/**
 * Coloring palette data, ported VERBATIM from CC web
 * (packages/coloring-ui/src/types.ts COLORING_PALETTE_VARIANTS) so the
 * mobile swatch set matches web exactly. Four mood variants, 18 colors
 * each, sequenced as a rainbow walk ending in mood-tinted neutrals. The
 * selected variant drives both the swatch grid AND the magic-tool auto
 * palette (single knob, two effects), same as web.
 *
 * PaletteVariant / PALETTE_VARIANTS are the canonical region-store types in
 * @/types (kept icon-free); re-exported here for existing import sites.
 */

export { PALETTE_VARIANTS, type PaletteVariant };

export type Swatch = { name: string; hex: string };

/** Variant pill icons — match web's variantIcons. */
export const PALETTE_VARIANT_ICONS: Record<PaletteVariant, IconDefinition> = {
  realistic: faPalette,
  pastel: faIceCream,
  cute: faHeart,
  surprise: faDice,
};

export const PALETTE_VARIANT_LABELS: Record<PaletteVariant, string> = {
  realistic: "Realistic",
  pastel: "Pastel",
  cute: "Cute",
  surprise: "Surprise",
};

export const COLORING_PALETTE_VARIANTS: Record<PaletteVariant, Swatch[]> = {
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
};

/** Brush sizes — match web's BRUSH_SIZES (radii 4 / 12 / 24). */
export const COLORING_BRUSH_SIZES = [
  { key: "small", radius: 4, name: "Fine" },
  { key: "medium", radius: 12, name: "Regular" },
  { key: "large", radius: 24, name: "Chunky" },
] as const;

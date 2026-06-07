import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import {
  faPencil,
  faPaintbrush,
  faPenNib,
  faPaintRoller,
  faSparkles,
  faFillDrip,
  faEraser,
  faStar,
  faBrush,
  faWandMagicSparkles,
} from "@fortawesome/pro-duotone-svg-icons";
import type { Tool, BrushType, MagicMode } from "@/stores/canvasStore";

/**
 * The coloring tool lineup, mirroring CC web's CURRENT set
 * (packages/coloring-ui ToolSelector/DesktopToolsSidebar) exactly: ten
 * icon-only tools in this order — eight regular + two magic. Web removed
 * rainbow/glow/neon/sparkle for clearer kid UX, so they're not here
 * either (the brush types still exist in the store, just not surfaced).
 *
 * Labels are kept ONLY for accessibility (aria/title); every tile renders
 * icon-only, matching web (text labels were removed).
 *
 * Tool → store mapping: regular brushes set tool="brush" + a brushType;
 * fill/eraser/sticker set their tool; the two magic tools set
 * tool="magic" + a magicMode (suggest = tap-to-suggest "Magic Brush",
 * auto = fill-everything "Auto Color").
 */
export type ColoringToolConfig = {
  id: string;
  tool: Tool;
  brushType?: BrushType;
  magicMode?: MagicMode;
  /** Accessibility label only — tiles are icon-only (no visible text). */
  label: string;
  icon: IconDefinition;
  isMagic?: boolean;
};

export const COLORING_TOOLS: ColoringToolConfig[] = [
  {
    id: "crayon",
    tool: "brush",
    brushType: "crayon",
    label: "Crayon",
    icon: faPencil,
  },
  {
    id: "marker",
    tool: "brush",
    brushType: "marker",
    label: "Marker",
    icon: faPaintbrush,
  },
  {
    id: "pencil",
    tool: "brush",
    brushType: "pencil",
    label: "Pencil",
    icon: faPenNib,
  },
  {
    id: "paintbrush",
    tool: "brush",
    brushType: "paintbrush",
    label: "Paint",
    icon: faPaintRoller,
  },
  {
    id: "glitter",
    tool: "brush",
    brushType: "glitter",
    label: "Glitter",
    icon: faSparkles,
  },
  { id: "fill", tool: "fill", label: "Fill", icon: faFillDrip },
  { id: "eraser", tool: "eraser", label: "Eraser", icon: faEraser },
  { id: "sticker", tool: "sticker", label: "Sticker", icon: faStar },
  {
    id: "magic-reveal",
    tool: "magic",
    magicMode: "suggest",
    label: "Magic Brush",
    icon: faBrush,
    isMagic: true,
  },
  {
    id: "magic-auto",
    tool: "magic",
    magicMode: "auto",
    label: "Auto Color",
    // Wand (not paint-bucket) — Auto Color is a one-click "magic" fill, so the
    // wand reads better than faFillDrip (which we keep for the manual Fill tool).
    icon: faWandMagicSparkles,
    isMagic: true,
  },
];

/** Regular (non-magic) tools — for grids that separate the two like web. */
export const COLORING_REGULAR_TOOLS = COLORING_TOOLS.filter((t) => !t.isMagic);
/** The two magic tools (Magic Brush / Auto Color). */
export const COLORING_MAGIC_TOOLS = COLORING_TOOLS.filter((t) => t.isMagic);

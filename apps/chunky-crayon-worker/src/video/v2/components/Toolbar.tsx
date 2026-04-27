/**
 * Demo Reel V2 — presentational toolbar.
 *
 * Visual mirror of the live `<ColoringToolbar>` (packages/coloring-ui/src/
 * ColoringToolbar.tsx). Renders all 10 tools in the same order, with the
 * one matching `activeToolId` shown in its selected state.
 *
 * For V2 reels we always select 'magic-reveal' — the magical reveal is
 * the most visually striking feature and the entire reel choreography is
 * built around it. No state, no event handlers, no hooks.
 *
 * Magic tools (magic-reveal, magic-auto) get the gradient + sparkle
 * badge styling from the live component. Regular tools are solid orange
 * when active, white with grey border when not.
 */
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
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
} from "@fortawesome/pro-duotone-svg-icons";
import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import { COLORS, RADII, SHADOWS } from "../tokens/brand";

type ToolId =
  | "crayon"
  | "marker"
  | "pencil"
  | "paintbrush"
  | "glitter"
  | "fill"
  | "eraser"
  | "sticker"
  | "magic-reveal"
  | "magic-auto";

type ToolConfig = {
  id: ToolId;
  label: string;
  icon: IconDefinition;
  isMagic?: boolean;
};

// Mirrors `tools` array in ColoringToolbar.tsx — same order, same icons.
const TOOLS: ToolConfig[] = [
  { id: "crayon", label: "Crayon", icon: faPencil },
  { id: "marker", label: "Marker", icon: faPaintbrush },
  { id: "pencil", label: "Pencil", icon: faPenNib },
  { id: "paintbrush", label: "Paint", icon: faPaintRoller },
  { id: "glitter", label: "Glitter", icon: faSparkles },
  { id: "fill", label: "Fill", icon: faFillDrip },
  { id: "eraser", label: "Eraser", icon: faEraser },
  { id: "sticker", label: "Sticker", icon: faStar },
  { id: "magic-reveal", label: "Magic Brush", icon: faBrush, isMagic: true },
  { id: "magic-auto", label: "Auto Color", icon: faFillDrip, isMagic: true },
];

type ToolbarProps = {
  activeToolId: ToolId | null;
  /**
   * 0..1 — pop animation when the active tool was just selected. Reel
   * passes `spring()` output for a brief scale-up on activation.
   */
  selectionPop?: number;
};

export const Toolbar = ({ activeToolId, selectionPop = 0 }: ToolbarProps) => {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(10, 1fr)",
        gap: 12,
        padding: 20,
        borderRadius: RADII.card,
        background: COLORS.textInverted,
        border: `2px solid ${COLORS.borderLight}`,
        boxShadow: SHADOWS.surface,
      }}
    >
      {TOOLS.map((tool) => {
        const isActive = tool.id === activeToolId;
        const scale = isActive ? 1 + 0.15 * selectionPop : 1;

        if (tool.isMagic) {
          return (
            <ToolButton
              key={tool.id}
              icon={tool.icon}
              isActive={isActive}
              isMagic
              scale={scale}
            />
          );
        }
        return (
          <ToolButton
            key={tool.id}
            icon={tool.icon}
            isActive={isActive}
            scale={scale}
          />
        );
      })}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────
// Internal — single tool cell. Magic tools get the purple→pink gradient
// and a sparkle badge in the top-right corner.
// ─────────────────────────────────────────────────────────────────────────
const ToolButton = ({
  icon,
  isActive,
  isMagic = false,
  scale,
}: {
  icon: IconDefinition;
  isActive: boolean;
  isMagic?: boolean;
  scale: number;
}) => {
  const magicGradient = `linear-gradient(135deg, ${COLORS.purple}, ${COLORS.pink})`;

  let bg: string;
  let border: string;
  let iconColor: string;
  let boxShadow: string | undefined;

  if (isMagic && isActive) {
    bg = magicGradient;
    border = "2px solid transparent";
    iconColor = COLORS.textInverted;
    boxShadow = "0 4px 14px rgba(167, 95, 167, 0.4)";
  } else if (isMagic && !isActive) {
    // Faded gradient backdrop, magic-purple icon
    bg = `linear-gradient(135deg, ${COLORS.purple}1a, ${COLORS.pink}1a)`;
    border = "2px solid transparent";
    iconColor = COLORS.purple;
  } else if (isActive) {
    bg = COLORS.orange;
    border = "2px solid transparent";
    iconColor = COLORS.textInverted;
    boxShadow = `0 4px 0 0 ${COLORS.orangeDark}`;
  } else {
    bg = COLORS.textInverted;
    border = `2px solid ${COLORS.borderLight}`;
    iconColor = COLORS.textPrimary;
  }

  return (
    <div
      style={{
        position: "relative",
        aspectRatio: "1 / 1",
        width: "100%",
        borderRadius: RADII.card,
        background: bg,
        border,
        boxShadow,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        transform: `scale(${scale})`,
        transformOrigin: "center center",
      }}
    >
      <FontAwesomeIcon
        icon={icon}
        style={{
          fontSize: 28,
          color: iconColor,
        }}
      />
      {isMagic && (
        <FontAwesomeIcon
          icon={faSparkles}
          style={{
            position: "absolute",
            top: -8,
            right: -8,
            fontSize: 18,
            color: isActive ? COLORS.textInverted : COLORS.purple,
            filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.15))",
          }}
        />
      )}
    </div>
  );
};

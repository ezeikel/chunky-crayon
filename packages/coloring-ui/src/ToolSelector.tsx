"use client";

import { useColoringContext } from "./context";
import { useSound } from "./useSound";
import cn from "./cn";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faBrush,
  faFillDrip,
  faPencil,
  faPaintbrush,
  faEraser,
  faSparkles,
  faWandSparkles,
  faRainbow,
  faSun,
  faBoltLightning,
  faStar,
  faEyeDropper,
} from "@fortawesome/pro-duotone-svg-icons";

type ToolSelectorProps = {
  className?: string;
  onStickerToolSelect?: () => void;
};

// Font Awesome icon wrappers for consistent sizing
const CrayonIcon = ({ className }: { className?: string }) => (
  <FontAwesomeIcon icon={faPencil} className={className} />
);

const MarkerIcon = ({ className }: { className?: string }) => (
  <FontAwesomeIcon icon={faPaintbrush} className={className} />
);

const FillIcon = ({ className }: { className?: string }) => (
  <FontAwesomeIcon icon={faFillDrip} className={className} />
);

const EraserIcon = ({ className }: { className?: string }) => (
  <FontAwesomeIcon icon={faEraser} className={className} />
);

const GlitterIcon = ({ className }: { className?: string }) => (
  <FontAwesomeIcon icon={faSparkles} className={className} />
);

const SparkleIcon = ({ className }: { className?: string }) => (
  <FontAwesomeIcon icon={faWandSparkles} className={className} />
);

const StickerIcon = ({ className }: { className?: string }) => (
  <FontAwesomeIcon icon={faStar} className={className} />
);

const RainbowIcon = ({ className }: { className?: string }) => (
  <FontAwesomeIcon icon={faRainbow} className={className} />
);

const GlowIcon = ({ className }: { className?: string }) => (
  <FontAwesomeIcon icon={faSun} className={className} />
);

const NeonIcon = ({ className }: { className?: string }) => (
  <FontAwesomeIcon icon={faBoltLightning} className={className} />
);

const MagicRevealIcon = ({ className }: { className?: string }) => (
  <FontAwesomeIcon icon={faBrush} className={className} />
);

const MagicAutoIcon = ({ className }: { className?: string }) => (
  <FontAwesomeIcon icon={faFillDrip} className={className} />
);

const EyedropperIcon = ({ className }: { className?: string }) => (
  <FontAwesomeIcon icon={faEyeDropper} className={className} />
);

type ToolConfig = {
  id:
    | "crayon"
    | "marker"
    | "glitter"
    | "sparkle"
    | "rainbow"
    | "glow"
    | "neon"
    | "fill"
    | "eraser"
    | "sticker"
    | "magic-reveal"
    | "magic-auto"
    | "eyedropper";
  label: string;
  shortLabel?: string;
  icon: React.ComponentType<{ className?: string }>;
  isMagic?: boolean;
};

// Core tools only — sparkle, rainbow, glow, neon removed (confusing UX,
// implementations don't match user expectations). The rendering code stays
// in brushTextures.ts in case we want to bring them back later.
const baseTools: ToolConfig[] = [
  { id: "crayon", label: "Crayon", icon: CrayonIcon },
  { id: "marker", label: "Marker", icon: MarkerIcon },
  { id: "glitter", label: "Glitter", icon: GlitterIcon },
  { id: "fill", label: "Fill", icon: FillIcon },
  { id: "eraser", label: "Eraser", icon: EraserIcon },
  { id: "sticker", label: "Sticker", icon: StickerIcon },
  {
    id: "eyedropper",
    label: "Eyedropper",
    shortLabel: "Pick",
    icon: EyedropperIcon,
  },
  {
    id: "magic-reveal",
    label: "Magic Brush",
    shortLabel: "Magic",
    icon: MagicRevealIcon,
    isMagic: true,
  },
  {
    id: "magic-auto",
    label: "Auto Color",
    shortLabel: "Auto",
    icon: MagicAutoIcon,
    isMagic: true,
  },
];

// Kids variant: simplified tool set
const KIDS_TOOL_IDS = new Set([
  "fill",
  "crayon",
  "marker",
  "rainbow",
  "eraser",
  "sticker",
  "magic-auto",
]);

const ToolSelector = ({
  className,
  onStickerToolSelect,
}: ToolSelectorProps) => {
  const { activeTool, setActiveTool, brushType, setBrushType, variant } =
    useColoringContext();
  const { playSound } = useSound();

  // Filter tools based on variant
  const tools =
    variant === "kids"
      ? baseTools.filter((t) => KIDS_TOOL_IDS.has(t.id))
      : baseTools;

  const handleToolSelect = (toolId: ToolConfig["id"]) => {
    switch (toolId) {
      case "crayon":
        setActiveTool("brush");
        setBrushType("crayon");
        break;
      case "marker":
        setActiveTool("brush");
        setBrushType("marker");
        break;
      case "glitter":
        setActiveTool("brush");
        setBrushType("glitter");
        break;
      case "sparkle":
        setActiveTool("brush");
        setBrushType("sparkle");
        break;
      case "rainbow":
        setActiveTool("brush");
        setBrushType("rainbow");
        break;
      case "glow":
        setActiveTool("brush");
        setBrushType("glow");
        break;
      case "neon":
        setActiveTool("brush");
        setBrushType("neon");
        break;
      case "eraser":
        setActiveTool("brush");
        setBrushType("eraser");
        break;
      case "fill":
        setActiveTool("fill");
        // Keep current brush type for when user switches back
        break;
      case "sticker":
        setActiveTool("sticker");
        onStickerToolSelect?.();
        break;
      case "eyedropper":
        setActiveTool("eyedropper");
        break;
      case "magic-reveal":
        setActiveTool("magic-reveal");
        break;
      case "magic-auto":
        setActiveTool("magic-auto");
        break;
    }
    playSound("pop");
  };

  const isToolActive = (toolId: ToolConfig["id"]) => {
    if (toolId === "fill") {
      return activeTool === "fill";
    }
    if (toolId === "sticker") {
      return activeTool === "sticker";
    }
    if (toolId === "magic-reveal") {
      return activeTool === "magic-reveal";
    }
    if (toolId === "magic-auto") {
      return activeTool === "magic-auto";
    }
    if (toolId === "eyedropper") {
      return activeTool === "eyedropper";
    }
    // For brush-based tools, check both activeTool and brushType
    return activeTool === "brush" && brushType === toolId;
  };

  return (
    <div
      className={cn(
        "flex items-center gap-2 p-2 rounded-coloring-card bg-white border-2 border-paper-cream-dark shadow-coloring-surface",
        className,
      )}
    >
      {tools.map(({ id, label, icon: Icon, isMagic }) => {
        const isActive = isToolActive(id);

        if (isMagic) {
          return (
            <button
              type="button"
              key={id}
              onClick={() => handleToolSelect(id)}
              className={cn(
                "relative flex items-center justify-center rounded-coloring-card size-10 sm:size-12 transition-all duration-coloring-base ease-coloring",
                "active:scale-95 focus:outline-none focus:ring-2 focus:ring-crayon-purple",
                isActive
                  ? "bg-gradient-to-br from-crayon-purple to-crayon-pink text-white"
                  : "bg-gradient-to-br from-crayon-purple/10 to-crayon-pink/10 text-crayon-purple",
              )}
              aria-label={label}
              title={label}
              aria-pressed={isActive}
              data-testid={`tool-${id}`}
            >
              <Icon className="size-5 sm:size-6" />
              <FontAwesomeIcon
                icon={faSparkles}
                className={cn(
                  "absolute -top-2 -right-2 size-4 drop-shadow-sm",
                  isActive ? "text-white" : "text-crayon-purple",
                )}
                aria-hidden
              />
            </button>
          );
        }

        return (
          <button
            type="button"
            key={id}
            onClick={() => handleToolSelect(id)}
            className={cn(
              "flex items-center justify-center rounded-coloring-card border-2 size-10 sm:size-12 transition-all duration-coloring-base ease-coloring",
              "active:scale-95 focus:outline-none focus:ring-2 focus:ring-coloring-accent",
              isActive
                ? "bg-coloring-accent border-transparent text-white shadow-btn-primary"
                : "bg-white border-paper-cream-dark text-text-primary hover:border-coloring-accent",
            )}
            aria-label={label}
            title={label}
            aria-pressed={isActive}
            data-testid={`tool-${id}`}
          >
            <Icon className="size-5 sm:size-6" />
          </button>
        );
      })}
    </div>
  );
};

export default ToolSelector;

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

const baseTools: ToolConfig[] = [
  { id: "crayon", label: "Crayon", icon: CrayonIcon },
  { id: "marker", label: "Marker", icon: MarkerIcon },
  { id: "glitter", label: "Glitter", icon: GlitterIcon },
  { id: "sparkle", label: "Sparkle", icon: SparkleIcon },
  { id: "rainbow", label: "Rainbow", icon: RainbowIcon },
  { id: "glow", label: "Glow", icon: GlowIcon },
  { id: "neon", label: "Neon", icon: NeonIcon },
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
        "flex items-center gap-1 p-2 rounded-lg bg-white/90 backdrop-blur-sm",
        className,
      )}
    >
      {tools.map(({ id, label, shortLabel, icon: Icon, isMagic }) => {
        const isActive = isToolActive(id);

        return (
          <button
            type="button"
            key={id}
            onClick={() => handleToolSelect(id)}
            className={cn(
              "flex items-center justify-center rounded-lg transition-all duration-150",
              "hover:bg-gray-100 active:scale-95 focus:outline-none focus:ring-2 focus:ring-coloring-accent",
              isMagic
                ? "flex-col gap-0.5 px-2 py-1 sm:px-3 sm:py-1.5 min-w-[3rem] sm:min-w-[3.5rem]"
                : "size-10 sm:size-12",
              {
                "bg-coloring-accent text-white hover:bg-coloring-accent/90":
                  isActive,
              },
            )}
            aria-label={label}
            title={label}
            aria-pressed={isActive}
          >
            <Icon
              className={isMagic ? "size-4 sm:size-5" : "size-5 sm:size-6"}
            />
            {isMagic && shortLabel && (
              <span className="text-[8px] sm:text-[9px] font-bold uppercase tracking-wide">
                {shortLabel}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};

export default ToolSelector;

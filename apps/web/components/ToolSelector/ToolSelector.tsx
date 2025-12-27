'use client';

import { useColoringContext } from '@/contexts/coloring';
import { useSound } from '@/hooks/useSound';
import cn from '@/utils/cn';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBrush, faFillDrip } from '@fortawesome/pro-duotone-svg-icons';

type ToolSelectorProps = {
  className?: string;
  onStickerToolSelect?: () => void;
};

// SVG icons for tools
const CrayonIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    {/* Crayon shape - chunky rounded tip */}
    <path d="M5.5 2C4.67 2 4 2.67 4 3.5v17C4 21.33 4.67 22 5.5 22h3c.83 0 1.5-.67 1.5-1.5v-17C10 2.67 9.33 2 8.5 2h-3zm1.5 2h1v2h-1V4z" />
    <path d="M7 7v13h0V7z" opacity="0.3" />
    {/* Crayon wrapper lines */}
    <path
      d="M4.5 8h5M4.5 10h5"
      stroke="currentColor"
      strokeWidth="0.5"
      opacity="0.5"
    />
    {/* Second crayon (offset) */}
    <path d="M14.5 2c-.83 0-1.5.67-1.5 1.5v17c0 .83.67 1.5 1.5 1.5h3c.83 0 1.5-.67 1.5-1.5v-17c0-.83-.67-1.5-1.5-1.5h-3zm1.5 2h1v2h-1V4z" />
    <path
      d="M13.5 8h5M13.5 10h5"
      stroke="currentColor"
      strokeWidth="0.5"
      opacity="0.5"
    />
  </svg>
);

const MarkerIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    {/* Marker body */}
    <rect x="7" y="2" width="10" height="14" rx="2" fill="currentColor" />
    {/* Marker tip */}
    <path d="M9 16h6l-1 6h-4l-1-6z" fill="currentColor" />
    {/* Marker cap line */}
    <line
      x1="7"
      y1="6"
      x2="17"
      y2="6"
      stroke="currentColor"
      strokeWidth="1"
      opacity="0.5"
    />
  </svg>
);

const FillIcon = ({ className }: { className?: string }) => (
  <FontAwesomeIcon icon={faFillDrip} className={className} />
);

const EraserIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M7 21h10" />
    <path d="M5.5 11.5L16 2l6 6-10.5 10.5a2 2 0 0 1-1.42.59H6.5a2 2 0 0 1-1.42-.59L2.17 15.6a2 2 0 0 1 0-2.83L5.5 11.5z" />
  </svg>
);

const PanIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    {/* Hand/move icon - open palm */}
    <path d="M18 11V6a2 2 0 0 0-2-2a2 2 0 0 0-2 2v0" />
    <path d="M14 10V4a2 2 0 0 0-2-2a2 2 0 0 0-2 2v2" />
    <path d="M10 10.5V6a2 2 0 0 0-2-2a2 2 0 0 0-2 2v8" />
    <path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2a8 8 0 0 1-8-8 2 2 0 1 1 4 0" />
  </svg>
);

const GlitterIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    {/* Multiple small sparkles/diamonds representing glitter */}
    <path d="M12 2l1 3 3 1-3 1-1 3-1-3-3-1 3-1 1-3z" />
    <path d="M5 10l.5 1.5L7 12l-1.5.5L5 14l-.5-1.5L3 12l1.5-.5L5 10z" />
    <path d="M19 10l.5 1.5L21 12l-1.5.5-.5 1.5-.5-1.5L17 12l1.5-.5.5-1.5z" />
    <path d="M12 14l.75 2.25L15 17l-2.25.75L12 20l-.75-2.25L9 17l2.25-.75L12 14z" />
    <path d="M7 16l.5 1.5L9 18l-1.5.5L7 20l-.5-1.5L5 18l1.5-.5L7 16z" />
    <path d="M17 16l.5 1.5L19 18l-1.5.5-.5 1.5-.5-1.5L15 18l1.5-.5.5-1.5z" />
  </svg>
);

const SparkleIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    {/* Large 4-pointed star sparkle */}
    <path d="M12 1l2 7 7 2-7 2-2 7-2-7-7-2 7-2 2-7z" />
    {/* Small accent sparkles */}
    <path
      d="M19 3l.5 1.5L21 5l-1.5.5L19 7l-.5-1.5L17 5l1.5-.5L19 3z"
      opacity="0.6"
    />
    <path
      d="M5 17l.5 1.5L7 19l-1.5.5L5 21l-.5-1.5L3 19l1.5-.5L5 17z"
      opacity="0.6"
    />
  </svg>
);

const StickerIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    {/* Star sticker shape */}
    <path d="M12 2l2.4 7.2H22l-6 4.8 2.4 7.2L12 16.4l-6.4 4.8 2.4-7.2-6-4.8h7.6L12 2z" />
    {/* Peel effect */}
    <path
      d="M18 18c1.5-1.5 2.5-3.5 2.5-5.5"
      stroke="currentColor"
      strokeWidth="1"
      fill="none"
      opacity="0.4"
    />
  </svg>
);

const RainbowIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none">
    {/* Rainbow arcs - from outer to inner with different colors */}
    <path
      d="M3 18C3 10 8 4 12 4s9 6 9 14"
      stroke="#FF0000"
      strokeWidth="2"
      strokeLinecap="round"
    />
    <path
      d="M5 18C5 11.5 8.5 6 12 6s7 5.5 7 12"
      stroke="#FF8800"
      strokeWidth="2"
      strokeLinecap="round"
    />
    <path
      d="M7 18C7 13 9.5 8 12 8s5 5 5 10"
      stroke="#FFDD00"
      strokeWidth="2"
      strokeLinecap="round"
    />
    <path
      d="M9 18C9 14.5 10.5 10 12 10s3 4.5 3 8"
      stroke="#00CC00"
      strokeWidth="2"
      strokeLinecap="round"
    />
    <path
      d="M11 18c0-2 .5-6 1-6s1 4 1 6"
      stroke="#0066FF"
      strokeWidth="2"
      strokeLinecap="round"
    />
  </svg>
);

const GlowIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    {/* Glowing orb with radiating effect */}
    <circle cx="12" cy="12" r="8" fill="currentColor" opacity="0.15" />
    <circle cx="12" cy="12" r="6" fill="currentColor" opacity="0.3" />
    <circle cx="12" cy="12" r="4" fill="currentColor" opacity="0.6" />
    <circle cx="12" cy="12" r="2.5" fill="currentColor" />
    {/* Light rays */}
    <path
      d="M12 2v3M12 19v3M2 12h3M19 12h3M4.93 4.93l2.12 2.12M16.95 16.95l2.12 2.12M4.93 19.07l2.12-2.12M16.95 7.05l2.12-2.12"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      opacity="0.5"
    />
  </svg>
);

const NeonIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
  >
    {/* Neon tube lightning bolt shape */}
    <path
      d="M13 2L4 14h7l-2 8 9-12h-7l2-8z"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="currentColor"
      opacity="0.3"
    />
    <path
      d="M13 2L4 14h7l-2 8 9-12h-7l2-8z"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    {/* Glow effect */}
    <path
      d="M13 2L4 14h7l-2 8 9-12h-7l2-8z"
      strokeWidth="4"
      strokeLinecap="round"
      strokeLinejoin="round"
      opacity="0.2"
    />
  </svg>
);

const MagicRevealIcon = ({ className }: { className?: string }) => (
  <FontAwesomeIcon icon={faBrush} className={className} />
);

const MagicAutoIcon = ({ className }: { className?: string }) => (
  <FontAwesomeIcon icon={faFillDrip} className={className} />
);

type ToolConfig = {
  id:
    | 'crayon'
    | 'marker'
    | 'glitter'
    | 'sparkle'
    | 'rainbow'
    | 'glow'
    | 'neon'
    | 'fill'
    | 'eraser'
    | 'sticker'
    | 'pan'
    | 'magic-reveal'
    | 'magic-auto';
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  isMagic?: boolean;
};

const baseTools: ToolConfig[] = [
  { id: 'crayon', label: 'Crayon', icon: CrayonIcon },
  { id: 'marker', label: 'Marker', icon: MarkerIcon },
  { id: 'glitter', label: 'Glitter', icon: GlitterIcon },
  { id: 'sparkle', label: 'Sparkle', icon: SparkleIcon },
  { id: 'rainbow', label: 'Rainbow', icon: RainbowIcon },
  { id: 'glow', label: 'Glow', icon: GlowIcon },
  { id: 'neon', label: 'Neon', icon: NeonIcon },
  { id: 'fill', label: 'Fill', icon: FillIcon },
  { id: 'eraser', label: 'Eraser', icon: EraserIcon },
  { id: 'sticker', label: 'Sticker', icon: StickerIcon },
  {
    id: 'magic-reveal',
    label: 'Magic Brush',
    icon: MagicRevealIcon,
    isMagic: true,
  },
  { id: 'magic-auto', label: 'Magic Fill', icon: MagicAutoIcon, isMagic: true },
];

const panTool: ToolConfig = { id: 'pan', label: 'Move', icon: PanIcon };

const ToolSelector = ({
  className,
  onStickerToolSelect,
}: ToolSelectorProps) => {
  const { activeTool, setActiveTool, brushType, setBrushType, zoom } =
    useColoringContext();
  const { playSound } = useSound();

  // Show pan tool when zoomed in
  const isZoomed = zoom > 1;
  const tools = isZoomed ? [...baseTools, panTool] : baseTools;

  const handleToolSelect = (toolId: ToolConfig['id']) => {
    switch (toolId) {
      case 'crayon':
        setActiveTool('brush');
        setBrushType('crayon');
        break;
      case 'marker':
        setActiveTool('brush');
        setBrushType('marker');
        break;
      case 'glitter':
        setActiveTool('brush');
        setBrushType('glitter');
        break;
      case 'sparkle':
        setActiveTool('brush');
        setBrushType('sparkle');
        break;
      case 'rainbow':
        setActiveTool('brush');
        setBrushType('rainbow');
        break;
      case 'glow':
        setActiveTool('brush');
        setBrushType('glow');
        break;
      case 'neon':
        setActiveTool('brush');
        setBrushType('neon');
        break;
      case 'eraser':
        setActiveTool('brush');
        setBrushType('eraser');
        break;
      case 'fill':
        setActiveTool('fill');
        // Keep current brush type for when user switches back
        break;
      case 'sticker':
        setActiveTool('sticker');
        onStickerToolSelect?.();
        break;
      case 'pan':
        setActiveTool('pan');
        break;
      case 'magic-reveal':
        setActiveTool('magic-reveal');
        break;
      case 'magic-auto':
        setActiveTool('magic-auto');
        break;
    }
    playSound('pop');
  };

  const isToolActive = (toolId: ToolConfig['id']) => {
    if (toolId === 'fill') {
      return activeTool === 'fill';
    }
    if (toolId === 'pan') {
      return activeTool === 'pan';
    }
    if (toolId === 'sticker') {
      return activeTool === 'sticker';
    }
    if (toolId === 'magic-reveal') {
      return activeTool === 'magic-reveal';
    }
    if (toolId === 'magic-auto') {
      return activeTool === 'magic-auto';
    }
    // For brush-based tools, check both activeTool and brushType
    return activeTool === 'brush' && brushType === toolId;
  };

  return (
    <div
      className={cn(
        'flex items-center gap-1 p-2 rounded-lg bg-white/90 backdrop-blur-sm',
        className,
      )}
    >
      {tools.map(({ id, label, icon: Icon, isMagic }) => {
        const isActive = isToolActive(id);

        return (
          <button
            type="button"
            key={id}
            onClick={() => handleToolSelect(id)}
            className={cn(
              'flex items-center justify-center rounded-lg transition-all duration-150',
              'hover:bg-gray-100 active:scale-95 focus:outline-none focus:ring-2 focus:ring-crayon-orange',
              isMagic
                ? 'flex-col gap-0.5 px-2 py-1 sm:px-3 sm:py-1.5 min-w-[3rem] sm:min-w-[3.5rem]'
                : 'size-10 sm:size-12',
              {
                'bg-crayon-orange text-white hover:bg-crayon-orange/90':
                  isActive,
              },
            )}
            aria-label={label}
            title={label}
            aria-pressed={isActive}
          >
            <Icon
              className={isMagic ? 'size-4 sm:size-5' : 'size-5 sm:size-6'}
            />
            {isMagic && (
              <span className="text-[8px] sm:text-[9px] font-bold uppercase tracking-wide">
                Magic
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};

export default ToolSelector;

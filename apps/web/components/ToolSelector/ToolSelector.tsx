'use client';

import { useColoringContext } from '@/contexts/coloring';
import { useSound } from '@/hooks/useSound';
import cn from '@/utils/cn';

type ToolSelectorProps = {
  className?: string;
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
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M19 11l-8-8-8.6 8.6a2 2 0 0 0 0 2.8l5.2 5.2c.8.8 2 .8 2.8 0L19 11z" />
    <path d="M5 21c.5-1.5 2.5-2 3-4 .5 2 2.5 2.5 3 4" />
    <path d="M19 11l2 2" />
  </svg>
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

type ToolConfig = {
  id: 'crayon' | 'marker' | 'fill' | 'eraser';
  label: string;
  icon: React.ComponentType<{ className?: string }>;
};

const tools: ToolConfig[] = [
  { id: 'crayon', label: 'Crayon', icon: CrayonIcon },
  { id: 'marker', label: 'Marker', icon: MarkerIcon },
  { id: 'fill', label: 'Fill', icon: FillIcon },
  { id: 'eraser', label: 'Eraser', icon: EraserIcon },
];

const ToolSelector = ({ className }: ToolSelectorProps) => {
  const { activeTool, setActiveTool, brushType, setBrushType } =
    useColoringContext();
  const { playSound } = useSound();

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
      case 'eraser':
        setActiveTool('brush');
        setBrushType('eraser');
        break;
      case 'fill':
        setActiveTool('fill');
        // Keep current brush type for when user switches back
        break;
    }
    playSound('pop');
  };

  const isToolActive = (toolId: ToolConfig['id']) => {
    if (toolId === 'fill') {
      return activeTool === 'fill';
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
      {tools.map(({ id, label, icon: Icon }) => {
        const isActive = isToolActive(id);

        return (
          <button
            type="button"
            key={id}
            onClick={() => handleToolSelect(id)}
            className={cn(
              'flex items-center justify-center size-10 sm:size-12 rounded-lg transition-all duration-150',
              'hover:bg-gray-100 active:scale-95 focus:outline-none focus:ring-2 focus:ring-crayon-orange',
              {
                'bg-crayon-orange text-white hover:bg-crayon-orange/90':
                  isActive,
              },
            )}
            aria-label={label}
            title={label}
            aria-pressed={isActive}
          >
            <Icon className="size-5 sm:size-6" />
          </button>
        );
      })}
    </div>
  );
};

export default ToolSelector;

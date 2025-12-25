'use client';

import { ColoringTool, BrushType } from '@/constants';
import { useColoringContext } from '@/contexts/coloring';
import { useSound } from '@/hooks/useSound';
import cn from '@/utils/cn';

type ToolSelectorProps = {
  className?: string;
};

// SVG icons for tools
const BrushIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M9.06 11.9l8.07-8.06a2.85 2.85 0 1 1 4.03 4.03l-8.06 8.08" />
    <path d="M7.07 14.94c-1.66 0-3 1.35-3 3.02 0 1.33-2.5 1.52-2 2.02 1.08 1.1 2.49 2.02 4 2.02 2.2 0 4-1.8 4-4.04a3.01 3.01 0 0 0-3-3.02z" />
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
  id: ColoringTool | 'eraser';
  label: string;
  icon: React.ComponentType<{ className?: string }>;
};

const tools: ToolConfig[] = [
  { id: 'brush', label: 'Brush', icon: BrushIcon },
  { id: 'fill', label: 'Fill', icon: FillIcon },
  { id: 'eraser', label: 'Eraser', icon: EraserIcon },
];

const ToolSelector = ({ className }: ToolSelectorProps) => {
  const { activeTool, setActiveTool, brushType, setBrushType } =
    useColoringContext();
  const { playSound } = useSound();

  const handleToolSelect = (toolId: ColoringTool | 'eraser') => {
    if (toolId === 'eraser') {
      setActiveTool('brush');
      setBrushType('eraser');
    } else {
      setActiveTool(toolId);
      if (brushType === 'eraser') {
        setBrushType('crayon');
      }
    }
    playSound('pop');
  };

  const isToolActive = (toolId: ColoringTool | 'eraser') => {
    if (toolId === 'eraser') {
      return activeTool === 'brush' && brushType === 'eraser';
    }
    return activeTool === toolId && brushType !== 'eraser';
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

'use client';

import { useColoringContext } from '@/contexts/coloring';
import { useSound } from '@/hooks/useSound';
import { FILL_PATTERNS, type FillPattern } from '@/constants';
import cn from '@/utils/cn';

type PatternSelectorProps = {
  className?: string;
};

// Pattern preview icons using SVG patterns
const PatternPreview = ({
  pattern,
  color,
  isActive,
}: {
  pattern: FillPattern;
  color: string;
  isActive: boolean;
}) => {
  const size = 28;
  const patternSize = 8;

  // Generate pattern preview based on type
  const renderPattern = () => {
    switch (pattern) {
      case 'solid':
        return <rect width={size} height={size} fill={color} />;

      case 'dots':
        return (
          <>
            <rect width={size} height={size} fill={`${color}30`} />
            <circle cx={7} cy={7} r={3} fill={color} />
            <circle cx={21} cy={7} r={3} fill={color} />
            <circle cx={14} cy={14} r={3} fill={color} />
            <circle cx={7} cy={21} r={3} fill={color} />
            <circle cx={21} cy={21} r={3} fill={color} />
          </>
        );

      case 'stripes':
        return (
          <>
            <rect width={size} height={size} fill={`${color}30`} />
            <rect y={0} width={size} height={patternSize} fill={color} />
            <rect
              y={patternSize * 2}
              width={size}
              height={patternSize}
              fill={color}
            />
          </>
        );

      case 'stripes-diagonal':
        return (
          <>
            <rect width={size} height={size} fill={`${color}30`} />
            <path
              d="M-4,4 L4,-4 M0,28 L28,0 M24,32 L32,24"
              stroke={color}
              strokeWidth={4}
            />
          </>
        );

      case 'checkerboard':
        return (
          <>
            <rect width={size} height={size} fill={`${color}30`} />
            <rect x={0} y={0} width={14} height={14} fill={color} />
            <rect x={14} y={14} width={14} height={14} fill={color} />
          </>
        );

      case 'hearts':
        return (
          <>
            <rect width={size} height={size} fill={`${color}30`} />
            <path
              d="M14 22 C14 22 8 16 8 12 C8 9 10 8 12 8 C13 8 14 9 14 10 C14 9 15 8 16 8 C18 8 20 9 20 12 C20 16 14 22 14 22Z"
              fill={color}
            />
          </>
        );

      case 'stars':
        return (
          <>
            <rect width={size} height={size} fill={`${color}30`} />
            <path
              d="M14 4 L16 10 L22 10 L17 14 L19 20 L14 16 L9 20 L11 14 L6 10 L12 10 Z"
              fill={color}
            />
          </>
        );

      case 'zigzag':
        return (
          <>
            <rect width={size} height={size} fill={`${color}30`} />
            <path
              d="M0 7 L7 3 L14 7 L21 3 L28 7"
              stroke={color}
              strokeWidth={3}
              fill="none"
            />
            <path
              d="M0 14 L7 10 L14 14 L21 10 L28 14"
              stroke={color}
              strokeWidth={3}
              fill="none"
            />
            <path
              d="M0 21 L7 17 L14 21 L21 17 L28 21"
              stroke={color}
              strokeWidth={3}
              fill="none"
            />
          </>
        );

      default:
        return <rect width={size} height={size} fill={color} />;
    }
  };

  return (
    <svg
      viewBox={`0 0 ${size} ${size}`}
      className={cn(
        'size-7 rounded-sm overflow-hidden transition-transform',
        isActive && 'scale-110',
      )}
    >
      {renderPattern()}
    </svg>
  );
};

const patternOrder: FillPattern[] = [
  'solid',
  'dots',
  'stripes',
  'stripes-diagonal',
  'checkerboard',
  'hearts',
  'stars',
  'zigzag',
];

const PatternSelector = ({ className }: PatternSelectorProps) => {
  const { selectedPattern, setSelectedPattern, selectedColor, activeTool } =
    useColoringContext();
  const { playSound } = useSound();

  // Only show when fill tool is active
  if (activeTool !== 'fill') {
    return null;
  }

  const handlePatternSelect = (pattern: FillPattern) => {
    setSelectedPattern(pattern);
    playSound('pop');
  };

  return (
    <div
      className={cn(
        'flex items-center gap-1 p-2 rounded-lg bg-white/90 backdrop-blur-sm',
        className,
      )}
    >
      <span className="text-xs font-medium text-gray-500 px-1 hidden sm:block">
        Pattern:
      </span>
      <div className="flex items-center gap-1">
        {patternOrder.map((pattern) => {
          const isActive = selectedPattern === pattern;
          const config = FILL_PATTERNS[pattern];

          return (
            <button
              type="button"
              key={pattern}
              onClick={() => handlePatternSelect(pattern)}
              className={cn(
                'flex items-center justify-center size-10 sm:size-11 rounded-lg transition-all duration-150',
                'hover:bg-gray-100 active:scale-95 focus:outline-none focus:ring-2 focus:ring-crayon-orange',
                {
                  'bg-crayon-orange/20 ring-2 ring-crayon-orange': isActive,
                },
              )}
              aria-label={config.name}
              title={config.description}
              aria-pressed={isActive}
            >
              <PatternPreview
                pattern={pattern}
                color={selectedColor}
                isActive={isActive}
              />
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default PatternSelector;

import { Skeleton } from '@/components/ui/skeleton';
import cn from '@/utils/cn';

type ColoringImageSkeletonProps = {
  className?: string;
};

/**
 * Skeleton loader for ColoringImage cards.
 * Matches the exact dimensions and styling of the actual cards:
 * - 1:1 aspect ratio (images are 1024x1024)
 * - Same rounded corners and shadow as real cards
 * - Responsive: adapts to grid column width
 */
const ColoringImageSkeleton = ({ className }: ColoringImageSkeletonProps) => (
  <div
    className={cn(
      'relative w-full overflow-hidden rounded-lg shadow-lg bg-white',
      className,
    )}
  >
    {/* Maintain 1:1 aspect ratio using padding-bottom trick */}
    <div className="relative w-full pb-[100%]">
      <Skeleton className="absolute inset-0 rounded-lg" />
    </div>
  </div>
);

export default ColoringImageSkeleton;

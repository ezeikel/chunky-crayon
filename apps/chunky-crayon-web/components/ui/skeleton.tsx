import cn from '@/utils/cn';

type SkeletonProps = {
  className?: string;
};

export const Skeleton = ({ className }: SkeletonProps) => (
  <div
    className={cn('animate-pulse rounded-md bg-paper-cream-dark/50', className)}
  />
);

export default Skeleton;

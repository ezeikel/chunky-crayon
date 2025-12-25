'use client';

import { StaggerChildren, StaggerItem } from '@/components/motion';

type AnimatedGalleryGridProps = {
  children: React.ReactNode;
};

const AnimatedGalleryGrid = ({ children }: AnimatedGalleryGridProps) => {
  return (
    <StaggerChildren
      staggerDelay={0.12}
      className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
    >
      {children}
    </StaggerChildren>
  );
};

// Wrapper for individual preview cards
export const AnimatedPreviewCard = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  return <StaggerItem>{children}</StaggerItem>;
};

export default AnimatedGalleryGrid;

'use client';

import { StaggerChildren } from '@/components/motion';

type AnimatedStatsContainerProps = {
  children: React.ReactNode;
  className?: string;
};

const AnimatedStatsContainer = ({
  children,
  className,
}: AnimatedStatsContainerProps) => {
  return (
    <StaggerChildren staggerDelay={0.15} className={className}>
      {children}
    </StaggerChildren>
  );
};

export default AnimatedStatsContainer;

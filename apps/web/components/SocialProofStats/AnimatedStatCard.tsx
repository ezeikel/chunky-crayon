'use client';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import type { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import { StaggerItem, CountUp } from '@/components/motion';

type AnimatedStatCardProps = {
  icon: IconDefinition;
  value: number;
  label: string;
  index: number;
};

const AnimatedStatCard = ({
  icon,
  value,
  label,
  index,
}: AnimatedStatCardProps) => {
  const iconStyle = {
    '--fa-primary-color': 'hsl(var(--crayon-orange))',
    '--fa-secondary-color': 'hsl(var(--crayon-yellow))',
    '--fa-secondary-opacity': '1',
  } as React.CSSProperties;

  return (
    <StaggerItem className="flex flex-col items-center text-center p-6 bg-white/80 backdrop-blur-sm rounded-2xl border-2 border-paper-cream-dark shadow-sm hover:shadow-md transition-shadow">
      <FontAwesomeIcon
        icon={icon}
        className="text-3xl md:text-4xl mb-3"
        style={iconStyle}
      />
      <span className="font-tondo font-bold text-3xl md:text-4xl text-text-primary mb-1">
        <CountUp
          value={value}
          suffix="+"
          duration={2}
          delay={0.3 + index * 0.1}
        />
      </span>
      <span className="text-text-secondary text-sm md:text-base">{label}</span>
    </StaggerItem>
  );
};

export default AnimatedStatCard;

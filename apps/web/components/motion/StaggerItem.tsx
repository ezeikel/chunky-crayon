'use client';

import { motion, useReducedMotion } from 'framer-motion';

type Direction = 'up' | 'down' | 'left' | 'right' | 'none';

type StaggerItemProps = {
  children: React.ReactNode;
  /** Direction to animate from */
  direction?: Direction;
  /** Distance to travel in pixels */
  distance?: number;
  /** Duration of animation (seconds) */
  duration?: number;
  className?: string;
};

const getDirectionOffset = (direction: Direction, distance: number) => {
  switch (direction) {
    case 'up':
      return { x: 0, y: distance };
    case 'down':
      return { x: 0, y: -distance };
    case 'left':
      return { x: distance, y: 0 };
    case 'right':
      return { x: -distance, y: 0 };
    case 'none':
    default:
      return { x: 0, y: 0 };
  }
};

const StaggerItem = ({
  children,
  direction = 'up',
  distance = 24,
  duration = 0.5,
  className,
}: StaggerItemProps) => {
  const shouldReduceMotion = useReducedMotion();
  const offset = getDirectionOffset(direction, distance);

  // Respect user's motion preferences
  if (shouldReduceMotion) {
    return <div className={className}>{children}</div>;
  }

  const itemVariants = {
    hidden: {
      opacity: 0,
      x: offset.x,
      y: offset.y,
    },
    visible: {
      opacity: 1,
      x: 0,
      y: 0,
      transition: {
        duration,
        ease: [0.25, 0.1, 0.25, 1] as [number, number, number, number],
      },
    },
  };

  return (
    <motion.div variants={itemVariants} className={className}>
      {children}
    </motion.div>
  );
};

export default StaggerItem;

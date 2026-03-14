'use client';

import { motion, useReducedMotion } from 'framer-motion';

type Direction = 'up' | 'down' | 'left' | 'right' | 'none';

type FadeInProps = {
  children: React.ReactNode;
  /** Direction to animate from */
  direction?: Direction;
  /** Delay before animation starts (seconds) */
  delay?: number;
  /** Duration of animation (seconds) */
  duration?: number;
  /** Distance to travel in pixels */
  distance?: number;
  /** Only animate once when in view */
  once?: boolean;
  /** Amount of element that must be visible to trigger (0-1) */
  amount?: number;
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

const FadeIn = ({
  children,
  direction = 'up',
  delay = 0,
  duration = 0.5,
  distance = 24,
  once = true,
  amount = 0.3,
  className,
}: FadeInProps) => {
  const shouldReduceMotion = useReducedMotion();
  const offset = getDirectionOffset(direction, distance);

  // Respect user's motion preferences
  if (shouldReduceMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: offset.x, y: offset.y }}
      whileInView={{ opacity: 1, x: 0, y: 0 }}
      viewport={{ once, amount }}
      transition={{
        duration,
        delay,
        ease: [0.25, 0.1, 0.25, 1] as [number, number, number, number],
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
};

export default FadeIn;

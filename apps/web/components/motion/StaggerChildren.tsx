'use client';

import { motion, useReducedMotion } from 'framer-motion';

type StaggerChildrenProps = {
  children: React.ReactNode;
  /** Delay between each child animation (seconds) */
  staggerDelay?: number;
  /** Initial delay before first child animates (seconds) */
  delay?: number;
  /** Only animate once when in view */
  once?: boolean;
  /** Amount of element that must be visible to trigger (0-1) */
  amount?: number;
  className?: string;
};

const containerVariants = {
  hidden: {},
  visible: (custom: { staggerDelay: number; delay: number }) => ({
    transition: {
      staggerChildren: custom.staggerDelay,
      delayChildren: custom.delay,
    },
  }),
};

const StaggerChildren = ({
  children,
  staggerDelay = 0.1,
  delay = 0,
  once = true,
  amount = 0.2,
  className,
}: StaggerChildrenProps) => {
  const shouldReduceMotion = useReducedMotion();

  // Respect user's motion preferences
  if (shouldReduceMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      whileInView="visible"
      viewport={{ once, amount }}
      custom={{ staggerDelay, delay }}
      className={className}
    >
      {children}
    </motion.div>
  );
};

export default StaggerChildren;

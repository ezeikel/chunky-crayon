'use client';

import { useEffect, useRef, useState } from 'react';
import {
  motion,
  useReducedMotion,
  useInView,
  useSpring,
  useTransform,
} from 'framer-motion';

type CountUpProps = {
  /** The target number to count to */
  value: number;
  /** Duration of the counting animation in seconds */
  duration?: number;
  /** Suffix to display after the number (e.g., "+", "k", "%") */
  suffix?: string;
  /** Prefix to display before the number (e.g., "$") */
  prefix?: string;
  /** Format the number with locale separators */
  formatNumber?: boolean;
  /** Class name for the wrapper span */
  className?: string;
  /** Delay before animation starts (seconds) */
  delay?: number;
};

const CountUp = ({
  value,
  duration = 2,
  suffix = '',
  prefix = '',
  formatNumber = true,
  className,
  delay = 0,
}: CountUpProps) => {
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true, amount: 0.5 });
  const shouldReduceMotion = useReducedMotion();
  const [hasStarted, setHasStarted] = useState(false);

  // Handle delay
  useEffect(() => {
    if (isInView && !hasStarted) {
      const timeout = setTimeout(() => setHasStarted(true), delay * 1000);
      return () => clearTimeout(timeout);
    }
  }, [isInView, delay, hasStarted]);

  // Spring animation for smooth counting
  const spring = useSpring(0, {
    duration: duration * 1000,
    bounce: 0,
  });

  // Transform the spring value to an integer
  const display = useTransform(spring, (current) => {
    const num = Math.round(current);
    if (formatNumber) {
      return num.toLocaleString();
    }
    return num.toString();
  });

  // Start the animation when in view
  useEffect(() => {
    if (hasStarted) {
      spring.set(value);
    }
  }, [hasStarted, spring, value]);

  // Respect user's motion preferences
  if (shouldReduceMotion) {
    const formattedValue = formatNumber ? value.toLocaleString() : value;
    return (
      <span ref={ref} className={className}>
        {prefix}
        {formattedValue}
        {suffix}
      </span>
    );
  }

  return (
    <span ref={ref} className={className}>
      {prefix}
      <motion.span>{display}</motion.span>
      {suffix}
    </span>
  );
};

export default CountUp;

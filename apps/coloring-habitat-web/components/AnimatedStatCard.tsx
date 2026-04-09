"use client";

import { useEffect, useRef, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import cn from "@/utils/cn";

type AnimatedStatCardProps = {
  icon: IconDefinition;
  value: number;
  label: string;
  color?: string;
  suffix?: string;
};

const useCountUp = (target: number, duration: number, shouldStart: boolean) => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!shouldStart) {
      return;
    }

    const steps = 60;
    const increment = target / steps;
    let current = 0;
    let step = 0;

    const timer = setInterval(() => {
      step += 1;
      current += increment;
      if (step >= steps) {
        setCount(target);
        clearInterval(timer);
      } else {
        setCount(Math.floor(current));
      }
    }, duration / steps);

    return () => clearInterval(timer);
  }, [target, duration, shouldStart]);

  return count;
};

const AnimatedStatCard = ({
  icon,
  value,
  label,
  color = "text-primary",
  suffix = "+",
}: AnimatedStatCardProps) => {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  const count = useCountUp(value, 1800, inView);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      { threshold: 0.3 },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} className="flex flex-col items-center text-center">
      <div
        className={cn(
          "mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-background",
          color,
        )}
      >
        <FontAwesomeIcon icon={icon} size="lg" />
      </div>
      <p className="text-4xl font-extrabold tracking-tight text-foreground md:text-5xl">
        {count.toLocaleString()}
        {suffix && <span className="text-muted-foreground">{suffix}</span>}
      </p>
      <p className="mt-2 text-sm text-muted-foreground">{label}</p>
    </div>
  );
};

export default AnimatedStatCard;

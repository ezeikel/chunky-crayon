"use client";

import { useEffect, useRef, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faPalette,
  faSpa,
  faUsers,
  faClock,
} from "@fortawesome/free-solid-svg-icons";

type Stat = {
  value: number;
  suffix: string;
  label: string;
  icon: typeof faPalette;
  color: string;
};

const stats: Stat[] = [
  {
    value: 2.4,
    suffix: "M+",
    label: "Coloring pages created",
    icon: faPalette,
    color: "text-primary",
  },
  {
    value: 50,
    suffix: "K+",
    label: "Happy colorists",
    icon: faUsers,
    color: "text-accent",
  },
  {
    value: 89,
    suffix: "%",
    label: "Report feeling calmer",
    icon: faSpa,
    color: "text-primary",
  },
  {
    value: 12,
    suffix: "min",
    label: "Average session length",
    icon: faClock,
    color: "text-accent",
  },
];

const useCountUp = (target: number, duration: number, shouldStart: boolean) => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!shouldStart) return;

    const isDecimal = target % 1 !== 0;
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
        setCount(
          isDecimal ? parseFloat(current.toFixed(1)) : Math.floor(current),
        );
      }
    }, duration / steps);

    return () => clearInterval(timer);
  }, [target, duration, shouldStart]);

  return count;
};

const StatCard = ({ stat, inView }: { stat: Stat; inView: boolean }) => {
  const count = useCountUp(stat.value, 1800, inView);

  return (
    <div className="flex flex-col items-center text-center">
      <div
        className={`mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-secondary ${stat.color}`}
      >
        <FontAwesomeIcon icon={stat.icon} size="lg" />
      </div>
      <p className="text-4xl font-extrabold tracking-tight text-foreground md:text-5xl">
        {stat.value % 1 !== 0 ? count.toFixed(1) : count}
        <span className="text-muted-foreground">{stat.suffix}</span>
      </p>
      <p className="mt-2 text-sm text-muted-foreground">{stat.label}</p>
    </div>
  );
};

const StatsSection = () => {
  const sectionRef = useRef<HTMLElement>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = sectionRef.current;
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
    <section
      ref={sectionRef}
      className="border-y border-border bg-secondary py-20"
    >
      <div className="mx-auto max-w-6xl px-6">
        <div className="grid grid-cols-2 gap-10 md:grid-cols-4">
          {stats.map((stat) => (
            <StatCard key={stat.label} stat={stat} inView={inView} />
          ))}
        </div>
      </div>
    </section>
  );
};

export default StatsSection;

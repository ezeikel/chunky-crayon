'use client';

import { useEffect, useRef, useState } from 'react';

// Seeded pseudo-random so every client render produces the same squiggle
// for the same word. Without this the underline shape changes every time
// the word cycles in, which reads as flickery instead of hand-drawn.
type ScribbleProps = {
  /** Stable positive integer per word. Same seed → same squiggle. */
  seed: number;
  /** Stroke colour. Uses currentColor so the caller can control via text-*. */
  className?: string;
};

// Lazy-load roughjs so the ~15KB bundle only ships when the homepage hero
// is viewed. The underline is decorative — absent for ~1 frame after the
// word's entrance animation finishes, which users don't perceive.
export default function CrayonScribble({ seed, className }: ScribbleProps) {
  const groupRef = useRef<SVGGElement | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      // Dynamic import keeps the roughjs code out of the SSR bundle —
      // it needs DOM APIs and would crash on the server anyway.
      const { default: rough } = await import('roughjs/bin/rough');
      if (cancelled || !groupRef.current) return;

      const group = groupRef.current;

      // Clear any previous render (happens when the seed prop changes
      // via a parent re-render without an unmount — belt-and-braces).
      while (group.firstChild) group.removeChild(group.firstChild);

      // Generate into an offscreen svg element; rough wants one.
      const svg = group.ownerSVGElement;
      if (!svg) return;

      const roughSvg = rough.svg(svg, {
        options: {
          // Bowing — how much the stroke curves away from a straight
          // line. Higher = more sketchy. 3 feels like kid crayon.
          bowing: 3,
          // Roughness — how rough each individual stroke is.
          roughness: 2.4,
          // Multiple overlapping passes reads as crayon overlap rather
          // than a single clean stroke.
          strokeWidth: 4,
          // Stable shape per word.
          seed,
          // Crayon-orange at ~70% to match the word tint without
          // fighting it. Uses a literal colour here because Rough
          // can't read currentColor from the parent.
          stroke: 'currentColor',
        },
      });

      // Underline geometry: slight left-to-right rise then settle, so
      // the ends feel like a kid's hand coming down onto the paper and
      // lifting off the other side. Coordinates are in viewBox units.
      const node = roughSvg.line(2, 9, 238, 11, {
        bowing: 3,
        roughness: 2.4,
        strokeWidth: 4,
        seed,
        stroke: 'currentColor',
      });

      group.appendChild(node);

      // Animate each sub-path drawing in using stroke-dasharray/offset.
      // Roughjs emits multiple <path>s per "line" (one per pass); we
      // animate them in unison so the whole squiggle draws as one.
      const paths = group.querySelectorAll('path');
      paths.forEach((path, i) => {
        const length = path.getTotalLength();
        path.style.strokeDasharray = String(length);
        path.style.strokeDashoffset = String(length);
        path.style.transition = `stroke-dashoffset 450ms cubic-bezier(0.25, 0.1, 0.25, 1) ${i * 40 + 120}ms`;
        // Trigger the reflow then set offset to 0 so the transition runs.
        void path.getBoundingClientRect();
        path.style.strokeDashoffset = '0';
      });

      setReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [seed]);

  return (
    <svg
      aria-hidden
      viewBox="0 0 240 18"
      preserveAspectRatio="none"
      className={className}
      style={{
        // Fade in softly — roughjs can be absent for a tick on mount.
        opacity: ready ? 1 : 0,
        transition: 'opacity 180ms ease-out',
      }}
    >
      {/* Subtle turbulence filter to add paper-grain roughness on top
          of roughjs's hand-drawn multi-stroke. feDisplacementMap scale
          is low so the shape stays readable. */}
      <defs>
        <filter id={`paper-grain-${seed}`}>
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.9"
            numOctaves="2"
            seed={seed}
          />
          <feDisplacementMap in="SourceGraphic" scale="0.8" />
        </filter>
      </defs>
      <g ref={groupRef} filter={`url(#paper-grain-${seed})`} />
    </svg>
  );
}

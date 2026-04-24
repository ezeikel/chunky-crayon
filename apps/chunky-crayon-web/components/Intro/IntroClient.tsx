'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import Balancer from 'react-wrap-balancer';
import CrayonScribble from './CrayonScribble';
import {
  AnimatePresence,
  MotionConfig,
  motion,
  useReducedMotion,
} from 'framer-motion';
import cn from '@/utils/cn';
import AppStoreButtons from '@/components/AppStoreButtons';

// One entry per campaign currently represented in the purposeKey table.
// Order matters — this is the visible cycle sequence on the homepage.
// When a new ad campaign lands in DB (purposeKey 'ad:<key>'), add it
// here with the same three fields. The server pre-fetched every matching
// thumbnail in <Intro>; if a key in CYCLE has no matching thumbnail the
// item is silently skipped on mount to avoid broken images.
// Hash a word into a small positive integer. Same word → same seed →
// same squiggle shape across renders. Keeps each subject's underline
// visually unique and stable.
const wordSeed = (word: string): number => {
  let h = 0;
  for (let i = 0; i < word.length; i += 1) {
    h = (h * 31 + word.charCodeAt(i)) | 0;
  }
  return Math.abs(h) % 1000 || 1;
};

export type IntroCycleItem = {
  /** Short subject word dropped into the headline quote. */
  word: string;
  /** Campaign key — matches coloring_images.purposeKey after 'ad:' prefix. */
  campaignKey: string;
  /** ColoringImage.id — used to deep-link the polaroid to /coloring-image/[id]. */
  imageId: string;
  /** R2 URL of the coloring page to show. */
  thumbUrl: string;
  /** Alt text — describes the scene for SEO + a11y. */
  alt: string;
};

type IntroClientProps = {
  className?: string;
  eyebrow: string;
  /** Static tail of the headline after the cycling word. */
  headlineSuffix: string;
  /** Static head of the headline before the cycling word (usually 'Stop Googling '). */
  headlinePrefix: string;
  subtitle: string;
  cta: string;
  cycle: IntroCycleItem[];
};

// Tilted polaroid-style card. Wraps in a Next Link when imageId is set
// (production case — deep-link to the coloring page), renders as a
// plain div when there's no id (fallback-only path so the page still
// renders without a broken link).
type PolaroidCardProps = {
  imageId: string;
  word: string;
  caption: string;
  children: React.ReactNode;
};

const PolaroidCard = ({
  imageId,
  word,
  caption,
  children,
}: PolaroidCardProps) => {
  const card = (
    <motion.div
      initial={{ rotate: -3 }}
      whileHover={{ rotate: 0, scale: 1.03 }}
      transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
      className="relative bg-white rounded-sm p-2 pb-3 shadow-[0_8px_20px_rgba(0,0,0,0.06),0_2px_4px_rgba(0,0,0,0.04)] border border-black/5"
    >
      {children}
      <p className="font-tondo italic text-center text-sm text-text-muted mt-2">
        {caption}
      </p>
    </motion.div>
  );

  if (!imageId) return card;

  return (
    <Link
      href={`/coloring-image/${imageId}`}
      aria-label={`See the ${word} coloring page`}
      className="block rounded-sm cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-crayon-orange focus-visible:ring-offset-2"
    >
      {card}
    </Link>
  );
};

// Note: the underline now lives in its own CrayonScribble client
// component (imported above) that uses roughjs for a genuine
// hand-drawn feel. Left this comment so future readers know why the
// inline <motion.svg> scribble is gone.

export default function IntroClient({
  className,
  eyebrow,
  headlinePrefix,
  headlineSuffix,
  subtitle,
  cta,
  cycle,
}: IntroClientProps) {
  const [idx, setIdx] = useState(0);
  const reduceMotion = useReducedMotion();

  // Skip the interval entirely when the user has prefers-reduced-motion
  // on — they see the first item statically. Parents on accessibility
  // settings are the exact audience we don't want to distract.
  useEffect(() => {
    if (reduceMotion || cycle.length <= 1) return;
    const id = setInterval(() => {
      setIdx((i) => (i + 1) % cycle.length);
    }, 3000);
    return () => clearInterval(id);
  }, [reduceMotion, cycle.length]);

  const current = cycle[idx] ?? cycle[0];

  // Common ease for the staggered entrance. Using CSS keyframes via
  // Tailwind arbitrary values for the parent containers (runs pre-
  // hydration) and motion.div for the cycling children so the effects
  // compose without a hydration flash.
  const ENTRANCE = {
    eyebrow: '200ms',
    headline: '320ms',
    subhead: '480ms',
    thumb: '620ms',
    cta: '760ms',
  } as const;

  return (
    <div className={cn('relative', className)}>
      <p
        style={{ animationDelay: ENTRANCE.eyebrow }}
        className="font-rooney-sans text-xs sm:text-sm font-bold uppercase tracking-[0.16em] text-crayon-orange mb-5 animate-[fadeUp_400ms_ease-out_both] opacity-0"
      >
        {eyebrow}
      </p>

      <h1
        style={{ animationDelay: ENTRANCE.headline }}
        className="font-tondo font-bold text-text-primary text-[clamp(2.25rem,6vw,4rem)] leading-[0.95] tracking-tight mb-7 [word-break:break-word] animate-[fadeUp_500ms_ease-out_both] opacity-0"
      >
        <Balancer>
          {headlinePrefix}
          {/* motion.span with layout prop — lets Framer animate the
              horizontal shift when shorter/longer words swap in. No
              reserved slot, no empty gap on "T-rex". The trade is that
              surrounding text reflows slightly every 3s, but Framer
              smooths it so it reads as intentional rather than janky. */}
          <MotionConfig
            transition={{ duration: 0.35, ease: [0.25, 0.1, 0.25, 1] }}
          >
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.span
                key={current.word}
                layout="position"
                initial={reduceMotion ? false : { opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reduceMotion ? undefined : { opacity: 0, y: -10 }}
                className="relative inline-block align-baseline whitespace-nowrap"
              >
                {/* Opening quote stays the dark headline colour — it's
                    punctuation, not part of the emphasised subject. */}
                “<span className="text-crayon-orange">{current.word}</span>
                {!reduceMotion && (
                  <CrayonScribble
                    seed={wordSeed(current.word)}
                    className="absolute left-0 right-0 -bottom-1 w-full h-[14px] pointer-events-none text-crayon-orange/80"
                  />
                )}
              </motion.span>
            </AnimatePresence>
          </MotionConfig>
          {headlineSuffix}
        </Balancer>
      </h1>

      <p
        style={{ animationDelay: ENTRANCE.subhead }}
        className="font-rooney-sans text-lg sm:text-xl text-text-secondary leading-snug max-w-xl mb-8 animate-[fadeUp_400ms_ease-out_both] opacity-0"
      >
        {subtitle}
      </p>

      {/* Tilted polaroid card — visual proof that the product delivers.
          Clicking deep-links to the actual coloring page for whichever
          campaign is currently on screen, so cold visitors can go from
          "this looks like what I want" to "actually color it" in one
          click. Masking-tape strip and italic caption sell the
          scrapbook metaphor. */}
      <div
        style={{ animationDelay: ENTRANCE.thumb }}
        className="relative w-[180px] mb-8 animate-[fadeUp_500ms_ease-out_both] opacity-0"
      >
        <div
          aria-hidden
          className="absolute -top-2 left-1/2 -translate-x-1/2 z-10 h-5 w-20 rotate-[-3deg] bg-crayon-yellow-light/85 shadow-sm"
          style={{
            backgroundImage:
              'repeating-linear-gradient(45deg, transparent 0 3px, rgba(0,0,0,0.05) 3px 4px)',
          }}
        />
        <PolaroidCard
          imageId={current.imageId}
          word={current.word}
          caption={cta}
        >
          <div className="relative aspect-square rounded-sm overflow-hidden bg-paper-cream">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={current.thumbUrl}
                initial={reduceMotion ? false : { opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={reduceMotion ? undefined : { opacity: 0 }}
                transition={{
                  duration: 0.35,
                  ease: [0.25, 0.1, 0.25, 1],
                }}
                className="absolute inset-0"
              >
                <Image
                  src={current.thumbUrl}
                  alt={current.alt}
                  fill
                  sizes="180px"
                  className="object-contain"
                  priority={idx === 0}
                />
              </motion.div>
            </AnimatePresence>
          </div>
        </PolaroidCard>
      </div>

      <div
        style={{ animationDelay: ENTRANCE.cta }}
        className="animate-[fadeUp_400ms_ease-out_both] opacity-0"
      >
        <AppStoreButtons location="hero" />
      </div>
    </div>
  );
}

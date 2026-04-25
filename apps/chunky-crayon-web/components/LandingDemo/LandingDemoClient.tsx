'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { motion, AnimatePresence, useInView } from 'framer-motion';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faPlay,
  faPause,
  faMicrophone,
} from '@fortawesome/pro-solid-svg-icons';
import { faWandMagicSparkles } from '@fortawesome/pro-duotone-svg-icons';
import { useAnalytics } from '@/utils/analytics-client';
import { TRACKING_EVENTS } from '@/constants';

export type LandingDemoScenario = {
  campaignKey: string;
  request: string;
  ctaLabel: string;
  imageId: string;
  imageUrl: string;
  alt: string;
  title: string;
};

type LandingDemoClientProps = {
  title: string;
  body: string;
  idleLabel: string;
  drawingLabel: string;
  drawingSubLabel: string;
  playLabel: string;
  pauseLabel: string;
  scenarios: LandingDemoScenario[];
  page: 'homepage' | 'start';
};

// Phase durations — total cycle ~7s so a visitor sees one full
// describe→draw→reveal loop without sitting through dead air.
const LISTENING_MS = 1700;
const DRAWING_MS = 2200;
const RESULT_MS = 3200;
const CYCLE_MS = LISTENING_MS + DRAWING_MS + RESULT_MS;
const TICK_MS = 100;

type Phase = 'idle' | 'listening' | 'drawing' | 'result';

const getPhase = (active: boolean, elapsed: number): Phase => {
  if (!active) return 'idle';
  if (elapsed < LISTENING_MS) return 'listening';
  if (elapsed < LISTENING_MS + DRAWING_MS) return 'drawing';
  return 'result';
};

// Mock URL shown in the phone "address bar" — keeps the demo grounded
// in the real product surface (chunkycrayon.com/create) rather than
// abstract chrome.
const FAKE_URL = 'chunkycrayon.com/create';

export default function LandingDemoClient({
  title,
  body,
  idleLabel,
  drawingLabel,
  drawingSubLabel,
  playLabel,
  pauseLabel,
  scenarios,
  page,
}: LandingDemoClientProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [step, setStep] = useState(0);
  // Tracks how many distinct scenarios the user has watched complete a
  // full cycle. Used to fire LANDING_DEMO_COMPLETED exactly once when
  // every scenario has rolled past — set so we don't double-count when
  // the loop wraps.
  const seenRef = useRef<Set<number>>(new Set());
  const completedRef = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(containerRef, { once: false, margin: '-100px' });
  const { track } = useAnalytics();

  const active = isPlaying && isInView;
  const phase = getPhase(active, elapsed);
  const scenario = scenarios[step];

  useEffect(() => {
    if (!active) return undefined;

    const id = setInterval(() => {
      setElapsed((prev) => {
        const next = prev + TICK_MS;
        if (next >= CYCLE_MS) {
          // A full cycle of the current scenario just finished — record
          // it, and if every scenario has rolled past at least once
          // fire the completion event (once).
          setStep((s) => {
            seenRef.current.add(s);
            if (
              !completedRef.current &&
              seenRef.current.size >= scenarios.length
            ) {
              completedRef.current = true;
              track(TRACKING_EVENTS.LANDING_DEMO_COMPLETED, {
                page,
                scenarioCount: scenarios.length,
              });
            }
            return (s + 1) % scenarios.length;
          });
          return 0;
        }
        return next;
      });
    }, TICK_MS);

    return () => clearInterval(id);
  }, [active, scenarios.length, page, track]);

  const handlePlay = useCallback(() => {
    seenRef.current = new Set();
    completedRef.current = false;
    setStep(0);
    setElapsed(0);
    setIsPlaying(true);
    track(TRACKING_EVENTS.LANDING_DEMO_PLAYED, {
      page,
      startingScenario: scenarios[0]?.campaignKey ?? 'unknown',
    });
  }, [page, scenarios, track]);

  const handlePause = useCallback(() => {
    setElapsed(0);
    setIsPlaying(false);
  }, []);

  const handleResultCta = useCallback(
    (s: LandingDemoScenario) => {
      track(TRACKING_EVENTS.LANDING_DEMO_CTA_CLICKED, {
        page,
        scenario: s.campaignKey,
        coloringImageId: s.imageId,
      });
    },
    [page, track],
  );

  return (
    <section className="bg-paper-cream py-16 md:py-24">
      <div
        ref={containerRef}
        className="px-4 md:px-6 lg:px-8 grid md:grid-cols-2 gap-10 md:gap-16 items-center"
      >
        {/* Copy column — sits left on desktop, above device on mobile.
            No CTA button here on purpose: the phone IS the control. */}
        <div className="text-center md:text-left">
          <h2 className="font-tondo font-bold text-text-primary text-[clamp(1.75rem,4vw,2.75rem)] leading-[1.1] tracking-tight mb-5">
            {title}
          </h2>
          <p className="font-rooney-sans text-lg text-text-secondary leading-relaxed">
            {body}
          </p>
        </div>

        {/* Phone-frame device. Slight rotation + drop shadow keeps the
            visual playful and matches the polaroid up in the hero. */}
        <div className="relative mx-auto w-full max-w-[320px]">
          <div
            className="absolute -inset-6 bg-crayon-orange/10 rounded-[3rem] blur-2xl"
            aria-hidden
          />

          <div className="relative rounded-[2.25rem] bg-slate-900 p-3 shadow-2xl">
            {/* Notch */}
            <div className="absolute left-1/2 top-3 -translate-x-1/2 w-24 h-5 rounded-full bg-slate-900 z-10" />
            <div className="absolute left-1/2 top-4 -translate-x-1/2 w-3 h-3 rounded-full bg-slate-700 z-10" />

            <div className="relative rounded-[1.85rem] overflow-hidden bg-paper-cream aspect-[9/19] flex flex-col">
              {/* Status / fake URL bar */}
              <div className="flex items-center justify-center pt-7 pb-2 px-4">
                <div className="flex items-center gap-1.5 rounded-full bg-white/80 backdrop-blur px-3 py-1 border border-paper-cream-dark">
                  <span
                    className="w-1.5 h-1.5 rounded-full bg-crayon-orange"
                    aria-hidden
                  />
                  <span className="font-rooney-sans text-[10px] text-text-secondary">
                    {FAKE_URL}
                  </span>
                </div>
              </div>

              {/* Top progress strip — fills during drawing phase. */}
              <div className="h-1 mx-4 rounded-full bg-paper-cream-dark/60 overflow-hidden">
                {phase === 'drawing' && (
                  <motion.div
                    key={`bar-${step}`}
                    initial={{ width: '0%' }}
                    animate={{ width: '100%' }}
                    transition={{ duration: DRAWING_MS / 1000, ease: 'linear' }}
                    className="h-full bg-crayon-orange"
                  />
                )}
              </div>

              {/* Stage area. min-h keeps the phone canvas stable across
                  phases so nothing jumps when content swaps. */}
              <div className="flex-1 px-4 py-5 flex flex-col">
                <AnimatePresence mode="wait">
                  {phase === 'idle' && (
                    <motion.div
                      key="idle"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.25 }}
                      className="flex-1 flex flex-col items-center justify-center text-center px-2"
                    >
                      <motion.button
                        type="button"
                        onClick={handlePlay}
                        whileHover={{ scale: 1.06 }}
                        whileTap={{ scale: 0.94 }}
                        aria-label={playLabel}
                        className="relative w-16 h-16 rounded-full bg-crayon-orange flex items-center justify-center mb-4 shadow-lg hover:bg-crayon-orange-dark transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-crayon-orange focus-visible:ring-offset-2 focus-visible:ring-offset-paper-cream"
                      >
                        <span
                          aria-hidden
                          className="absolute inset-0 rounded-full bg-crayon-orange/40 animate-ping"
                        />
                        <FontAwesomeIcon
                          icon={faPlay}
                          className="relative text-white text-lg ml-0.5"
                        />
                      </motion.button>
                      <p className="font-rooney-sans text-sm text-text-secondary leading-snug max-w-[14rem]">
                        {idleLabel}
                      </p>
                    </motion.div>
                  )}

                  {phase === 'listening' && (
                    <motion.div
                      key={`listen-${step}`}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      transition={{ duration: 0.25 }}
                      className="flex-1 flex flex-col justify-end gap-3"
                    >
                      {/* Voice-input affordance — looks like a chat with
                          a kid using the mic input mode. */}
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 6 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        transition={{ duration: 0.3 }}
                        className="self-start max-w-[85%] rounded-2xl rounded-bl-sm bg-white border border-paper-cream-dark px-3.5 py-2.5 shadow-sm"
                      >
                        <p className="font-rooney-sans text-[13px] leading-snug text-text-primary">
                          {scenario.request}
                        </p>
                      </motion.div>
                      <div className="flex items-center justify-center pt-2">
                        <div className="relative">
                          <span
                            aria-hidden
                            className="absolute inset-0 rounded-full bg-crayon-orange/30 animate-ping"
                          />
                          <div className="relative w-12 h-12 rounded-full bg-crayon-orange flex items-center justify-center shadow-md">
                            <FontAwesomeIcon
                              icon={faMicrophone}
                              className="text-white text-sm"
                            />
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {phase === 'drawing' && (
                    <motion.div
                      key={`draw-${step}`}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      transition={{ duration: 0.25 }}
                      className="flex-1 flex flex-col items-center justify-center text-center"
                    >
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{
                          duration: 1.4,
                          ease: 'linear',
                          repeat: Infinity,
                        }}
                        className="mb-5"
                      >
                        <FontAwesomeIcon
                          icon={faWandMagicSparkles}
                          className="text-crayon-orange text-3xl"
                        />
                      </motion.div>
                      <p className="font-tondo font-bold text-text-primary text-base mb-1">
                        {drawingLabel}
                      </p>
                      <p className="font-rooney-sans text-xs text-text-secondary">
                        {drawingSubLabel}
                      </p>
                    </motion.div>
                  )}

                  {phase === 'result' && (
                    <motion.div
                      key={`result-${step}`}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      transition={{ duration: 0.3 }}
                      className="flex-1 flex flex-col"
                    >
                      <motion.div
                        initial={{ scale: 0.94 }}
                        animate={{ scale: 1 }}
                        transition={{
                          duration: 0.35,
                          ease: [0.22, 0.9, 0.3, 1],
                        }}
                        className="relative flex-1 rounded-xl overflow-hidden bg-white border border-paper-cream-dark shadow-sm"
                      >
                        <Image
                          src={scenario.imageUrl}
                          alt={scenario.alt}
                          fill
                          sizes="(max-width: 768px) 280px, 280px"
                          className="object-contain p-2"
                        />
                      </motion.div>
                      <Link
                        href={`/coloring-image/${scenario.imageId}`}
                        onClick={() => handleResultCta(scenario)}
                        className="mt-3 inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-full bg-crayon-orange text-white font-tondo font-bold text-sm shadow-sm hover:bg-crayon-orange-dark transition-colors"
                      >
                        {scenario.ctaLabel}
                        <span aria-hidden>→</span>
                      </Link>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Floating pause — only visible while playing. Sits over
                  the phone canvas so the control travels with the device
                  rather than detaching to the side of the page. */}
              {isPlaying && (
                <motion.button
                  type="button"
                  onClick={handlePause}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  aria-label={pauseLabel}
                  className="absolute bottom-3 right-3 w-9 h-9 rounded-full bg-text-primary text-white flex items-center justify-center shadow-md hover:bg-text-primary/90 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-crayon-orange focus-visible:ring-offset-2 focus-visible:ring-offset-paper-cream"
                >
                  <FontAwesomeIcon icon={faPause} className="text-[11px]" />
                </motion.button>
              )}
            </div>
          </div>

          {/* Scenario dots — show progress through the cycle. */}
          <div className="mt-5 flex justify-center gap-2">
            {scenarios.map((s, i) => (
              <button
                key={s.campaignKey}
                type="button"
                onClick={() => {
                  setStep(i);
                  setElapsed(0);
                  setIsPlaying(true);
                }}
                aria-label={`Show ${s.campaignKey} demo`}
                className={`h-2 rounded-full transition-all ${
                  i === step
                    ? 'w-8 bg-crayon-orange'
                    : 'w-2 bg-paper-cream-dark hover:bg-text-secondary/40'
                }`}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

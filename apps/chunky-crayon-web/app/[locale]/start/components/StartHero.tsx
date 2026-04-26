'use client';

import { useRef } from 'react';
import Link from 'next/link';
import Balancer from 'react-wrap-balancer';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faWandMagicSparkles } from '@fortawesome/pro-duotone-svg-icons';
import type { ColoringImage } from '@one-colored-pixel/db/types';
import cn from '@/utils/cn';
import { useAnalytics } from '@/utils/analytics-client';
import { TRACKING_EVENTS } from '@/constants';
import EmbeddedColoringCanvas from '@/components/EmbeddedColoringCanvas';

type StartHeroProps = {
  campaign: 'trex' | 'foxes' | 'dragon' | 'default';
  title: string;
  subtitle: string;
  eyebrow: string;
  tryColoringLabel: string;
  ctaLabel: string;
  ctaSubtext: string;
  image: Partial<ColoringImage> | null;
};

// First-view hero for paid ad traffic. Copy is campaign-aware so
// whatever hook drove the click gets echoed immediately on land.
//
// Right column is an embedded coloring canvas pre-loaded with the
// campaign image. Replaces the static polaroid that lived here before:
// only 1 of 258 paid Meta visitors clicked the polaroid through to
// /coloring-image/[id], so we removed the click and put the canvas
// inline instead. After the visitor's first stroke we fire
// START_HERO_CANVAS_INTERACTED for funnel analysis.
//
// Primary CTA copy stays as the campaign-translated label — the
// conversion framing changes from "try this thing" (pre-engagement) to
// "save what you just made" (post-engagement) via the copy itself.
export default function StartHero({
  campaign,
  title,
  subtitle,
  eyebrow,
  ctaLabel,
  ctaSubtext,
  image,
}: StartHeroProps) {
  const hasImage = Boolean(image?.id && image?.url);
  const { track } = useAnalytics();
  // Mount time so the CTA click event carries time-from-mount —
  // distinguishes "read copy → bounced to signin" (fast) from
  // "engaged with canvas → then clicked signin" (slow + higher intent).
  const mountTimeRef = useRef<number>(Date.now());

  return (
    <section className="relative py-12 md:py-20 lg:py-24 overflow-hidden">
      <div className="px-4 md:px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-center">
        {/* Copy column */}
        <div className="order-2 lg:order-1">
          <p className="font-rooney-sans text-xs sm:text-sm font-bold uppercase tracking-[0.16em] text-crayon-orange mb-5">
            {eyebrow}
          </p>

          <h1 className="font-tondo font-bold text-text-primary text-[clamp(2rem,5vw,3.5rem)] leading-[0.98] tracking-tight mb-6 [word-break:break-word]">
            <Balancer>{title}</Balancer>
          </h1>

          <p className="font-rooney-sans text-lg sm:text-xl text-text-secondary leading-snug max-w-xl mb-8">
            {subtitle}
          </p>

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            {/* Primary — sign in, carrying the campaign key so post-auth
                flows know which ad hook brought them in (used later for
                attribution + per-campaign onboarding variants). */}
            <Link
              href={`/signin?from=start&campaign=${campaign}`}
              onClick={() =>
                track(TRACKING_EVENTS.START_HERO_CTA_CLICKED, {
                  campaign,
                  cta: 'signin',
                  msFromMount: Date.now() - mountTimeRef.current,
                })
              }
              className={cn(
                'inline-flex items-center gap-2 font-tondo font-bold text-base md:text-lg text-white',
                'bg-btn-orange shadow-btn-primary hover:shadow-btn-primary-hover',
                'hover:scale-105 active:scale-95 transition-all duration-200',
                'rounded-full px-7 py-3.5',
              )}
            >
              <FontAwesomeIcon icon={faWandMagicSparkles} className="text-lg" />
              {ctaLabel}
            </Link>
            <p className="font-rooney-sans text-sm text-text-muted max-w-xs">
              {ctaSubtext}
            </p>
          </div>
        </div>

        {/* Canvas column — embedded coloring surface. Only render when
            the campaign image actually loaded; if the lookup returns
            null (e.g. unknown utm_campaign that resolveCampaign falls
            back on but image fetch fails) we leave the column empty
            rather than crash. */}
        <div className="order-1 lg:order-2 flex justify-center lg:justify-end">
          {hasImage && image ? (
            <EmbeddedColoringCanvas image={image} campaign={campaign} />
          ) : null}
        </div>
      </div>
    </section>
  );
}

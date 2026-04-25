import Image from 'next/image';
import Link from 'next/link';
import Balancer from 'react-wrap-balancer';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faWandMagicSparkles } from '@fortawesome/pro-duotone-svg-icons';
import type { ColoringImage } from '@one-colored-pixel/db/types';
import cn from '@/utils/cn';

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
// whatever hook drove the click gets echoed immediately on land. The
// polaroid-style image on the right is the real coloring page for
// that campaign (or T-rex by default) — clicking it opens the
// coloring-image page so visitors can actually play with the product.
// The primary conversion event is the "Try it free" CTA which routes
// to /signin with a return-to hint; secondary is the polaroid link.
export default function StartHero({
  campaign,
  title,
  subtitle,
  eyebrow,
  tryColoringLabel,
  ctaLabel,
  ctaSubtext,
  image,
}: StartHeroProps) {
  const hasImage = Boolean(image?.id && image?.url);

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

        {/* Image column — polaroid-style card. Only links to the
            coloring-image page when we actually have the image row. */}
        <div className="order-1 lg:order-2 flex justify-center lg:justify-end">
          {hasImage && image ? (
            <Link
              href={`/coloring-image/${image.id}`}
              aria-label={tryColoringLabel}
              className="group relative block rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-crayon-orange focus-visible:ring-offset-4"
            >
              {/* Masking tape at top */}
              <div
                aria-hidden
                className="absolute -top-3 left-1/2 -translate-x-1/2 z-10 h-6 w-28 rotate-[-3deg] bg-crayon-yellow-light/85 shadow-sm"
                style={{
                  backgroundImage:
                    'repeating-linear-gradient(45deg, transparent 0 3px, rgba(0,0,0,0.05) 3px 4px)',
                }}
              />
              <div className="relative bg-white rounded-sm p-3 pb-5 shadow-[0_12px_28px_rgba(0,0,0,0.08),0_2px_4px_rgba(0,0,0,0.04)] border border-black/5 rotate-[-2deg] group-hover:rotate-0 group-hover:scale-[1.02] transition-transform duration-300">
                <div className="relative aspect-square w-[280px] sm:w-[340px] md:w-[400px] rounded-sm overflow-hidden bg-paper-cream">
                  <Image
                    src={image.url!}
                    alt={image.alt ?? ''}
                    fill
                    sizes="(max-width: 640px) 280px, (max-width: 768px) 340px, 400px"
                    className="object-contain"
                    priority
                  />
                </div>
                <p className="font-tondo italic text-center text-base text-text-muted mt-3 group-hover:text-crayon-orange transition-colors">
                  {tryColoringLabel} →
                </p>
              </div>
            </Link>
          ) : null}
        </div>
      </div>
    </section>
  );
}

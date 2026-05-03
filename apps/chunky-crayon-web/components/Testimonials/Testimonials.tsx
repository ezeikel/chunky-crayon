'use client';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faQuoteLeft } from '@fortawesome/pro-solid-svg-icons';
import { faStar, faSparkles } from '@fortawesome/pro-duotone-svg-icons';
import { useTranslations } from 'next-intl';
import cn from '@/utils/cn';
import {
  TESTIMONIAL_META,
  SOCIAL_PROOF_STATS,
  type TestimonialMeta,
} from '@/constants';
import { FadeIn, StaggerChildren, StaggerItem } from '@/components/motion';

type TestimonialsProps = {
  className?: string;
  /** Where this section is rendered — drives social_proof_clicked location. */
  location?: 'homepage' | 'start' | 'pricing';
};

// Brand-coloured backgrounds for the initials circles. Picked to feel
// playful without clashing with the existing crayon palette. Cycled by
// translationKey so the same testimonial always gets the same colour.
const INITIALS_BG_PALETTE = [
  'bg-crayon-orange',
  'bg-crayon-teal',
  'bg-crayon-pink',
  'bg-crayon-purple',
  'bg-crayon-yellow',
  'bg-crayon-green',
] as const;

const getInitials = (name: string): string => {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

const getInitialsBg = (translationKey: string): string => {
  // Simple stable hash: sum of char codes, mod palette length
  let hash = 0;
  for (let i = 0; i < translationKey.length; i += 1) {
    hash += translationKey.charCodeAt(i);
  }
  return INITIALS_BG_PALETTE[hash % INITIALS_BG_PALETTE.length];
};

// Renders 5 stars with `floor(rating)` filled + the rest outlined.
// Aggregate ratings like 4.6 floor to 4 filled stars; the precise
// number sits next to the icons so the at-a-glance read is "4 out of
// 5" while the literal value stays accurate. Matches Amazon /
// Trustpilot / App Store convention. Exported for reuse on the
// pricing trust strip.
export const StarRating = ({ rating }: { rating: number }) => {
  const filledStyle = {
    '--fa-primary-color': 'hsl(var(--crayon-yellow))',
    '--fa-secondary-color': 'hsl(var(--crayon-orange))',
    '--fa-secondary-opacity': '1',
  } as React.CSSProperties;

  const emptyStyle = {
    '--fa-primary-color': '#e5e7eb',
    '--fa-secondary-color': '#d1d5db',
    '--fa-secondary-opacity': '1',
  } as React.CSSProperties;

  const filled = Math.floor(rating);

  return (
    <div className="flex gap-0.5">
      {[...Array(5)].map((_, i) => (
        <FontAwesomeIcon
          key={i}
          icon={faStar}
          className="w-4 h-4"
          style={i < filled ? filledStyle : emptyStyle}
        />
      ))}
    </div>
  );
};

const TestimonialCard = ({
  testimonial,
  name,
  role,
  quote,
  location,
}: {
  testimonial: TestimonialMeta;
  name: string;
  role: string;
  quote: string;
  location?: string;
}) => (
  <StaggerItem className="bg-white rounded-2xl p-6 shadow-card border-2 border-paper-cream-dark hover:shadow-lg hover:border-crayon-orange/30 transition-all duration-300 group">
    {/* Quote icon */}
    <FontAwesomeIcon
      icon={faQuoteLeft}
      className="w-6 h-6 text-crayon-orange/20 mb-3 group-hover:text-crayon-orange/40 transition-colors"
    />

    {/* Quote text */}
    <p className="text-text-secondary leading-relaxed mb-4 font-tondo">
      &ldquo;{quote}&rdquo;
    </p>

    {/* Author info */}
    <div className="flex items-center gap-3">
      <div
        className={cn(
          'flex items-center justify-center w-12 h-12 rounded-full text-white font-tondo font-bold text-base shadow-sm border-2 border-white',
          getInitialsBg(testimonial.translationKey),
        )}
        aria-hidden
      >
        {getInitials(name)}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-bold text-text-primary font-tondo truncate">
          {name}
        </p>
        {(role || location) && (
          <p className="text-sm text-text-tertiary truncate">
            {[role, location].filter(Boolean).join(' • ')}
          </p>
        )}
      </div>
      {testimonial.rating && <StarRating rating={testimonial.rating} />}
    </div>
  </StaggerItem>
);

const SocialProofHeader = () => {
  const t = useTranslations('homepage');
  const iconStyle = {
    '--fa-primary-color': 'hsl(var(--crayon-orange))',
    '--fa-secondary-color': 'hsl(var(--crayon-yellow))',
    '--fa-secondary-opacity': '1',
  } as React.CSSProperties;

  return (
    <div className="text-center mb-10 md:mb-12">
      {/* Section header with sparkles */}
      <div className="inline-flex items-center gap-2 mb-4">
        <FontAwesomeIcon
          icon={faSparkles}
          className="text-xl md:text-2xl"
          style={iconStyle}
        />
        <h2 className="font-tondo font-bold text-2xl md:text-3xl lg:text-4xl text-text-primary">
          {t('testimonials.title')}
        </h2>
        <FontAwesomeIcon
          icon={faSparkles}
          className="text-xl md:text-2xl"
          style={iconStyle}
        />
      </div>

      {/* Stats row */}
      <div className="flex flex-wrap items-center justify-center gap-4 md:gap-8">
        {/* Overlapping initials cluster (was stock avatars - swapped for
            initials in coloured circles to read as 'real people who didn't
            upload a photo' rather than 'illustration set'). */}
        <div className="flex -space-x-3">
          {TESTIMONIAL_META.slice(0, 5).map((testimonial, index) => {
            const name = t(
              `testimonials.items.${testimonial.translationKey}.name`,
            );
            return (
              <div
                key={testimonial.id}
                className={cn(
                  'flex items-center justify-center w-10 h-10 rounded-full text-white font-tondo font-bold text-sm border-2 border-white shadow-sm',
                  getInitialsBg(testimonial.translationKey),
                )}
                style={{ zIndex: 5 - index }}
                aria-hidden
              >
                {getInitials(name)}
              </div>
            );
          })}
        </div>

        {/* Rating */}
        <div className="flex items-center gap-2">
          <StarRating rating={SOCIAL_PROOF_STATS.averageRating} />
          <span className="font-bold text-text-primary">
            {SOCIAL_PROOF_STATS.averageRating}
          </span>
          <span className="text-text-tertiary">
            {t('testimonials.fromReviews', {
              count: SOCIAL_PROOF_STATS.reviewCount,
            })}
          </span>
        </div>
      </div>
    </div>
  );
};

const Testimonials = ({ className, location }: TestimonialsProps) => {
  const t = useTranslations('homepage');
  // location prop is currently used as a marker — when we add a click-
  // tracked rating link inside this section, we'll fire the event with
  // it. Keeping the param now so callers don't need to update later.
  void location;

  return (
    <section
      id="testimonials"
      className={cn('w-full py-12 md:py-16 scroll-mt-24', className)}
    >
      <FadeIn>
        <SocialProofHeader />
      </FadeIn>

      {/* Testimonial grid - responsive columns */}
      <StaggerChildren
        staggerDelay={0.1}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
      >
        {TESTIMONIAL_META.map((testimonial) => (
          <TestimonialCard
            key={testimonial.id}
            testimonial={testimonial}
            name={t(`testimonials.items.${testimonial.translationKey}.name`)}
            role={t(`testimonials.items.${testimonial.translationKey}.role`)}
            quote={t(`testimonials.items.${testimonial.translationKey}.quote`)}
            location={t(
              `testimonials.items.${testimonial.translationKey}.location`,
            )}
          />
        ))}
      </StaggerChildren>
    </section>
  );
};

export default Testimonials;

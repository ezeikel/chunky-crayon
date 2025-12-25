'use client';

import Image from 'next/image';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faQuoteLeft } from '@fortawesome/pro-solid-svg-icons';
import { faStar, faSparkles } from '@fortawesome/pro-duotone-svg-icons';
import cn from '@/utils/cn';
import {
  TESTIMONIALS,
  SOCIAL_PROOF_STATS,
  type Testimonial,
} from '@/constants';
import { FadeIn, StaggerChildren, StaggerItem } from '@/components/motion';

type TestimonialsProps = {
  className?: string;
};

const StarRating = ({ rating }: { rating: number }) => {
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

  return (
    <div className="flex gap-0.5">
      {[...Array(5)].map((_, i) => (
        <FontAwesomeIcon
          key={i}
          icon={faStar}
          className="w-4 h-4"
          style={i < rating ? filledStyle : emptyStyle}
        />
      ))}
    </div>
  );
};

const TestimonialCard = ({ testimonial }: { testimonial: Testimonial }) => (
  <StaggerItem className="bg-white rounded-2xl p-6 shadow-card border-2 border-paper-cream-dark hover:shadow-lg hover:border-crayon-orange/30 transition-all duration-300 group">
    {/* Quote icon */}
    <FontAwesomeIcon
      icon={faQuoteLeft}
      className="w-6 h-6 text-crayon-orange/20 mb-3 group-hover:text-crayon-orange/40 transition-colors"
    />

    {/* Quote text */}
    <p className="text-text-secondary leading-relaxed mb-4 font-tondo">
      &ldquo;{testimonial.quote}&rdquo;
    </p>

    {/* Author info */}
    <div className="flex items-center gap-3">
      <div className="relative w-12 h-12 rounded-full overflow-hidden border-2 border-crayon-orange/20">
        <Image
          src={testimonial.avatar}
          alt={testimonial.name}
          fill
          className="object-cover"
        />
      </div>
      <div className="flex-1">
        <p className="font-bold text-text-primary font-tondo">
          {testimonial.name}
        </p>
        {testimonial.role && (
          <p className="text-sm text-text-tertiary">{testimonial.role}</p>
        )}
      </div>
      {testimonial.rating && <StarRating rating={testimonial.rating} />}
    </div>
  </StaggerItem>
);

const SocialProofHeader = () => {
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
          Loved by families everywhere
        </h2>
        <FontAwesomeIcon
          icon={faSparkles}
          className="text-xl md:text-2xl"
          style={iconStyle}
        />
      </div>

      {/* Stats row */}
      <div className="flex flex-wrap items-center justify-center gap-4 md:gap-8">
        {/* Overlapping avatars */}
        <div className="flex -space-x-3">
          {TESTIMONIALS.slice(0, 5).map((testimonial, index) => (
            <div
              key={testimonial.id}
              className="relative w-10 h-10 rounded-full overflow-hidden border-2 border-white shadow-sm"
              style={{ zIndex: 5 - index }}
            >
              <Image
                src={testimonial.avatar}
                alt={testimonial.name}
                fill
                className="object-cover"
              />
            </div>
          ))}
        </div>

        {/* Rating */}
        <div className="flex items-center gap-2">
          <StarRating rating={Math.round(SOCIAL_PROOF_STATS.averageRating)} />
          <span className="font-bold text-text-primary">
            {SOCIAL_PROOF_STATS.averageRating}
          </span>
          <span className="text-text-tertiary">
            from {SOCIAL_PROOF_STATS.reviewCount} reviews
          </span>
        </div>
      </div>
    </div>
  );
};

const Testimonials = ({ className }: TestimonialsProps) => (
  <section className={cn('w-full py-12 md:py-16', className)}>
    <FadeIn>
      <SocialProofHeader />
    </FadeIn>

    {/* Testimonial grid - responsive columns */}
    <StaggerChildren
      staggerDelay={0.1}
      className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
    >
      {TESTIMONIALS.map((testimonial) => (
        <TestimonialCard key={testimonial.id} testimonial={testimonial} />
      ))}
    </StaggerChildren>
  </section>
);

export default Testimonials;

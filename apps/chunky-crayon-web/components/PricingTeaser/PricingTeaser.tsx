'use client';

import Link from 'next/link';
import Balancer from 'react-wrap-balancer';
import { trackEvent } from '@/utils/analytics-client';
import { trackViewContent } from '@/utils/pixels';
import { TRACKING_EVENTS } from '@/constants';

type PricingTeaserProps = {
  title: string;
  body: string;
  ctaLabel: string;
  /** Where this teaser is rendered — for funnel segmentation. */
  location: 'homepage' | 'start';
};

// Single-line pricing teaser instead of a full plan comparison table.
// Landing pages convert better with one CTA per section; the pricing
// page itself is one click away for anyone ready to commit. Click
// fires both PostHog (pricing_teaser_clicked) and Meta ViewContent
// — a hand-on-doorknob signal one rung above FAQ-open and one below
// the actual pricing-page InitiateCheckout.
const PricingTeaser = ({
  title,
  body,
  ctaLabel,
  location,
}: PricingTeaserProps) => {
  const handleClick = () => {
    trackEvent(TRACKING_EVENTS.PRICING_TEASER_CLICKED, { location });
    trackViewContent({
      contentType: 'pricing',
      contentId: `pricing_teaser_${location}`,
      contentName: 'Pricing Teaser',
    });
  };

  return (
    <section className="py-16 md:py-24">
      <div className="max-w-3xl mx-auto px-4 md:px-6 lg:px-8 text-center">
        <h2 className="font-tondo font-bold text-text-primary text-[clamp(1.75rem,4vw,2.75rem)] leading-[1.05] tracking-tight mb-5">
          <Balancer>{title}</Balancer>
        </h2>
        <p className="font-rooney-sans text-lg text-text-secondary leading-relaxed mb-8">
          <Balancer>{body}</Balancer>
        </p>
        <Link
          href="/pricing"
          onClick={handleClick}
          className="inline-flex items-center gap-2 font-tondo font-bold text-crayon-orange hover:text-crayon-orange-dark text-lg underline underline-offset-4 decoration-2 hover:decoration-crayon-orange-dark transition-colors"
        >
          {ctaLabel} →
        </Link>
      </div>
    </section>
  );
};

export default PricingTeaser;

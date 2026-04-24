import Link from 'next/link';
import Balancer from 'react-wrap-balancer';

type StartPricingProps = {
  title: string;
  body: string;
  ctaLabel: string;
};

// Single-line pricing teaser instead of a full plan comparison table.
// Landing pages convert better with one CTA per section; the pricing
// page itself is one click away for anyone ready to commit.
export default function StartPricing({
  title,
  body,
  ctaLabel,
}: StartPricingProps) {
  return (
    <section className="py-16 md:py-24">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center">
        <h2 className="font-tondo font-bold text-text-primary text-[clamp(1.75rem,4vw,2.75rem)] leading-[1.05] tracking-tight mb-5">
          <Balancer>{title}</Balancer>
        </h2>
        <p className="font-rooney-sans text-lg text-text-secondary leading-relaxed mb-8">
          <Balancer>{body}</Balancer>
        </p>
        <Link
          href="/pricing"
          className="inline-flex items-center gap-2 font-tondo font-bold text-crayon-orange hover:text-crayon-orange-dark text-lg underline underline-offset-4 decoration-2 hover:decoration-crayon-orange-dark transition-colors"
        >
          {ctaLabel} →
        </Link>
      </div>
    </section>
  );
}

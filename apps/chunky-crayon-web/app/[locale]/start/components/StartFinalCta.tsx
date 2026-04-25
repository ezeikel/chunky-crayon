import Link from 'next/link';
import Balancer from 'react-wrap-balancer';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faWandMagicSparkles } from '@fortawesome/pro-duotone-svg-icons';
import cn from '@/utils/cn';

type StartFinalCtaProps = {
  title: string;
  body: string;
  ctaLabel: string;
  ctaSubtext: string;
};

// Last-chance CTA at the bottom of the page. No back-up content after
// this — if the visitor scrolls past, we've lost them, so this section
// is generous with vertical space and focused on the one action.
export default function StartFinalCta({
  title,
  body,
  ctaLabel,
  ctaSubtext,
}: StartFinalCtaProps) {
  return (
    <section className="bg-crayon-orange/10 py-20 md:py-28">
      <div className="max-w-3xl mx-auto px-4 md:px-6 lg:px-8 text-center">
        <h2 className="font-tondo font-bold text-text-primary text-[clamp(1.75rem,5vw,3rem)] leading-[1.02] tracking-tight mb-5">
          <Balancer>{title}</Balancer>
        </h2>
        <p className="font-rooney-sans text-lg sm:text-xl text-text-secondary leading-snug mb-8 max-w-xl mx-auto">
          <Balancer>{body}</Balancer>
        </p>

        <div className="flex flex-col items-center gap-3">
          <Link
            href="/signin?from=start"
            className={cn(
              'inline-flex items-center gap-2 font-tondo font-bold text-lg text-white',
              'bg-btn-orange shadow-btn-primary hover:shadow-btn-primary-hover',
              'hover:scale-105 active:scale-95 transition-all duration-200',
              'rounded-full px-8 py-4',
            )}
          >
            <FontAwesomeIcon icon={faWandMagicSparkles} className="text-lg" />
            {ctaLabel}
          </Link>
          <p className="font-rooney-sans text-sm text-text-muted">
            {ctaSubtext}
          </p>
        </div>
      </div>
    </section>
  );
}

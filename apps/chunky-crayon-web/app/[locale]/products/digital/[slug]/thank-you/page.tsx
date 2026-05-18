import type { Metadata } from 'next';
import { Suspense } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faDownload, faCircleCheck } from '@fortawesome/pro-duotone-svg-icons';
import { getBundlePurchaseBySessionId } from '@/app/data/bundle';
import { signBundleDownloadToken } from '@/lib/bundle-download-token';
import { checkFeatureFlag } from '@/flags';
import PageWrap from '@/components/PageWrap/PageWrap';
import Breadcrumbs from '@/components/Breadcrumbs';
import { Button } from '@/components/ui/button';
import ThankYouProcessingPoller from './ThankYouProcessingPoller';

type ThankYouPageProps = {
  params: Promise<{ locale: string; slug: string }>;
  searchParams: Promise<{ session_id?: string }>;
};

export const metadata: Metadata = {
  title: 'Thanks for your order - Chunky Crayon',
  // Don't index thank-you pages — they're per-purchase and we don't want
  // them in search results. Stripe redirects users here directly.
  robots: { index: false, follow: false },
};

// Synchronous page handler — only renders the static shell. The dynamic
// island unwraps params + search params and hits the DB.
const ThankYouPage = ({ params, searchParams }: ThankYouPageProps) => {
  return (
    <PageWrap>
      <Suspense fallback={null}>
        <ThankYouContent params={params} searchParams={searchParams} />
      </Suspense>
    </PageWrap>
  );
};

const ThankYouContent = async ({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; slug: string }>;
  searchParams: Promise<{ session_id?: string }>;
}) => {
  const { locale, slug } = await params;
  const { session_id: sessionId } = await searchParams;

  const enabled = await checkFeatureFlag('bundles-shop');
  if (!enabled) notFound();

  if (!sessionId) {
    // Hit the page without a session_id — bounce to the bundle product
    // page rather than show empty thank-you content. Most likely a
    // hand-typed URL or a stale bookmark.
    notFound();
  }

  const purchase = await getBundlePurchaseBySessionId(sessionId);

  // Webhook race: Stripe sends the buyer here immediately on payment
  // success, but the BundlePurchase row only lands when our webhook
  // processes checkout.session.completed (typically <2s after, but can
  // be longer under load). Show a processing state with auto-refresh
  // so the buyer doesn't see a 404 and panic.
  if (!purchase) {
    return <ProcessingState slug={slug} sessionId={sessionId} />;
  }

  const buyerFirstName = purchase.user.name?.split(/\s+/)[0];
  const symbol =
    purchase.currency.toLowerCase() === 'gbp'
      ? '£'
      : purchase.currency.toLowerCase() === 'usd'
        ? '$'
        : purchase.currency.toLowerCase() === 'eur'
          ? '€'
          : '';
  const priceDisplay = `${symbol}${(purchase.pricePence / 100).toFixed(2)}`;

  // Sign a download token server-side so guests can download from this
  // page directly (they have no session cookie, but knowing a real
  // session_id and arriving via Stripe's redirect is good enough proof
  // of ownership for this 14-day window). Logged-in buyers also use the
  // tokened URL — same code path, same token expiry, simpler than
  // branching on auth state. The session-cookie auth path on the
  // download endpoint stays as a fallback for return visitors who hit
  // /api/bundles/[slug]/download without a token.
  const downloadToken = await signBundleDownloadToken(purchase.id);
  const downloadHref = `/api/bundles/${purchase.bundle.slug}/download?token=${encodeURIComponent(downloadToken)}`;

  return (
    <>
      <Breadcrumbs
        items={[
          { href: `/${locale}`, label: 'Home' },
          { href: `/${locale}/products`, label: 'Products' },
          { href: `/${locale}/products/digital`, label: 'Digital Bundles' },
          {
            href: `/${locale}/products/digital/${purchase.bundle.slug}`,
            label: purchase.bundle.name,
          },
          { label: 'Thank you' },
        ]}
      />

      <div className="container mx-auto max-w-3xl px-4 py-10 lg:py-16">
        {/* Confirmation header */}
        <header className="text-center mb-10 lg:mb-14">
          <div className="inline-flex items-center justify-center w-16 h-16 lg:w-20 lg:h-20 rounded-full bg-crayon-teal/15 border-3 border-crayon-teal/30 mb-6">
            <FontAwesomeIcon
              icon={faCircleCheck}
              className="text-3xl lg:text-4xl text-crayon-teal"
            />
          </div>
          <h1 className="font-tondo text-4xl lg:text-5xl font-bold text-text-primary mb-3">
            {buyerFirstName ? `Thanks, ${buyerFirstName}!` : 'Thanks!'}
          </h1>
          <p className="text-lg text-text-secondary font-rooney-sans max-w-xl mx-auto">
            Your <strong>{purchase.bundle.name}</strong> bundle is ready. We've
            also emailed a download link to keep things handy.
          </p>
        </header>

        {/* Listing hero card */}
        {purchase.bundle.listingHeroUrl && (
          <div className="mx-auto max-w-md mb-10 lg:mb-14">
            <div className="relative aspect-square rounded-3xl overflow-hidden border-3 border-text-primary/10 shadow-card bg-bg-white">
              <Image
                src={purchase.bundle.listingHeroUrl}
                alt={purchase.bundle.name}
                fill
                sizes="(min-width: 768px) 28rem, 100vw"
                className="object-cover"
                unoptimized
              />
            </div>
          </div>
        )}

        {/* Download CTA — single path for both logged-in buyers and
            guests, gated by the JWT signed above. Refunded purchases
            short-circuit to the refunded state (the download endpoint
            also checks refundedAt, so this is just a UX nicety to skip
            the misleading button). */}
        {purchase.refundedAt ? (
          <RefundedState locale={locale} slug={purchase.bundle.slug} />
        ) : (
          <DownloadCta href={downloadHref} priceDisplay={priceDisplay} />
        )}

        {/* What's next */}
        <section className="mt-12 lg:mt-16 bg-paper-cream rounded-3xl border-2 border-border-light p-6 lg:p-8">
          <h2 className="font-tondo text-xl lg:text-2xl font-bold text-text-primary mb-4">
            What's next?
          </h2>
          <ul className="space-y-3 text-text-secondary font-rooney-sans">
            <li>
              Print the PDF and color the {purchase.bundle.pageCount} pages by
              hand, as many times as you like.
            </li>
            <li>
              Or open any page in our online coloring canvas, no app needed.
            </li>
            <li>
              Share the bundle as a gift by forwarding the email — the link
              works for 14 days.
            </li>
          </ul>
        </section>

        {/* Back to shop */}
        <div className="mt-10 text-center">
          <Link
            href={`/${locale}/products/digital`}
            className="font-tondo font-bold text-crayon-orange-dark hover:text-crayon-orange transition-colors"
          >
            ← Back to all bundles
          </Link>
        </div>
      </div>
    </>
  );
};

// CTA shown to logged-in buyers — direct download via session-cookie auth.
const DownloadCta = ({
  href,
  priceDisplay,
}: {
  href: string;
  priceDisplay: string;
}) => (
  <div className="text-center">
    <Button asChild className="h-auto rounded-full px-8 py-4 text-lg">
      <a href={href}>
        <FontAwesomeIcon icon={faDownload} className="text-xl" />
        Download your bundle
      </a>
    </Button>
    <p className="mt-4 text-sm text-text-secondary font-rooney-sans">
      Order total: <strong>{priceDisplay}</strong>
    </p>
  </div>
);

// Stripe redirected the buyer here within a second of payment — but the
// BundlePurchase row only lands when our webhook processes the event.
// Client-side poller hits /api/bundles/{slug}/purchase-status every 2s
// and calls router.refresh() once the row appears. The server component
// re-renders with the now-existing purchase and swaps to the success
// state in place — no full page reload.
const ProcessingState = ({
  slug,
  sessionId,
}: {
  slug: string;
  sessionId: string;
}) => (
  <>
    <ThankYouProcessingPoller slug={slug} sessionId={sessionId} />
    <div className="container mx-auto max-w-2xl px-4 py-16 lg:py-24 text-center">
      <div className="inline-flex items-center justify-center w-16 h-16 lg:w-20 lg:h-20 rounded-full bg-crayon-yellow-light/40 border-3 border-crayon-orange/30 mb-6 animate-pulse">
        <FontAwesomeIcon
          icon={faCircleCheck}
          className="text-3xl lg:text-4xl text-crayon-orange"
        />
      </div>
      <h1 className="font-tondo text-3xl lg:text-4xl font-bold text-text-primary mb-3">
        Processing your order...
      </h1>
      <p className="text-text-secondary font-rooney-sans max-w-lg mx-auto">
        Hang tight — this usually takes just a couple of seconds. The page will
        update as soon as it's ready.
      </p>
    </div>
  </>
);

const RefundedState = ({ locale, slug }: { locale: string; slug: string }) => (
  <div className="text-center bg-paper-cream rounded-3xl border-2 border-border-light p-8">
    <h2 className="font-tondo text-xl font-bold text-text-primary mb-3">
      This order has been refunded
    </h2>
    <p className="text-text-secondary font-rooney-sans mb-5">
      Your bundle is no longer available for download. If this is unexpected,
      reach out and we'll sort it out.
    </p>
    <Link
      href={`/${locale}/products/digital/${slug}`}
      className="font-tondo font-bold text-crayon-orange-dark hover:text-crayon-orange"
    >
      Back to the bundle →
    </Link>
  </div>
);

export default ThankYouPage;

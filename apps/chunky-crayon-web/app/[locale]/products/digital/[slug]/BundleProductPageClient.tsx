'use client';

import { useState, useCallback, useMemo } from 'react';
import Image from 'next/image';
import { loadStripe } from '@stripe/stripe-js';
import { toast } from 'sonner';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faChevronLeft,
  faChevronRight,
  faDownload,
  faPalette,
  faPrint,
  faGift,
  faArrowRight,
} from '@fortawesome/pro-duotone-svg-icons';
import { createBundleCheckoutSession } from '@/app/actions/bundle-checkout';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_KEY as string);

type Props = {
  bundle: {
    slug: string;
    name: string;
    tagline: string;
    pageCount: number;
    pricePence: number;
    currency: string;
    images: string[];
  };
};

// ---------------------------------------------------------------------------
// Decorative SVG primitives. Inlined so the client doesn't pull roughjs at
// runtime — these were generated once with seed 11 / 7 / 4 to match the
// hand-drawn voice of our bg tile and listing-image squiggle.
// ---------------------------------------------------------------------------

const Squiggle = ({
  className,
  color = 'currentColor',
}: {
  className?: string;
  color?: string;
}) => (
  <svg
    viewBox="0 0 240 18"
    aria-hidden
    className={className}
    fill="none"
    stroke={color}
    strokeWidth="5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M5 11 C 28 4, 52 14, 78 9 S 130 4, 160 11 S 210 6, 235 10" />
  </svg>
);

const ScallopBlob = ({
  className,
  fill,
  stroke,
}: {
  className?: string;
  fill: string;
  stroke: string;
}) => (
  <svg viewBox="0 0 200 200" aria-hidden className={className}>
    <path
      d="M100 5 C 130 0 165 18 178 50 C 200 65 200 110 178 130 C 175 165 138 195 105 192 C 65 200 30 175 22 140 C 0 122 0 78 22 60 C 30 22 65 0 100 5 Z"
      fill={fill}
      stroke={stroke}
      strokeWidth="6"
      strokeLinejoin="round"
    />
  </svg>
);

const SparkleStar = ({
  className,
  color,
}: {
  className?: string;
  color: string;
}) => (
  <svg viewBox="0 0 24 24" aria-hidden className={className} fill={color}>
    <path d="M12 1 L13.6 9.4 L22 11 L13.6 12.6 L12 21 L10.4 12.6 L2 11 L10.4 9.4 Z" />
  </svg>
);

// Stable per-slot rotations for the thumbnail rail. Picked by hand to read
// as scattered without colliding visually.
const THUMB_ROTATIONS = ['-3deg', '2deg', '-1.5deg', '3.5deg', '-2.5deg'];

const BundleProductPageClient = ({ bundle }: Props) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [loading, setLoading] = useState(false);

  const formattedPrice = useMemo(() => {
    const cur = bundle.currency.toUpperCase();
    const symbol =
      cur === 'GBP' ? '£' : cur === 'USD' ? '$' : cur === 'EUR' ? '€' : '';
    return `${symbol}${(bundle.pricePence / 100).toFixed(2)}`;
  }, [bundle.currency, bundle.pricePence]);

  const handleBuy = useCallback(async () => {
    setLoading(true);
    const initiateCheckoutEventId = crypto.randomUUID();
    try {
      const stripe = await stripePromise;
      if (!stripe) throw new Error('Stripe failed to load');
      const session = await createBundleCheckoutSession(
        bundle.slug,
        initiateCheckoutEventId,
      );
      if (!session || !session.id) {
        toast.error(session?.error || 'Failed to start checkout');
        setLoading(false);
        return;
      }
      const { error } = await stripe.redirectToCheckout({
        sessionId: session.id,
      });
      if (error) {
        toast.error(error.message || 'Checkout failed');
        setLoading(false);
      }
    } catch (err) {
      console.error('[bundle-checkout]', err);
      toast.error('Something went wrong starting checkout');
      setLoading(false);
    }
  }, [bundle.slug]);

  if (bundle.images.length === 0) {
    return (
      <div className="container mx-auto py-16 text-center text-brown-700">
        This bundle is not yet ready to display.
      </div>
    );
  }

  return (
    <div className="relative isolate overflow-hidden">
      {/* Background atmosphere — soft cream with a faint hand-stippled dot
          field. Layered behind everything; the dots break up the flat
          page so it never reads sterile. */}
      <div
        aria-hidden
        className="absolute inset-0 -z-10 bg-cream"
        style={{
          backgroundImage:
            'radial-gradient(rgba(176, 119, 76, 0.08) 1.5px, transparent 1.5px)',
          backgroundSize: '22px 22px',
        }}
      />

      {/* Decorative sparkles scattered in the margins. Stable positions,
          purely atmospheric. Each is a tiny 4-pointed star. */}
      <SparkleStar
        color="#F4B47A"
        className="pointer-events-none absolute -top-2 left-[8%] h-5 w-5 opacity-70"
      />
      <SparkleStar
        color="#E8A0B0"
        className="pointer-events-none absolute top-[18%] right-[6%] h-7 w-7 opacity-60 rotate-12"
      />
      <SparkleStar
        color="#F8C76A"
        className="pointer-events-none absolute top-[55%] left-[3%] h-4 w-4 opacity-70"
      />
      <SparkleStar
        color="#C4A0D8"
        className="pointer-events-none absolute bottom-[14%] right-[10%] h-6 w-6 opacity-60 -rotate-6"
      />

      <div className="container mx-auto px-4 py-10 lg:py-20">
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,440px)] gap-10 lg:gap-16 items-start">
          {/* ============================================================
              IMAGE SIDE — Polaroid hero with washi tape + scattered rail
              ============================================================ */}
          <div className="flex flex-col gap-10">
            {/* Polaroid hero card.

                The card is tilted slightly counter-clockwise. Two strips
                of washi tape pin the top corners (one pink, one orange).
                Card has a soft brown drop shadow and a thick brown
                border. Rotation reverses on hover so the image reads as
                "settling into place" when the user engages. */}
            <div className="relative">
              <div
                className="relative mx-auto bg-white rounded-[28px] border-[3px] border-brown-700 p-3 lg:p-4 shadow-[0_18px_40px_-18px_rgba(92,58,33,0.45),_0_2px_0_rgba(92,58,33,0.08)] transition-transform duration-500 ease-out hover:rotate-0"
                style={{ transform: 'rotate(-1.4deg)', maxWidth: '640px' }}
              >
                {/* Washi tape strips — sit ON the polaroid corners,
                    slightly off-center, decorative only. */}
                <div
                  aria-hidden
                  className="pointer-events-none absolute -top-3 left-8 h-7 w-24 rounded-sm rotate-[-9deg] opacity-90 shadow-sm"
                  style={{
                    background:
                      'repeating-linear-gradient(45deg, #F4B0BC 0 6px, #F2C0CB 6px 12px)',
                  }}
                />
                <div
                  aria-hidden
                  className="pointer-events-none absolute -top-3 right-10 h-7 w-20 rounded-sm rotate-[7deg] opacity-90 shadow-sm"
                  style={{
                    background:
                      'repeating-linear-gradient(-45deg, #F8C76A 0 6px, #FBD78F 6px 12px)',
                  }}
                />

                <div className="relative aspect-square w-full overflow-hidden rounded-[18px] bg-cream">
                  <Image
                    src={bundle.images[activeIndex]}
                    alt={`${bundle.name} listing image ${activeIndex + 1}`}
                    fill
                    priority={activeIndex === 0}
                    sizes="(min-width: 1024px) 50vw, 100vw"
                    className="object-contain"
                  />

                  {bundle.images.length > 1 ? (
                    <>
                      <button
                        type="button"
                        aria-label="Previous image"
                        onClick={() =>
                          setActiveIndex((i) =>
                            i === 0 ? bundle.images.length - 1 : i - 1,
                          )
                        }
                        className="group absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white border-[3px] border-brown-700 flex items-center justify-center shadow-[0_3px_0_rgba(92,58,33,0.2)] hover:-translate-y-[55%] hover:bg-cream transition"
                      >
                        <FontAwesomeIcon
                          icon={faChevronLeft}
                          className="text-brown-700 text-lg group-hover:-translate-x-0.5 transition-transform"
                        />
                      </button>
                      <button
                        type="button"
                        aria-label="Next image"
                        onClick={() =>
                          setActiveIndex((i) =>
                            i === bundle.images.length - 1 ? 0 : i + 1,
                          )
                        }
                        className="group absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white border-[3px] border-brown-700 flex items-center justify-center shadow-[0_3px_0_rgba(92,58,33,0.2)] hover:-translate-y-[55%] hover:bg-cream transition"
                      >
                        <FontAwesomeIcon
                          icon={faChevronRight}
                          className="text-brown-700 text-lg group-hover:translate-x-0.5 transition-transform"
                        />
                      </button>

                      {/* Image counter — bottom-right, hand-drawn-y pill */}
                      <div className="absolute bottom-4 right-4 bg-brown-700 text-cream text-sm font-bold px-3 py-1 rounded-full">
                        {activeIndex + 1} / {bundle.images.length}
                      </div>
                    </>
                  ) : null}
                </div>
              </div>
            </div>

            {/* Scattered thumbnail rail. Each thumb has a stable tilt, a
                white card frame, and de-rotates + lifts on hover. Active
                thumb gets the orange border. */}
            {bundle.images.length > 1 ? (
              <div className="flex justify-center">
                <div className="flex flex-wrap gap-3 sm:gap-4 justify-center max-w-xl">
                  {bundle.images.map((src, i) => {
                    const rotation =
                      THUMB_ROTATIONS[i % THUMB_ROTATIONS.length];
                    const isActive = i === activeIndex;
                    return (
                      <button
                        key={src}
                        type="button"
                        onClick={() => setActiveIndex(i)}
                        aria-label={`Show image ${i + 1}`}
                        className={`group relative h-20 w-20 sm:h-24 sm:w-24 bg-white rounded-2xl border-[3px] p-1.5 transition-all duration-300 ease-out hover:!rotate-0 hover:-translate-y-1 hover:shadow-[0_8px_18px_-8px_rgba(92,58,33,0.45)] ${
                          isActive
                            ? 'border-crayon-orange-dark shadow-[0_4px_0_rgba(92,58,33,0.18)]'
                            : 'border-brown-700/35'
                        }`}
                        style={{ transform: `rotate(${rotation})` }}
                      >
                        <div className="relative h-full w-full overflow-hidden rounded-lg">
                          <Image
                            src={src}
                            alt=""
                            fill
                            sizes="120px"
                            className="object-cover"
                          />
                        </div>
                        {isActive ? (
                          <span
                            aria-hidden
                            className="absolute -top-2 -right-2 inline-flex items-center justify-center w-6 h-6 rounded-full bg-crayon-orange-dark text-white text-[10px] font-bold border-2 border-cream"
                          >
                            ✓
                          </span>
                        ) : null}
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : null}
          </div>

          {/* ============================================================
              BUY SIDE — Sticker-stack layout, sticky on desktop
              ============================================================ */}
          <aside className="lg:sticky lg:top-24">
            <div className="relative">
              {/* Floating "10 pages" sticker tag — anchors top-right of the
                  buy panel like Wyo's pink page badge. Rotated slightly so
                  it reads as a sticker, not a UI chip. */}
              <div
                aria-hidden
                className="absolute -top-6 -right-2 z-10"
                style={{ transform: 'rotate(8deg)' }}
              >
                <div className="relative w-[110px] h-[110px]">
                  <ScallopBlob
                    className="absolute inset-0 w-full h-full drop-shadow-[0_4px_0_rgba(92,58,33,0.18)]"
                    fill="#E89098"
                    stroke="#5C3A21"
                  />
                  <div className="relative flex flex-col items-center justify-center w-full h-full pt-1">
                    <span
                      className="font-heading text-white leading-none text-[34px]"
                      style={{ textShadow: '2px 2px 0 #5C3A21' }}
                    >
                      {bundle.pageCount}
                    </span>
                    <span className="text-white text-[11px] font-bold uppercase tracking-wider mt-0.5">
                      pages
                    </span>
                  </div>
                </div>
              </div>

              {/* Buy panel — white card on cream bg, brown outline,
                  thick drop-shadow. The "card" feels stuck to the page
                  rather than floating. */}
              <div className="relative bg-white border-[3px] border-brown-700 rounded-[28px] p-7 lg:p-8 shadow-[0_12px_30px_-14px_rgba(92,58,33,0.45),_0_2px_0_rgba(92,58,33,0.08)]">
                {/* Title block */}
                <div className="space-y-2">
                  <p
                    className="inline-flex items-center gap-2 text-crayon-pink-dark uppercase tracking-[0.18em] font-bold text-xs"
                    style={{ color: '#E5639A' }}
                  >
                    <span className="inline-block w-6 h-px bg-current" />
                    Digital Bundle · 01
                  </p>

                  <h1 className="font-heading text-4xl lg:text-5xl text-crayon-orange-dark leading-[1.05]">
                    {bundle.name}
                  </h1>

                  <div className="relative inline-block">
                    <Squiggle
                      className="absolute left-0 -bottom-3 w-44 text-crayon-pink-dark"
                      color="#E5639A"
                    />
                  </div>

                  <p className="text-brown-700 text-base lg:text-lg leading-relaxed pt-4">
                    {bundle.tagline}
                  </p>
                </div>

                {/* Price + CTA — visually grouped as one purchase block */}
                <div className="mt-7 pt-6 border-t-[3px] border-dashed border-brown-700/25">
                  <div className="flex items-baseline gap-3 mb-4">
                    <span className="font-heading text-5xl text-brown-700 leading-none">
                      {formattedPrice}
                    </span>
                    <span className="text-brown-500 text-sm font-medium">
                      one-time, {bundle.pageCount} pages
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={handleBuy}
                    disabled={loading}
                    className="group relative w-full overflow-hidden rounded-2xl bg-crayon-orange-dark text-white font-bold text-xl py-5 px-6 border-[3px] border-brown-700 shadow-[0_5px_0_rgba(92,58,33,0.85)] transition-all duration-150 hover:-translate-y-0.5 hover:shadow-[0_7px_0_rgba(92,58,33,0.85)] active:translate-y-0.5 active:shadow-[0_2px_0_rgba(92,58,33,0.85)] disabled:opacity-70 disabled:cursor-not-allowed disabled:hover:translate-y-0"
                  >
                    {/* Shine sweep — subtle idle animation, runs once on
                        page mount and on hover. CSS-only. */}
                    <span
                      aria-hidden
                      className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/30 to-transparent group-hover:translate-x-full transition-transform duration-700 ease-out"
                    />
                    <span className="relative flex items-center justify-center gap-3 font-heading">
                      {loading ? (
                        <>Starting checkout…</>
                      ) : (
                        <>
                          <span>Buy now · {formattedPrice}</span>
                          <FontAwesomeIcon
                            icon={faArrowRight}
                            className="text-lg group-hover:translate-x-1 transition-transform"
                          />
                        </>
                      )}
                    </span>
                  </button>

                  <p className="mt-3 text-center text-brown-500 text-xs">
                    Instant download. Secure Stripe checkout.
                  </p>
                </div>

                {/* Value-prop bullets — each icon sits in a colored
                    scallop blob so the bullets feel like they belong to
                    the same family as the page badge above. */}
                <ul className="mt-7 pt-6 border-t-[3px] border-dashed border-brown-700/25 flex flex-col gap-5">
                  <ValueBullet
                    icon={faDownload}
                    fill="#FCDA85"
                    stroke="#5C3A21"
                    iconColor="#D26542"
                    title="Print it tonight, color it now."
                    body="Instant PDF download after checkout, no shipping wait."
                  />
                  <ValueBullet
                    icon={faPalette}
                    fill="#F4C5CB"
                    stroke="#5C3A21"
                    iconColor="#E5639A"
                    title="Color online too."
                    body="Every page opens in our colouring canvas, ready to color again and again."
                  />
                  <ValueBullet
                    icon={faPrint}
                    fill="#F2B79E"
                    stroke="#5C3A21"
                    iconColor="#D26542"
                    title="Made for chunky-crayon hands."
                    body="Big shapes, friendly characters, designed for ages 3 to 8."
                  />
                  <ValueBullet
                    icon={faGift}
                    fill="#D9C4E5"
                    stroke="#5C3A21"
                    iconColor="#A06FB0"
                    title="The same dino crew, all 10 pages."
                    body="Like a tiny coloring book series with a recurring cast."
                  />
                </ul>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// ValueBullet — icon-in-a-scallop with title + body. Scallop colors vary
// per bullet to match the listing-image badge family.
// ---------------------------------------------------------------------------

const ValueBullet = ({
  icon,
  fill,
  stroke,
  iconColor,
  title,
  body,
}: {
  icon: typeof faDownload;
  fill: string;
  stroke: string;
  iconColor: string;
  title: string;
  body: string;
}) => (
  <li className="flex gap-4 items-start group">
    <div className="relative flex-shrink-0 w-12 h-12">
      <ScallopBlob
        className="absolute inset-0 w-full h-full"
        fill={fill}
        stroke={stroke}
      />
      <div className="relative flex items-center justify-center w-full h-full">
        <FontAwesomeIcon
          icon={icon}
          className="text-lg transition-transform group-hover:scale-110"
          style={{ color: iconColor }}
        />
      </div>
    </div>
    <div className="flex-1 pt-1">
      <p className="text-brown-700 leading-snug">
        <strong className="text-brown-700">{title}</strong>{' '}
        <span className="text-brown-500">{body}</span>
      </p>
    </div>
  </li>
);

export default BundleProductPageClient;

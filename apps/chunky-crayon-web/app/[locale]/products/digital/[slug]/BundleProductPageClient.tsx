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
  faFileLines,
  faUsers,
  faInfinity,
  faShieldCheck,
  faSparkles,
  faQuestion,
} from '@fortawesome/pro-duotone-svg-icons';
import { createBundleCheckoutSession } from '@/app/actions/bundle-checkout';
import CrayonScribble from '@/components/Intro/CrayonScribble';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_KEY as string);

type CastMember = {
  id: string;
  name: string;
  species: string;
  imageUrl: string;
  funFact: string;
};

type Props = {
  bundle: {
    slug: string;
    name: string;
    tagline: string;
    pageCount: number;
    pricePence: number;
    currency: string;
    images: string[];
    heroes: CastMember[];
  };
};

// ---------------------------------------------------------------------------
// Decorative SVG primitives
// ---------------------------------------------------------------------------

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

// Stable per-slot rotations for the thumbnail rail
const THUMB_ROTATIONS = ['-3deg', '2deg', '-1.5deg', '3.5deg', '-2.5deg'];

// FAQ items
const FAQ_ITEMS = [
  {
    question: 'How do I get my files?',
    answer:
      "After checkout, you'll get an email with a download link. You can also access your files anytime from your account.",
  },
  {
    question: 'Can I print these multiple times?',
    answer:
      'Yes! Print as many copies as you like for personal use. Perfect for siblings, playdates, or when you want to try new colors.',
  },
  {
    question: 'What paper should I use?',
    answer:
      'Regular printer paper works great! For best results with markers or paint, try heavier cardstock.',
  },
  {
    question: 'Can I color online instead?',
    answer:
      'Absolutely! Every page in the bundle opens in our free online coloring canvas. No app needed, works on tablets too.',
  },
];

// Cycled per-hero accent so a 4-hero bundle gets one of each. Order matches
// the rest of the page's color rotation (orange → pink → teal → purple).
const CAST_PALETTE = [
  { bg: 'bg-crayon-yellow-light/40', border: 'border-crayon-orange/30' },
  { bg: 'bg-crayon-pink-light/40', border: 'border-crayon-pink/30' },
  { bg: 'bg-crayon-teal/15', border: 'border-crayon-teal/30' },
  { bg: 'bg-crayon-purple/15', border: 'border-crayon-purple/30' },
] as const;

// What you get features for the bottom strip
const WHAT_YOU_GET = [
  {
    icon: faFileLines,
    title: 'Instant PDF',
    description: 'Download starts right after checkout',
    color: 'text-crayon-orange',
  },
  {
    icon: faPalette,
    title: 'Color Online',
    description: 'Every page opens in our web canvas',
    color: 'text-crayon-pink',
  },
  {
    icon: faInfinity,
    title: 'Replay Forever',
    description: 'Print unlimited copies, color again and again',
    color: 'text-crayon-teal',
  },
  {
    icon: faShieldCheck,
    title: 'Secure Checkout',
    description: 'Powered by Stripe, your data stays safe',
    color: 'text-crayon-purple',
  },
];

const BundleProductPageClient = ({ bundle }: Props) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [activeHeroId, setActiveHeroId] = useState<string | null>(
    bundle.heroes[0]?.id ?? null,
  );
  const [loading, setLoading] = useState(false);

  const activeHero = useMemo(
    () => bundle.heroes.find((h) => h.id === activeHeroId) ?? bundle.heroes[0],
    [bundle.heroes, activeHeroId],
  );

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
      <div className="container mx-auto py-16 text-center text-text-secondary font-rooney-sans">
        This bundle is not yet ready to display.
      </div>
    );
  }

  return (
    <div className="relative isolate overflow-hidden">
      {/* Background atmosphere */}
      <div
        aria-hidden
        className="absolute inset-0 -z-10 bg-bg-cream"
        style={{
          backgroundImage:
            'radial-gradient(rgba(176, 119, 76, 0.06) 1.5px, transparent 1.5px)',
          backgroundSize: '24px 24px',
        }}
      />

      {/* Decorative sparkles */}
      <SparkleStar
        color="#F4B47A"
        className="pointer-events-none absolute -top-2 left-[8%] h-5 w-5 opacity-60"
      />
      <SparkleStar
        color="#E8A0B0"
        className="pointer-events-none absolute top-[18%] right-[6%] h-7 w-7 opacity-50 rotate-12"
      />
      <SparkleStar
        color="#F8C76A"
        className="pointer-events-none absolute top-[55%] left-[3%] h-4 w-4 opacity-60"
      />
      <SparkleStar
        color="#C4A0D8"
        className="pointer-events-none absolute bottom-[14%] right-[10%] h-6 w-6 opacity-50 -rotate-6"
      />

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 py-8 lg:py-14">
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,420px)] gap-8 lg:gap-12 items-start">
          {/* ============================================================
              IMAGE SIDE
              ============================================================ */}
          <div className="flex flex-col gap-8">
            {/* Hero Image Card */}
            <div className="relative">
              <div
                className="relative mx-auto bg-bg-white rounded-3xl border-3 border-text-primary/15 p-3 lg:p-4 shadow-card transition-transform duration-500 ease-out hover:rotate-0"
                style={{ transform: 'rotate(-1deg)', maxWidth: '580px' }}
              >
                {/* Decorative tape strips */}
                <div
                  aria-hidden
                  className="pointer-events-none absolute -top-3 left-8 h-6 w-20 rounded-sm rotate-[-8deg] opacity-80"
                  style={{
                    background:
                      'repeating-linear-gradient(45deg, #F4B0BC 0 5px, #F2C0CB 5px 10px)',
                  }}
                />
                <div
                  aria-hidden
                  className="pointer-events-none absolute -top-3 right-10 h-6 w-16 rounded-sm rotate-[6deg] opacity-80"
                  style={{
                    background:
                      'repeating-linear-gradient(-45deg, #F8C76A 0 5px, #FBD78F 5px 10px)',
                  }}
                />

                <div className="relative aspect-square w-full overflow-hidden rounded-2xl bg-paper-cream">
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
                        className="group absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 lg:w-12 lg:h-12 rounded-full bg-bg-white border-2 border-text-primary/15 flex items-center justify-center shadow-card hover:-translate-y-[55%] hover:border-crayon-orange transition"
                      >
                        <FontAwesomeIcon
                          icon={faChevronLeft}
                          className="text-text-primary text-sm lg:text-base group-hover:-translate-x-0.5 transition-transform"
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
                        className="group absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 lg:w-12 lg:h-12 rounded-full bg-bg-white border-2 border-text-primary/15 flex items-center justify-center shadow-card hover:-translate-y-[55%] hover:border-crayon-orange transition"
                      >
                        <FontAwesomeIcon
                          icon={faChevronRight}
                          className="text-text-primary text-sm lg:text-base group-hover:translate-x-0.5 transition-transform"
                        />
                      </button>

                      {/* Image counter pill */}
                      <div className="absolute bottom-3 right-3 bg-text-primary text-bg-cream text-xs font-bold font-tondo px-3 py-1.5 rounded-full">
                        {activeIndex + 1} / {bundle.images.length}
                      </div>
                    </>
                  ) : null}
                </div>
              </div>
            </div>

            {/* Thumbnail Rail */}
            {bundle.images.length > 1 ? (
              <div className="flex justify-center">
                <div className="flex flex-wrap gap-2 sm:gap-3 justify-center max-w-lg">
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
                        className={`group relative h-16 w-16 sm:h-20 sm:w-20 bg-bg-white rounded-xl border-2 p-1 transition-all duration-300 ease-out hover:!rotate-0 hover:-translate-y-1 hover:shadow-card ${
                          isActive
                            ? 'border-crayon-orange shadow-card'
                            : 'border-text-primary/10'
                        }`}
                        style={{ transform: `rotate(${rotation})` }}
                      >
                        <div className="relative h-full w-full overflow-hidden rounded-lg">
                          <Image
                            src={src}
                            alt=""
                            fill
                            sizes="100px"
                            className="object-cover"
                          />
                        </div>
                        {isActive ? (
                          <span
                            aria-hidden
                            className="absolute -top-1.5 -right-1.5 inline-flex items-center justify-center w-5 h-5 rounded-full bg-crayon-orange text-white text-[9px] font-bold border-2 border-bg-cream"
                          >
                            <FontAwesomeIcon
                              icon={faChevronRight}
                              className="text-[8px]"
                            />
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
              BUY SIDE
              ============================================================ */}
          <aside className="lg:sticky lg:top-24">
            <div className="relative">
              {/* Floating page count badge */}
              <div
                aria-hidden
                className="absolute -top-5 -right-1 z-10"
                style={{ transform: 'rotate(7deg)' }}
              >
                <div className="relative w-24 h-24 lg:w-28 lg:h-28">
                  <ScallopBlob
                    className="absolute inset-0 w-full h-full drop-shadow-md"
                    fill="#E89098"
                    stroke="rgba(0,0,0,0.1)"
                  />
                  <div className="relative flex flex-col items-center justify-center w-full h-full pt-0.5">
                    <span
                      className="font-tondo text-white leading-none text-3xl lg:text-4xl font-bold"
                      style={{ textShadow: '1px 1px 0 rgba(0,0,0,0.15)' }}
                    >
                      {bundle.pageCount}
                    </span>
                    <span className="text-white text-[10px] lg:text-xs font-bold uppercase tracking-wider">
                      pages
                    </span>
                  </div>
                </div>
              </div>

              {/* Buy Panel Card */}
              <div className="relative bg-bg-white border-3 border-text-primary/10 rounded-3xl p-6 lg:p-8 shadow-card">
                {/* Decorative corner circle */}
                <div className="absolute top-4 left-4 w-16 h-16 opacity-20">
                  <svg
                    viewBox="0 0 64 64"
                    className="w-full h-full"
                    aria-hidden="true"
                  >
                    <circle
                      cx="32"
                      cy="32"
                      r="28"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeDasharray="5 3"
                      className="text-crayon-orange"
                    />
                  </svg>
                </div>

                {/* Title Block */}
                <div className="relative space-y-3">
                  <p className="inline-flex items-center gap-2 text-crayon-pink uppercase tracking-widest font-bold text-xs font-rooney-sans">
                    <span className="inline-block w-5 h-px bg-current" />
                    Digital Bundle
                  </p>

                  <h1 className="font-tondo text-3xl lg:text-4xl font-bold text-text-primary leading-tight">
                    {bundle.name}
                  </h1>

                  <div className="relative inline-block">
                    <CrayonScribble
                      seed={17}
                      className="absolute left-0 -bottom-2 w-36 h-3 text-crayon-pink/60"
                    />
                  </div>

                  <p className="text-text-secondary text-base lg:text-lg leading-relaxed pt-3 font-rooney-sans">
                    {bundle.tagline}
                  </p>
                </div>

                {/* Price + CTA */}
                <div className="mt-6 pt-5 border-t-2 border-dashed border-text-primary/10">
                  <div className="flex items-baseline gap-2 mb-4">
                    <span className="font-tondo text-4xl lg:text-5xl font-bold text-text-primary leading-none">
                      {formattedPrice}
                    </span>
                    <span className="text-text-secondary text-sm font-rooney-sans">
                      one-time
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={handleBuy}
                    disabled={loading}
                    className="group relative w-full overflow-hidden rounded-2xl bg-crayon-orange text-white font-bold text-lg lg:text-xl py-4 lg:py-5 px-6 border-3 border-crayon-orange-dark/20 shadow-btn transition-all duration-150 hover:-translate-y-0.5 hover:shadow-btn-hover active:translate-y-0.5 active:shadow-btn-active disabled:opacity-70 disabled:cursor-not-allowed disabled:hover:translate-y-0"
                  >
                    {/* Shine sweep */}
                    <span
                      aria-hidden
                      className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/25 to-transparent group-hover:translate-x-full transition-transform duration-700 ease-out"
                    />
                    <span className="relative flex items-center justify-center gap-2 font-tondo">
                      {loading ? (
                        <>Starting checkout...</>
                      ) : (
                        <>
                          <span>Buy now</span>
                          <FontAwesomeIcon
                            icon={faArrowRight}
                            className="text-base group-hover:translate-x-1 transition-transform"
                          />
                        </>
                      )}
                    </span>
                  </button>

                  <p className="mt-3 text-center text-text-secondary text-xs font-rooney-sans">
                    Instant download after secure Stripe checkout
                  </p>
                </div>

                {/* Value Prop Bullets */}
                <ul className="mt-6 pt-5 border-t-2 border-dashed border-text-primary/10 flex flex-col gap-4">
                  <ValueBullet
                    icon={faDownload}
                    fill="#FCDA85"
                    stroke="rgba(0,0,0,0.08)"
                    iconColor="#D26542"
                    title="Print it tonight, color it now."
                    body="Instant PDF download after checkout, no shipping wait."
                  />
                  <ValueBullet
                    icon={faPalette}
                    fill="#F4C5CB"
                    stroke="rgba(0,0,0,0.08)"
                    iconColor="#E5639A"
                    title="Color online too."
                    body="Every page opens in our colouring canvas, ready to color again and again."
                  />
                  <ValueBullet
                    icon={faPrint}
                    fill="#F2B79E"
                    stroke="rgba(0,0,0,0.08)"
                    iconColor="#D26542"
                    title="Made for chunky-crayon hands."
                    body="Big shapes, friendly characters, designed for ages 3 to 8."
                  />
                  <ValueBullet
                    icon={faGift}
                    fill="#D9C4E5"
                    stroke="rgba(0,0,0,0.08)"
                    iconColor="#A06FB0"
                    title="The same dino crew, all 10 pages."
                    body="Like a tiny coloring book series with a recurring cast."
                  />
                </ul>
              </div>
            </div>
          </aside>
        </div>

        {/* ============================================================
            WHAT'S INSIDE SECTION
            ============================================================ */}
        <section className="mt-12 lg:mt-20">
          <div className="text-center mb-8">
            <h2 className="font-tondo text-2xl lg:text-3xl font-bold text-text-primary relative inline-block">
              {"What's inside"}
              <CrayonScribble
                seed={31}
                className="absolute -bottom-1 left-0 w-full h-3 text-crayon-pink/60"
              />
            </h2>
            <p className="mt-4 text-text-secondary font-rooney-sans">
              {bundle.pageCount} coloring pages in this bundle
            </p>
          </div>

          {/* Page thumbnails grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 lg:gap-5">
            {bundle.images.slice(0, 10).map((src, idx) => (
              <button
                type="button"
                key={src}
                onClick={() => setActiveIndex(idx)}
                className="group relative aspect-square overflow-hidden rounded-2xl bg-bg-white border-2 border-text-primary/10 shadow-card hover:border-crayon-orange hover:-translate-y-1 hover:shadow-card-hover transition-all duration-200"
              >
                <Image
                  src={src}
                  alt={`Page ${idx + 1}`}
                  fill
                  sizes="(min-width: 1024px) 20vw, (min-width: 768px) 25vw, (min-width: 640px) 33vw, 50vw"
                  className="object-cover group-hover:scale-105 transition-transform duration-300"
                />
                {/* Page number badge */}
                <span className="absolute bottom-2 right-2 bg-text-primary/80 text-bg-cream text-xs font-bold font-tondo px-2 py-1 rounded-full">
                  {idx + 1}
                </span>
              </button>
            ))}
          </div>

          {bundle.images.length > 10 && (
            <p className="mt-4 text-center text-text-secondary text-sm font-rooney-sans">
              + {bundle.images.length - 10} more pages included
            </p>
          )}
        </section>

        {/* ============================================================
            MEET THE CAST SECTION
            ============================================================ */}
        <section className="mt-12 lg:mt-20 py-10 lg:py-14 -mx-4 md:-mx-6 lg:-mx-8 px-4 md:px-6 lg:px-8 bg-crayon-yellow-light/30 rounded-3xl border-2 border-crayon-orange/10">
          <div className="max-w-3xl mx-auto text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 lg:w-20 lg:h-20 rounded-2xl bg-bg-white border-3 border-crayon-orange/20 shadow-card mb-6">
              <FontAwesomeIcon
                icon={faUsers}
                className="text-2xl lg:text-3xl text-crayon-orange"
              />
            </div>

            <h2 className="font-tondo text-2xl lg:text-3xl font-bold text-text-primary mb-3">
              Meet the cast
            </h2>
            <p className="text-text-secondary font-rooney-sans max-w-lg mx-auto leading-relaxed">
              The same lovable characters appear across all {bundle.pageCount}{' '}
              pages. Like a tiny coloring book series where kids follow their
              favorite friends on new adventures.
            </p>

            {bundle.heroes.length > 0 && activeHero && (
              <div className="mt-10">
                {/* Active hero panel */}
                <div className="grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] gap-6 lg:gap-8 items-center bg-bg-white rounded-3xl border-3 border-text-primary/10 shadow-card p-5 lg:p-8">
                  <div className="aspect-square w-full max-w-xs mx-auto flex items-center justify-center">
                    <Image
                      key={activeHero.id}
                      src={activeHero.imageUrl}
                      alt={`${activeHero.name} the ${activeHero.species}`}
                      width={320}
                      height={320}
                      className="w-full h-full object-contain animate-in fade-in zoom-in-95 duration-300"
                      unoptimized
                    />
                  </div>
                  <div className="text-center md:text-left">
                    <p className="font-tondo text-3xl lg:text-4xl font-bold text-text-primary leading-tight">
                      {activeHero.name}
                    </p>
                    <p className="text-sm lg:text-base text-text-secondary font-rooney-sans mt-1">
                      {activeHero.species}
                    </p>
                    <p className="mt-4 text-base lg:text-lg text-text-primary/80 font-rooney-sans leading-relaxed">
                      {activeHero.funFact}
                    </p>
                  </div>
                </div>

                {/* Thumbnail row */}
                <div className="mt-5 grid grid-cols-4 gap-3 lg:gap-4 max-w-2xl mx-auto">
                  {bundle.heroes.map((hero, idx) => {
                    const palette = CAST_PALETTE[idx % CAST_PALETTE.length];
                    const isActive = hero.id === activeHero.id;
                    return (
                      <button
                        key={hero.id}
                        type="button"
                        onClick={() => setActiveHeroId(hero.id)}
                        aria-label={`Show ${hero.name}`}
                        aria-pressed={isActive}
                        className={`relative rounded-2xl border-3 bg-bg-white p-2 lg:p-3 transition-all duration-200 ${
                          isActive
                            ? `${palette.border} shadow-card-hover scale-105`
                            : 'border-text-primary/10 shadow-sm hover:-translate-y-0.5 hover:shadow-card opacity-80 hover:opacity-100'
                        }`}
                      >
                        <div className="aspect-square w-full flex items-center justify-center">
                          <Image
                            src={hero.imageUrl}
                            alt=""
                            width={120}
                            height={120}
                            className="w-full h-full object-contain"
                            unoptimized
                          />
                        </div>
                        <p className="mt-1.5 font-tondo text-xs lg:text-sm font-bold text-text-primary text-center">
                          {hero.name}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </section>

        {/* ============================================================
            WHAT YOU GET STRIP
            ============================================================ */}
        <section className="mt-12 lg:mt-20 py-10 lg:py-14 -mx-4 md:-mx-6 lg:-mx-8 px-4 md:px-6 lg:px-8 bg-paper-cream rounded-3xl border-2 border-border-light">
          <div className="max-w-4xl mx-auto">
            <h2 className="font-tondo text-2xl lg:text-3xl font-bold text-text-primary text-center mb-2">
              What you get
            </h2>
            <p className="text-center text-text-secondary mb-10 max-w-md mx-auto font-rooney-sans">
              Everything included with your bundle purchase
            </p>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
              {WHAT_YOU_GET.map((item) => (
                <div
                  key={item.title}
                  className="flex flex-col items-center text-center"
                >
                  <div className="w-14 h-14 lg:w-16 lg:h-16 rounded-2xl bg-bg-white border-2 border-text-primary/10 flex items-center justify-center mb-3 shadow-card">
                    <FontAwesomeIcon
                      icon={item.icon}
                      className={`text-xl lg:text-2xl ${item.color}`}
                    />
                  </div>
                  <h3 className="font-tondo text-sm lg:text-base font-bold text-text-primary mb-0.5">
                    {item.title}
                  </h3>
                  <p className="text-xs text-text-secondary font-rooney-sans leading-relaxed">
                    {item.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ============================================================
            FAQ SECTION
            ============================================================ */}
        <section className="mt-12 lg:mt-20">
          <div className="text-center mb-8">
            <h2 className="font-tondo text-2xl lg:text-3xl font-bold text-text-primary relative inline-block">
              Common questions
              <CrayonScribble
                seed={59}
                className="absolute -bottom-1 left-0 w-full h-3 text-crayon-teal/60"
              />
            </h2>
          </div>

          <div className="max-w-3xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-6">
            {FAQ_ITEMS.map((faq, idx) => (
              <div
                key={faq.question}
                className="p-5 lg:p-6 rounded-2xl bg-bg-white border-2 border-text-primary/10 shadow-card"
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold font-tondo ${
                      idx === 0
                        ? 'bg-crayon-orange'
                        : idx === 1
                          ? 'bg-crayon-pink'
                          : idx === 2
                            ? 'bg-crayon-teal'
                            : 'bg-crayon-purple'
                    }`}
                  >
                    <FontAwesomeIcon icon={faQuestion} className="text-xs" />
                  </div>
                  <div>
                    <h3 className="font-tondo text-base lg:text-lg font-bold text-text-primary mb-2">
                      {faq.question}
                    </h3>
                    <p className="text-sm text-text-secondary font-rooney-sans leading-relaxed">
                      {faq.answer}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ============================================================
            FINAL CTA STRIP
            ============================================================ */}
        <section className="mt-12 lg:mt-16 text-center">
          <div className="inline-block relative">
            <h2 className="font-tondo text-2xl lg:text-3xl font-bold text-text-primary mb-2">
              Ready to start coloring?
            </h2>
            <CrayonScribble
              seed={73}
              className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-48 h-3 text-crayon-orange/60"
            />
          </div>

          <p className="mt-4 text-text-secondary font-rooney-sans max-w-md mx-auto">
            Get {bundle.pageCount} coloring pages featuring a recurring cast of
            adorable characters. Print at home, color online, replay forever.
          </p>

          <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-4">
            <span className="font-tondo text-3xl lg:text-4xl font-bold text-text-primary">
              {formattedPrice}
            </span>
            <button
              type="button"
              onClick={handleBuy}
              disabled={loading}
              className="group relative overflow-hidden rounded-2xl bg-crayon-orange text-white font-bold text-lg py-4 px-8 border-3 border-crayon-orange-dark/20 shadow-btn transition-all duration-150 hover:-translate-y-0.5 hover:shadow-btn-hover active:translate-y-0.5 active:shadow-btn-active disabled:opacity-70 disabled:cursor-not-allowed disabled:hover:translate-y-0"
            >
              <span
                aria-hidden
                className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/25 to-transparent group-hover:translate-x-full transition-transform duration-700 ease-out"
              />
              <span className="relative flex items-center justify-center gap-2 font-tondo">
                {loading ? (
                  <>Starting checkout...</>
                ) : (
                  <>
                    <span>Buy now</span>
                    <FontAwesomeIcon
                      icon={faArrowRight}
                      className="text-base group-hover:translate-x-1 transition-transform"
                    />
                  </>
                )}
              </span>
            </button>
          </div>

          <p className="mt-4 text-text-secondary text-sm font-rooney-sans flex items-center justify-center gap-2">
            <FontAwesomeIcon
              icon={faShieldCheck}
              className="text-crayon-teal"
            />
            Secure checkout powered by Stripe
          </p>
        </section>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// ValueBullet
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
  <li className="flex gap-3 items-start group">
    <div className="relative flex-shrink-0 w-10 h-10 lg:w-11 lg:h-11">
      <ScallopBlob
        className="absolute inset-0 w-full h-full"
        fill={fill}
        stroke={stroke}
      />
      <div className="relative flex items-center justify-center w-full h-full">
        <FontAwesomeIcon
          icon={icon}
          className="text-sm lg:text-base transition-transform group-hover:scale-110"
          style={{ color: iconColor }}
        />
      </div>
    </div>
    <div className="flex-1 pt-0.5">
      <p className="text-sm lg:text-base leading-snug font-rooney-sans">
        <strong className="text-text-primary">{title}</strong>{' '}
        <span className="text-text-secondary">{body}</span>
      </p>
    </div>
  </li>
);

export default BundleProductPageClient;

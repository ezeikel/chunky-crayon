import Link from 'next/link';
import Image from 'next/image';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faArrowRight,
  faShoppingBag,
} from '@fortawesome/pro-duotone-svg-icons';
import { listPublishedBundles, type PublicBundle } from '@/app/data/bundle';
import { checkFeatureFlag } from '@/flags';

type FeaturedBundlesProps = {
  locale: string;
};

const formatPrice = (pricePence: number, currency: string): string => {
  const amount = pricePence / 100;
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format(amount);
};

/**
 * Server-rendered component displaying 3 featured product bundles on the homepage.
 * Links to /products/digital for the full catalog. Renders nothing if bundles-shop
 * flag is disabled or no bundles exist.
 */
const FeaturedBundles = async ({ locale }: FeaturedBundlesProps) => {
  const enabled = await checkFeatureFlag('bundles-shop');
  if (!enabled) return null;

  const allBundles = await listPublishedBundles();
  const bundles = allBundles.slice(0, 3);

  if (bundles.length === 0) return null;

  return (
    <section className="w-full">
      {/* Section Header */}
      <div className="text-center mb-8 lg:mb-10">
        <h2 className="font-tondo text-2xl sm:text-3xl lg:text-4xl font-bold text-text-primary">
          Shop Coloring Bundles
        </h2>
        <p className="mt-4 text-text-secondary font-rooney-sans max-w-lg mx-auto">
          Themed 10-page coloring sets with recurring characters. Print at home
          or color online instantly.
        </p>
      </div>

      {/* Bundle Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 lg:gap-6 max-w-5xl mx-auto">
        {bundles.map((bundle) => (
          <BundleCard key={bundle.id} bundle={bundle} locale={locale} />
        ))}
      </div>

      {/* View All Link */}
      <div className="text-center mt-8">
        <Link
          href={`/${locale}/products/digital`}
          className="inline-flex items-center gap-2 font-tondo font-bold text-crayon-orange hover:text-crayon-orange-dark transition-colors group"
        >
          View All Bundles
          <FontAwesomeIcon
            icon={faArrowRight}
            size="sm"
            className="transition-transform group-hover:translate-x-0.5"
          />
        </Link>
      </div>
    </section>
  );
};

type BundleCardProps = {
  bundle: PublicBundle;
  locale: string;
};

const BundleCard = ({ bundle, locale }: BundleCardProps) => {
  const imageUrl = bundle.listingHeroUrl || bundle.listingBrandCardUrl;

  return (
    <Link
      href={`/${locale}/products/digital/${bundle.slug}`}
      className="group block rounded-2xl overflow-hidden border-2 border-paper-cream-dark bg-white hover:border-crayon-orange/50 hover:shadow-card-hover hover:-translate-y-1 transition-all"
    >
      {/* Image */}
      {imageUrl && (
        <div className="aspect-square bg-paper-cream relative overflow-hidden">
          <Image
            src={imageUrl}
            alt={bundle.name}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="object-cover group-hover:scale-105 transition-transform duration-300"
            unoptimized
          />
        </div>
      )}

      {/* Content */}
      <div className="p-4">
        <h3 className="font-tondo font-bold text-lg text-text-primary group-hover:text-crayon-orange transition-colors line-clamp-1">
          {bundle.name}
        </h3>
        <p className="text-sm text-text-secondary font-rooney-sans mt-1 line-clamp-2">
          {bundle.tagline}
        </p>

        {/* Price and CTA Row */}
        <div className="flex items-center justify-between mt-4">
          <span className="font-tondo font-bold text-lg text-text-primary">
            {formatPrice(bundle.pricePence, bundle.currency)}
          </span>
          <span className="inline-flex items-center gap-1.5 text-sm font-tondo font-bold text-crayon-orange group-hover:text-crayon-orange-dark transition-colors">
            <FontAwesomeIcon icon={faShoppingBag} size="sm" />
            View Bundle
          </span>
        </div>
      </div>
    </Link>
  );
};

export default FeaturedBundles;

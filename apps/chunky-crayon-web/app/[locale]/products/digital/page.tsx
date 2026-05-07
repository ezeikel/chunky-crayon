import type { Metadata } from 'next';
import { Suspense } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import {
  listPublishedBundles,
  listingImagesForBundle,
} from '@/app/data/bundle';
import PageWrap from '@/components/PageWrap/PageWrap';
import Breadcrumbs from '@/components/Breadcrumbs';
import { checkFeatureFlag } from '@/flags';

type DigitalProductsIndexProps = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({
  params,
}: DigitalProductsIndexProps): Promise<Metadata> {
  const { locale } = await params;
  const baseUrl = 'https://chunkycrayon.com';
  const url = `${baseUrl}/${locale}/products/digital`;
  const title = 'Digital Coloring Bundles - Chunky Crayon';
  const description =
    'Themed coloring bundles for ages 3 to 8. Print at home, color online, replay forever. Each bundle is 10 pages with a recurring cast of characters.';

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url,
      siteName: 'Chunky Crayon',
      type: 'website',
    },
    twitter: { card: 'summary_large_image', title, description },
    alternates: { canonical: url },
  };
}

const DigitalProductsIndexPage = async ({
  params,
}: DigitalProductsIndexProps) => {
  const { locale } = await params;

  return (
    <PageWrap>
      <Breadcrumbs
        items={[
          { href: `/${locale}`, label: 'Home' },
          { href: `/${locale}/products`, label: 'Products' },
          { label: 'Digital Bundles' },
        ]}
      />
      <div className="container mx-auto px-4 py-8 lg:py-16">
        <header className="text-center mb-10 lg:mb-16">
          <h1 className="font-heading text-4xl lg:text-6xl text-crayon-orange-dark">
            Coloring Bundles
          </h1>
          <p className="mt-4 max-w-2xl mx-auto text-lg text-brown-700">
            Themed 10-page sets with a recurring cast. Print at home, color
            online, replay forever.
          </p>
        </header>

        <Suspense fallback={null}>
          <DigitalProductsGrid locale={locale} />
        </Suspense>
      </div>
    </PageWrap>
  );
};

// Dynamic island for Cache Components — flag check + DB read live here so
// the page shell can prerender. notFound() inside a Suspense child still
// short-circuits the whole route to /not-found, so the gate works.
const DigitalProductsGrid = async ({ locale }: { locale: string }) => {
  const enabled = await checkFeatureFlag('bundles-shop');
  if (!enabled) notFound();

  const bundles = await listPublishedBundles();

  if (bundles.length === 0) {
    return (
      <div className="text-center text-brown-500 py-16">
        New bundles coming soon.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
      {bundles.map((bundle) => {
        const hero = listingImagesForBundle(bundle)[0];
        return (
          <Link
            key={bundle.id}
            href={`/${locale}/products/digital/${bundle.slug}`}
            className="group flex flex-col gap-3 rounded-2xl border-2 border-brown-700/10 bg-cream p-4 hover:border-crayon-orange transition"
          >
            {hero ? (
              <div className="relative aspect-square w-full overflow-hidden rounded-xl">
                <Image
                  src={hero}
                  alt={bundle.name}
                  fill
                  sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                  className="object-cover"
                />
              </div>
            ) : null}
            <div className="flex items-baseline justify-between gap-2">
              <h2 className="font-heading text-xl text-crayon-orange-dark group-hover:underline">
                {bundle.name}
              </h2>
              <span className="font-heading text-xl text-brown-700">
                £{(bundle.pricePence / 100).toFixed(2)}
              </span>
            </div>
            <p className="text-sm text-brown-500 line-clamp-2">
              {bundle.tagline}
            </p>
          </Link>
        );
      })}
    </div>
  );
};

export default DigitalProductsIndexPage;

import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { connection } from 'next/server';
import { getPublishedBundle, listingImagesForBundle } from '@/app/data/bundle';
import PageWrap from '@/components/PageWrap/PageWrap';
import Breadcrumbs from '@/components/Breadcrumbs';
import { checkFeatureFlag } from '@/flags';
import BundleProductPageClient from './BundleProductPageClient';

type BundleProductPageProps = {
  params: Promise<{
    locale: string;
    slug: string;
  }>;
};

// Dynamic rendering. We deliberately don't `generateStaticParams` here
// because:
//   1. The page is flag-gated and 404s when `bundles-shop` is off, so
//      static prerender has nothing useful to cache anyway.
//   2. Next 16 + Cache Components rejects an empty `generateStaticParams`
//      result, and prod currently has zero published bundles (dev DB
//      has them, prod doesn't), so listPublishedBundles() → [] → build
//      fail. See ~/.claude/.../feedback_no_force_dynamic_in_next16.md.
//   3. Once bundles ship for real, swap to a hybrid: ISR with static
//      params for the small set of published bundles + the flag check
//      still gating render.

export async function generateMetadata({
  params,
}: BundleProductPageProps): Promise<Metadata> {
  const { locale, slug } = await params;
  const bundle = await getPublishedBundle(slug);

  if (!bundle) {
    return { title: 'Bundle Not Found - Chunky Crayon' };
  }

  const baseUrl = 'https://chunkycrayon.com';
  const url = `${baseUrl}/${locale}/products/digital/${bundle.slug}`;
  const title = `${bundle.name} | ${bundle.pageCount}-Page Coloring Bundle - Chunky Crayon`;
  const description = `${bundle.tagline} Print at home, color online, replay forever. £${(bundle.pricePence / 100).toFixed(2)}.`;
  const ogImage = bundle.listingHeroUrl ?? undefined;

  return {
    title,
    description,
    openGraph: {
      title: `${bundle.name} - Chunky Crayon`,
      description,
      url,
      siteName: 'Chunky Crayon',
      type: 'website',
      ...(ogImage && { images: [{ url: ogImage }] }),
    },
    twitter: {
      card: 'summary_large_image',
      title: `${bundle.name} - Chunky Crayon`,
      description,
      ...(ogImage && { images: [ogImage] }),
    },
    alternates: { canonical: url },
  };
}

const BundleProductPage = async ({ params }: BundleProductPageProps) => {
  // Opt into dynamic rendering. Without this, Cache Components treats
  // the page as statically renderable and complains about the missing
  // generateStaticParams. The flag check below would also force this
  // dynamic anyway, but explicit is clearer.
  await connection();

  const { locale, slug } = await params;

  const enabled = await checkFeatureFlag('bundles-shop');
  if (!enabled) notFound();

  const bundle = await getPublishedBundle(slug);

  if (!bundle) {
    notFound();
  }

  const images = listingImagesForBundle(bundle);

  return (
    <PageWrap>
      <Breadcrumbs
        items={[
          { href: `/${locale}`, label: 'Home' },
          { href: `/${locale}/products`, label: 'Products' },
          { href: `/${locale}/products/digital`, label: 'Digital Bundles' },
          { label: bundle.name },
        ]}
      />
      <BundleProductPageClient
        bundle={{
          slug: bundle.slug,
          name: bundle.name,
          tagline: bundle.tagline,
          pageCount: bundle.pageCount,
          pricePence: bundle.pricePence,
          currency: bundle.currency,
          images,
        }}
      />
    </PageWrap>
  );
};

export default BundleProductPage;

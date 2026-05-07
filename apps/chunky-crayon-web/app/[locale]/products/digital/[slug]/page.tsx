import type { Metadata } from 'next';
import { Suspense } from 'react';
import { notFound } from 'next/navigation';
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

// Cache Components static-first pattern:
//   - The page itself is the static shell. It awaits ONLY params (a
//     synchronous prop pass), nothing dynamic.
//   - All dynamic access (flag check, DB lookup) is inside <Suspense>
//     via the BundleContent island below. Without this split, Next 16
//     fails the build with "Uncached data was accessed outside of
//     <Suspense>" because the providers tree at the layout level can't
//     stream and dynamic-at-page-top blocks the shell.
//
// We deliberately don't generateStaticParams — see
// ~/.claude/.../feedback_empty_generate_static_params_breaks_cache_components.md.

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

// Synchronous page handler — only renders the static shell. Awaiting
// `params` here would itself count as a dynamic access and bust the
// Cache Components prerender. The dynamic island unwraps params instead.
const BundleProductPage = ({ params }: BundleProductPageProps) => {
  return (
    <PageWrap>
      <Suspense fallback={null}>
        <BundleContent params={params} />
      </Suspense>
    </PageWrap>
  );
};

// Dynamic island — does the flag check + DB lookup + 404 routing. Must
// be inside the page's <Suspense> boundary so Cache Components can
// prerender the shell and stream this in.
const BundleContent = async ({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) => {
  const { locale, slug } = await params;
  const enabled = await checkFeatureFlag('bundles-shop');
  if (!enabled) notFound();

  const bundle = await getPublishedBundle(slug);
  if (!bundle) {
    notFound();
  }

  const images = listingImagesForBundle(bundle);

  return (
    <>
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
    </>
  );
};

export default BundleProductPage;

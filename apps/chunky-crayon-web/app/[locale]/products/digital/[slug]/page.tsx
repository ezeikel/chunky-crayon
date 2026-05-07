import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import {
  getPublishedBundle,
  listingImagesForBundle,
  listPublishedBundles,
} from '@/app/data/bundle';
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

// Static generation — bundles are a small, slow-changing set. Same
// fail-soft behaviour as coloring-image pages: a build-time DB blip
// shouldn't fail the deploy. Returning [] falls back to ISR.
export const generateStaticParams = async () => {
  try {
    const bundles = await listPublishedBundles();
    return bundles.map((b) => ({ slug: b.slug }));
  } catch (err) {
    console.error(
      '[bundles] generateStaticParams failed — falling back to ISR-only:',
      err,
    );
    return [];
  }
};

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

import type { Metadata } from 'next';
import { Suspense } from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faBookOpen,
  faStar,
  faLockKeyhole,
} from '@fortawesome/pro-duotone-svg-icons';
import PageWrap from '@/components/PageWrap/PageWrap';
import Breadcrumbs from '@/components/Breadcrumbs';
import { checkFeatureFlag } from '@/flags';

type ProductsIndexProps = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({
  params,
}: ProductsIndexProps): Promise<Metadata> {
  const { locale } = await params;
  const baseUrl = 'https://chunkycrayon.com';
  const url = `${baseUrl}/${locale}/products`;
  const title = 'Products - Chunky Crayon';
  const description =
    'Themed coloring bundles, sticker packs, and printable activity sets for ages 3 to 8. Print at home, color online, replay forever.';

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

// Category cards. Live ones link out; "coming soon" ones are visual
// scaffolding that earn their place by signalling we have a roadmap
// without committing to dates we can't yet keep.
const CATEGORIES = [
  {
    slug: 'digital',
    label: 'Digital Bundles',
    description:
      '10-page coloring sets with a recurring cast. Print at home, color online.',
    icon: faBookOpen,
    accent: 'crayon-orange',
    live: true,
  },
  {
    slug: 'stickers',
    label: 'Sticker Packs',
    description:
      'Printable sticker sheets that match your favorite bundle characters.',
    icon: faStar,
    accent: 'crayon-pink',
    live: false,
  },
] as const;

const ProductsIndexPage = async ({ params }: ProductsIndexProps) => {
  const { locale } = await params;

  return (
    <PageWrap>
      <Breadcrumbs
        items={[{ href: `/${locale}`, label: 'Home' }, { label: 'Products' }]}
      />
      <Suspense fallback={null}>
        <ProductsContent locale={locale} />
      </Suspense>
    </PageWrap>
  );
};

// Dynamic island for Cache Components — flag check + page body live here
// so the shell can prerender. notFound() short-circuits the route when
// the flag is off.
const ProductsContent = async ({ locale }: { locale: string }) => {
  const enabled = await checkFeatureFlag('bundles-shop');
  if (!enabled) notFound();

  return (
    <div className="container mx-auto px-4 py-8 lg:py-16">
      <header className="text-center mb-10 lg:mb-16">
        <h1 className="font-heading text-4xl lg:text-6xl text-crayon-orange-dark">
          Products
        </h1>
        <p className="mt-4 max-w-2xl mx-auto text-lg text-brown-700">
          Themed coloring sets and activity packs for ages 3 to 8. Print at
          home, color online, replay forever.
        </p>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-3xl mx-auto">
        {CATEGORIES.map((cat) => {
          const inner = (
            <div
              className={`flex flex-col gap-3 rounded-2xl border-2 p-6 bg-cream transition ${
                cat.live
                  ? 'border-brown-700/10 hover:border-crayon-orange cursor-pointer'
                  : 'border-brown-700/10 opacity-70'
              }`}
            >
              <div className="flex items-center gap-3">
                <FontAwesomeIcon
                  icon={cat.icon}
                  className={`text-3xl text-${cat.accent}-dark`}
                />
                <h2 className="font-heading text-2xl text-crayon-orange-dark">
                  {cat.label}
                </h2>
                {!cat.live ? (
                  <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-brown-700/10 px-2 py-0.5 text-xs font-bold uppercase tracking-wide text-brown-700">
                    <FontAwesomeIcon
                      icon={faLockKeyhole}
                      className="text-[10px]"
                    />
                    Coming soon
                  </span>
                ) : null}
              </div>
              <p className="text-brown-500">{cat.description}</p>
            </div>
          );
          return cat.live ? (
            <Link
              key={cat.slug}
              href={`/${locale}/products/${cat.slug}`}
              className="block"
            >
              {inner}
            </Link>
          ) : (
            <div key={cat.slug}>{inner}</div>
          );
        })}
      </div>
    </div>
  );
};

export default ProductsIndexPage;

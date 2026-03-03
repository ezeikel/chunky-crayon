import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import {
  getColoringImageById,
  getAllColoringImagesStatic,
} from '@/app/data/coloring-image';
import { getRelatedImages } from '@/app/data/gallery';
import { auth } from '@/auth';
import ColoringPageContent from '@/components/ColoringPageContent/ColoringPageContent';
import PageWrap from '@/components/PageWrap/PageWrap';
import Breadcrumbs from '@/components/Breadcrumbs';

type ColoringImagePageProps = {
  params: Promise<{
    locale: string;
    id: string;
  }>;
};

// Static generation - all coloring image pages are pre-rendered at build time
// Uses WebSocket connections to Neon (not HTTP fetch) which works with prerender
export const generateStaticParams = async () => {
  const images = await getAllColoringImagesStatic();

  return images.map((image) => ({
    id: image.id,
  }));
};

export async function generateMetadata({
  params,
}: ColoringImagePageProps): Promise<Metadata> {
  const { locale, id } = await params;
  const coloringImage = await getColoringImageById(id);

  if (!coloringImage) {
    return {
      title: 'Coloring Page Not Found - Chunky Crayon',
    };
  }

  const title = `${coloringImage.title || 'Coloring Page'} - Free Printable | Chunky Crayon`;
  const description =
    coloringImage.description ||
    'Free printable coloring page from Chunky Crayon. Color online or download and print!';

  const baseUrl = 'https://chunkycrayon.com';
  const pagePath = `/coloring-image/${id}`;

  return {
    title,
    description,
    keywords:
      coloringImage.tags?.join(', ') || 'coloring page, printable, kids',
    openGraph: {
      title: `${coloringImage.title || 'Coloring Page'} - Chunky Crayon`,
      description,
      url: `${baseUrl}/${locale}${pagePath}`,
      siteName: 'Chunky Crayon',
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: `${coloringImage.title || 'Coloring Page'} - Chunky Crayon`,
      description,
    },
    alternates: {
      canonical: `${baseUrl}/${locale}${pagePath}`,
      languages: {
        en: `${baseUrl}/en${pagePath}`,
        ja: `${baseUrl}/ja${pagePath}`,
        ko: `${baseUrl}/ko${pagePath}`,
        de: `${baseUrl}/de${pagePath}`,
        fr: `${baseUrl}/fr${pagePath}`,
        es: `${baseUrl}/es${pagePath}`,
        'x-default': `${baseUrl}/en${pagePath}`,
      },
    },
  };
}

const ColoringImagePage = async ({ params }: ColoringImagePageProps) => {
  const { id } = await params;
  const [coloringImage, session, tNav, tColoring] = await Promise.all([
    getColoringImageById(id),
    auth(),
    getTranslations('navigation'),
    getTranslations('coloringPage'),
  ]);

  if (!coloringImage) {
    notFound();
  }

  const isAuthenticated = !!session?.user?.id;
  const relatedImages = await getRelatedImages(id, coloringImage.tags || [], 6);

  // JSON-LD ImageObject schema for SEO
  const imageSchema = {
    '@context': 'https://schema.org',
    '@type': 'ImageObject',
    '@id': `https://chunkycrayon.com/coloring-image/${id}`,
    name: coloringImage.title || 'Coloring Page',
    description:
      coloringImage.description ||
      'Free printable coloring page from Chunky Crayon',
    contentUrl: coloringImage.svgUrl || coloringImage.url,
    thumbnailUrl: coloringImage.svgUrl || coloringImage.url,
    url: `https://chunkycrayon.com/coloring-image/${id}`,
    isPartOf: {
      '@id': 'https://chunkycrayon.com/#website',
    },
    creator: {
      '@id': 'https://chunkycrayon.com/#organization',
    },
    copyrightHolder: {
      '@id': 'https://chunkycrayon.com/#organization',
    },
    license: 'https://chunkycrayon.com/terms',
    acquireLicensePage: 'https://chunkycrayon.com/pricing',
    keywords:
      coloringImage.tags?.join(', ') || 'coloring page, printable, kids',
  };

  return (
    <PageWrap className="flex flex-col gap-y-6">
      {/* ImageObject Schema */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(imageSchema) }}
      />

      {/* Breadcrumbs */}
      <Breadcrumbs
        items={[
          { label: tNav('home'), href: '/' },
          { label: tNav('gallery'), href: '/gallery' },
          { label: coloringImage.title || tColoring('title') },
        ]}
      />

      {/* Coloring Page Content - includes title with progress/mute on desktop */}
      <ColoringPageContent
        coloringImage={coloringImage}
        isAuthenticated={isAuthenticated}
        title={coloringImage.title || tColoring('title')}
      />

      {/* Related Coloring Pages */}
      {relatedImages.length > 0 && (
        <section className="mt-8 pt-8 border-t border-paper-cream-dark">
          <h2 className="font-tondo font-semibold text-xl text-text-primary mb-4">
            {tColoring('relatedPages')}
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
            {relatedImages.map((related) => (
              <Link
                key={related.id}
                href={`/coloring-image/${related.id}`}
                className="relative aspect-square rounded-xl overflow-hidden bg-white border-2 border-paper-cream-dark hover:border-crayon-orange/50 transition-all group"
              >
                {related.svgUrl && (
                  <Image
                    src={related.svgUrl}
                    alt={related.title || tColoring('title')}
                    fill
                    className="object-contain p-2 group-hover:scale-105 transition-transform duration-300"
                  />
                )}
              </Link>
            ))}
          </div>
        </section>
      )}
    </PageWrap>
  );
};

export default ColoringImagePage;

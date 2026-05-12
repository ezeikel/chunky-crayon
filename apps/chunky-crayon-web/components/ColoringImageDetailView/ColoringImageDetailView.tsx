import Link from 'next/link';
import Image from 'next/image';
import { getTranslations } from 'next-intl/server';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faMap } from '@fortawesome/pro-duotone-svg-icons';
import { getRelatedImages } from '@/app/data/gallery';
import { auth } from '@/auth';
import { ADMIN_EMAILS } from '@/constants';
import ColoringPageContent from '@/components/ColoringPageContent/ColoringPageContent';
import PageWrap from '@/components/PageWrap/PageWrap';
import Breadcrumbs from '@/components/Breadcrumbs';
import { getColoringImageUrl } from '@/lib/seo/coloring-image-url';
import type { ColoringImage } from '@one-colored-pixel/db';

// Shared READY-path render for both /coloring-image/[id] and the public
// /coloring-pages/[slug] routes. Whichever route resolves the image first
// calls into here — guarantees a single canonical detail UI.
//
// The caller is responsible for upstream concerns (status branching for
// the GENERATING streaming view, slug-mismatch redirects). This component
// only renders the finished detail page for a READY image.
type Props = {
  coloringImage: Partial<ColoringImage>;
  locale: string;
};

const ColoringImageDetailView = async ({ coloringImage, locale }: Props) => {
  const { id } = coloringImage;
  if (!id) {
    throw new Error('[ColoringImageDetailView] coloringImage.id is required');
  }

  const [session, tNav, tColoring] = await Promise.all([
    auth(),
    getTranslations('navigation'),
    getTranslations('coloringPage'),
  ]);

  const isAuthenticated = !!session?.user?.id;
  const isAdmin =
    !!session?.user?.email && ADMIN_EMAILS.includes(session.user.email);
  const showRegionDebugLink = process.env.NODE_ENV === 'development' || isAdmin;
  const relatedImages = await getRelatedImages(id, coloringImage.tags || [], 6);

  // Canonical URL for JSON-LD — public images get the slugged URL, private
  // user images stay on the CUID URL.
  const canonicalPath = getColoringImageUrl(
    {
      id,
      slugBase: coloringImage.slugBase ?? null,
      userId: coloringImage.userId ?? null,
      showInCommunity: coloringImage.showInCommunity ?? false,
      status: coloringImage.status ?? 'READY',
    },
    locale,
  );
  const canonicalUrl = `https://chunkycrayon.com${canonicalPath}`;

  const imageSchema = {
    '@context': 'https://schema.org',
    '@type': 'ImageObject',
    '@id': canonicalUrl,
    name: coloringImage.title || 'Coloring Page',
    description:
      coloringImage.description ||
      'Free printable coloring page from Chunky Crayon',
    contentUrl: coloringImage.svgUrl || coloringImage.url,
    thumbnailUrl: coloringImage.svgUrl || coloringImage.url,
    url: canonicalUrl,
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
    <PageWrap className="flex flex-col gap-y-6 lg:px-6">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(imageSchema) }}
      />

      <Breadcrumbs
        items={[
          { label: tNav('home'), href: '/' },
          { label: tNav('gallery'), href: '/gallery' },
          { label: coloringImage.title || tColoring('title') },
        ]}
      />

      <ColoringPageContent
        coloringImage={coloringImage}
        isAuthenticated={isAuthenticated}
        title={coloringImage.title || tColoring('title')}
      />

      {showRegionDebugLink && (
        <div className="flex justify-end">
          <Link
            href={`/dev/region-store/${id}`}
            className="inline-flex items-center gap-x-2 rounded-full border-2 border-paper-cream-dark bg-white px-3 py-1.5 text-xs font-medium text-text-primary/70 hover:border-crayon-orange/50 hover:text-crayon-orange transition-colors"
          >
            <FontAwesomeIcon icon={faMap} className="text-text-tertiary" />
            View region store
          </Link>
        </div>
      )}

      {relatedImages.length > 0 && (
        <section className="mt-8 pt-8 border-t border-paper-cream-dark">
          <h2 className="font-tondo font-semibold text-xl text-text-primary mb-4">
            {tColoring('relatedPages')}
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
            {relatedImages.map((related) => (
              <Link
                key={related.id}
                href={getColoringImageUrl(related, locale)}
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

export default ColoringImageDetailView;

import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import {
  getColoringImageById,
  getAllColoringImagesStatic,
  getColoringImageStatus,
} from '@/app/data/coloring-image';
import { getRelatedImages } from '@/app/data/gallery';
import { auth } from '@/auth';
import { ADMIN_EMAILS } from '@/constants';
import ColoringPageContent from '@/components/ColoringPageContent/ColoringPageContent';
import PageWrap from '@/components/PageWrap/PageWrap';
import Breadcrumbs from '@/components/Breadcrumbs';
import StreamingCanvasView from '@/components/StreamingCanvasView/StreamingCanvasView';

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

  // Status check first (uncached) — branches the page between the
  // canvas-as-loader streaming view and the normal render. We can't fold
  // status into `getColoringImageById` because that's `'use cache'` with
  // cacheLife max; a GENERATING snapshot would stick for a week even
  // after the row hits READY.
  const statusRow = await getColoringImageStatus(id);
  if (!statusRow) {
    notFound();
  }

  if (statusRow.status !== 'READY') {
    const [tNav, tColoring] = await Promise.all([
      getTranslations('navigation'),
      getTranslations('coloringPage'),
    ]);
    // <StreamingCanvasView> renders the same 3-column shell
    // <ColoringPageContent> does (palette + canvas + tools), with the
    // real canvas swapped for a placeholder card holding the blurred
    // partial image + Colo overlay. When the row hits READY, EventSource
    // fires `router.refresh()` and this branch falls through to the
    // cached canvas render — no navigation, just a server re-render.
    return (
      <PageWrap className="flex flex-col gap-y-6 lg:px-6">
        <Breadcrumbs
          items={[
            { label: tNav('home'), href: '/' },
            { label: tNav('gallery'), href: '/gallery' },
            { label: tColoring('title') },
          ]}
        />
        <StreamingCanvasView
          coloringImageId={id}
          initialStatus={statusRow.status}
          initialPartialUrl={statusRow.streamingPartialUrl}
          initialProgress={statusRow.streamingProgress}
          initialFailureReason={statusRow.failureReason}
          // Prefer the kid's actual prompt so Colo's voiceover script
          // talks about THE thing they asked for ("a dinosaur breathing
          // fire!") instead of the generic page title. Photo mode has
          // no sourcePrompt — in that case the i18n title is the best
          // we can do without a vision pass on the photo (could add
          // one later, but it'd add ~2s latency before voiceover plays).
          fallbackTitle={statusRow.sourcePrompt || tColoring('title')}
        />
      </PageWrap>
    );
  }

  // READY path — original render below. Cached.
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
  const isAdmin =
    !!session?.user?.email && ADMIN_EMAILS.includes(session.user.email);
  const showRegionDebugLink = process.env.NODE_ENV === 'development' || isAdmin;
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
    <PageWrap className="flex flex-col gap-y-6 lg:px-6">
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

      {/* Admin/dev: inspect region store for this image */}
      {showRegionDebugLink && (
        <div className="flex justify-end">
          <Link
            href={`/dev/region-store/${id}`}
            className="inline-flex items-center gap-x-2 rounded-full border-2 border-paper-cream-dark bg-white px-3 py-1.5 text-xs font-medium text-text-primary/70 hover:border-crayon-orange/50 hover:text-crayon-orange transition-colors"
          >
            🗺️ View region store
          </Link>
        </div>
      )}

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

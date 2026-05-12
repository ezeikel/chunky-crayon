import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { connection } from 'next/server';
import { getTranslations } from 'next-intl/server';
import {
  getColoringImageById,
  getColoringImageStatus,
} from '@/app/data/coloring-image';
import PageWrap from '@/components/PageWrap/PageWrap';
import Breadcrumbs from '@/components/Breadcrumbs';
import StreamingCanvasView from '@/components/StreamingCanvasView/StreamingCanvasView';
import ColoringImageDetailView from '@/components/ColoringImageDetailView/ColoringImageDetailView';
import {
  getColoringImageUrl,
  isPubliclyIndexable,
} from '@/lib/seo/coloring-image-url';

type ColoringImagePageProps = {
  params: Promise<{
    locale: string;
    id: string;
  }>;
};

// generateStaticParams intentionally omitted — see below.
//
// Public images now live at /coloring-pages/[slug] (their slugged URL); this
// route 301-redirects to that canonical. Prerendering all public images at the
// CUID URL would cache the rendered detail view instead of the redirect,
// which is exactly what we want NOT to happen. Private user images are
// per-user and can't be prerendered either. So this route is always served
// dynamically — first hit pays a small SSR latency for the redirect lookup,
// every subsequent hit hits the cached helper.

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

  // Canonical URL — public images get the slugged URL, private user images
  // stay on the CUID URL. Routing the canonical here matches the 301 we
  // serve from the page handler.
  const baseUrl = 'https://chunkycrayon.com';
  const pagePath = getColoringImageUrl(
    {
      id,
      slugBase: coloringImage.slugBase ?? null,
      userId: coloringImage.userId ?? null,
      showInCommunity: coloringImage.showInCommunity ?? false,
      status: coloringImage.status ?? 'READY',
    },
    locale,
  );

  return {
    title,
    description,
    keywords:
      coloringImage.tags?.join(', ') || 'coloring page, printable, kids',
    openGraph: {
      title: `${coloringImage.title || 'Coloring Page'} - Chunky Crayon`,
      description,
      url: `${baseUrl}${pagePath}`,
      siteName: 'Chunky Crayon',
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: `${coloringImage.title || 'Coloring Page'} - Chunky Crayon`,
      description,
    },
    alternates: {
      canonical: `${baseUrl}${pagePath}`,
      languages: {
        en: `${baseUrl}${pagePath.replace(/^\/[a-z]{2}/, '/en')}`,
        ja: `${baseUrl}${pagePath.replace(/^\/[a-z]{2}/, '/ja')}`,
        ko: `${baseUrl}${pagePath.replace(/^\/[a-z]{2}/, '/ko')}`,
        de: `${baseUrl}${pagePath.replace(/^\/[a-z]{2}/, '/de')}`,
        fr: `${baseUrl}${pagePath.replace(/^\/[a-z]{2}/, '/fr')}`,
        es: `${baseUrl}${pagePath.replace(/^\/[a-z]{2}/, '/es')}`,
        'x-default': `${baseUrl}${pagePath.replace(/^\/[a-z]{2}/, '/en')}`,
      },
    },
  };
}

const ColoringImagePage = async ({ params }: ColoringImagePageProps) => {
  // connection() forces the route fully dynamic. Without it, Next 16's PPR
  // would stream the layout shell as 200 OK before the redirect ran below,
  // which silently turns a 301 into a 200-with-content. The canonical link
  // in generateMetadata also covers the SEO consolidation regardless, so
  // a user landing here from an external link still sees the page but
  // Google reads it as a duplicate of /coloring-pages/[slug].
  await connection();
  const { id, locale } = await params;

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

  // READY path — fetch the full image, then either redirect (public) or
  // render the shared detail view (private).
  const coloringImage = await getColoringImageById(id);
  if (!coloringImage) {
    notFound();
  }

  // Public/indexable rows get a 301 to the slugged URL. The shared
  // ColoringImageDetailView is rendered by /coloring-pages/[slug] in that
  // case — single canonical URL per public image keeps Google from
  // splitting authority across two URLs for the same content.
  if (
    isPubliclyIndexable({
      id,
      slugBase: coloringImage.slugBase ?? null,
      userId: coloringImage.userId ?? null,
      showInCommunity: coloringImage.showInCommunity ?? false,
      status: 'READY',
    })
  ) {
    const slugged = getColoringImageUrl(
      {
        id,
        slugBase: coloringImage.slugBase ?? null,
        userId: coloringImage.userId ?? null,
        showInCommunity: coloringImage.showInCommunity ?? false,
        status: 'READY',
      },
      locale,
    );
    redirect(slugged);
  }

  return (
    <ColoringImageDetailView coloringImage={coloringImage} locale={locale} />
  );
};

export default ColoringImagePage;

import { connection } from 'next/server';
import { getTranslationsForLocale } from '@/i18n/messages';
import { OG_WIDTH, OG_HEIGHT } from '@/lib/og/constants';
import { renderHomepageOGImageResponse } from '@/lib/og/renders/homepage';

export const runtime = 'nodejs';

export const alt = 'Chunky Crayon, custom coloring pages made in seconds.';
export const size = {
  width: OG_WIDTH,
  height: OG_HEIGHT,
};
export const contentType = 'image/png';

type Props = {
  params: Promise<{ locale: string }>;
};

const Image = async ({ params }: Props) => {
  // `connection()` is the canonical Next 16 way (with cacheComponents
  // enabled) to opt a file-convention OG route out of build-time
  // prerender. Without this, Next ran the full DB query + 6 R2 image
  // fetches + Satori collage during "Collecting page data" for every
  // locale, hanging Vercel builds at 20m+. `og:image` in the page's
  // metadata points at the R2-pre-rendered PNG anyway, so this dynamic
  // route is only the fallback path when R2 is empty.
  await connection();

  const { locale } = await params;
  const t = (getTranslationsForLocale(locale) as any).og.homepage;
  return renderHomepageOGImageResponse(t.tagline);
};

export default Image;

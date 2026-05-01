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
  const { locale } = await params;
  const t = (getTranslationsForLocale(locale) as any).og.homepage;
  return renderHomepageOGImageResponse(t.tagline);
};

export default Image;

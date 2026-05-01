import { ImageResponse } from 'next/og';
import { getTranslationsForLocale } from '@/i18n/messages';
import { OG_WIDTH, OG_HEIGHT, colors } from '@/lib/og/constants';
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

// Build-time short-circuit. Next prerenders this route at build time to
// populate metadata; the full render does a DB query + 6 R2 image
// fetches + Satori collage = 15s. Multiplied across 6 locales that
// hangs Vercel builds (~20m+). The R2-pre-rendered PNG (set as
// `og:image` in layout.tsx) is the real asset external scrapers see;
// this convention route is only the fallback when R2 is empty.
const isBuild = process.env.NEXT_PHASE === 'phase-production-build';

const buildPlaceholder = () =>
  new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: colors.bgCream,
          fontSize: 48,
          color: colors.textPrimary,
        }}
      >
        Chunky Crayon
      </div>
    ),
    { width: OG_WIDTH, height: OG_HEIGHT },
  );

const Image = async ({ params }: Props) => {
  if (isBuild) return buildPlaceholder();
  const { locale } = await params;
  const t = (getTranslationsForLocale(locale) as any).og.homepage;
  return renderHomepageOGImageResponse(t.tagline);
};

export default Image;

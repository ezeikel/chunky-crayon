import { ImageResponse } from 'next/og';
import { OG_WIDTH, OG_HEIGHT, colors } from '@/lib/og/constants';
import { renderStartOGImageResponse } from '@/lib/og/renders/start';

export const runtime = 'nodejs';

export const alt = 'Custom coloring pages, made in 2 minutes. 2 free to try.';
export const size = {
  width: OG_WIDTH,
  height: OG_HEIGHT,
};
export const contentType = 'image/png';

// Build-time short-circuit. Next prerenders this route during `next build`
// to populate metadata; the full render does a DB query + 6 R2 image
// fetches + Satori collage = 15s. Multiplied across locales that hangs
// the build. At build time we serve a tiny placeholder (never seen by
// users — `og:image` points at the R2-pre-rendered PNG anyway). At
// request time (the dynamic-OG fallback path when R2 is empty) we run
// the real render.
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

const Image = async () =>
  isBuild ? buildPlaceholder() : renderStartOGImageResponse();

export default Image;

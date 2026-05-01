import { connection } from 'next/server';
import { OG_WIDTH, OG_HEIGHT } from '@/lib/og/constants';
import { renderStartOGImageResponse } from '@/lib/og/renders/start';

export const runtime = 'nodejs';

export const alt = 'Custom coloring pages, made in 2 minutes. 2 free to try.';
export const size = {
  width: OG_WIDTH,
  height: OG_HEIGHT,
};
export const contentType = 'image/png';

const Image = async () => {
  // See homepage opengraph-image.tsx for the rationale — `connection()`
  // opts this convention OG route out of build-time prerender so the
  // 15s Satori render doesn't run for every locale during `next build`.
  await connection();
  return renderStartOGImageResponse();
};

export default Image;

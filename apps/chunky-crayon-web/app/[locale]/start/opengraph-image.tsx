import { OG_WIDTH, OG_HEIGHT } from '@/lib/og/constants';
import { renderStartOGImageResponse } from '@/lib/og/renders/start';

export const runtime = 'nodejs';

export const alt = 'Custom coloring pages, made in 2 minutes. 2 free to try.';
export const size = {
  width: OG_WIDTH,
  height: OG_HEIGHT,
};
export const contentType = 'image/png';

const Image = async () => renderStartOGImageResponse();

export default Image;

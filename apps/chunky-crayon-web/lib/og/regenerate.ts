import { put } from '@one-colored-pixel/storage';
import { getTranslationsForLocale } from '@/i18n/messages';
import { renderStartOGImageResponse } from '@/lib/og/renders/start';
import { renderHomepageOGImageResponse } from '@/lib/og/renders/homepage';

const OG_PATHS = {
  homepage: 'og/homepage.png',
  start: 'og/start.png',
} as const;

export type OGRegenerateResult = Record<
  'homepage' | 'start',
  { url?: string; error?: string }
>;

const fetchPngBuffer = async (response: Response): Promise<Buffer> => {
  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
};

/**
 * Render homepage + /start OG images and upload them to R2.
 *
 * Shared between the daily cron route (`/api/cron/regenerate-og`) and the
 * admin "Regenerate OG now" server action. Both call this directly — the
 * action used to do an HTTP fetch into the cron route, but the round trip
 * exceeded the default 10s server-action timeout (the render takes ~17s)
 * and the action errored even though the cron itself succeeded.
 */
export const regenerateOGImages = async (): Promise<OGRegenerateResult> => {
  const results: OGRegenerateResult = {
    homepage: {},
    start: {},
  };

  try {
    const homepageT = (getTranslationsForLocale('en') as any).og.homepage;
    const homepageResponse = await renderHomepageOGImageResponse(
      homepageT.tagline,
    );
    const homepageBuffer = await fetchPngBuffer(homepageResponse);
    const { url } = await put(OG_PATHS.homepage, homepageBuffer, {
      contentType: 'image/png',
      allowOverwrite: true,
    });
    results.homepage = { url };
  } catch (err) {
    console.error('[regenerateOGImages] homepage failed:', err);
    results.homepage = {
      error: err instanceof Error ? err.message : 'unknown',
    };
  }

  try {
    const startResponse = await renderStartOGImageResponse();
    const startBuffer = await fetchPngBuffer(startResponse);
    const { url } = await put(OG_PATHS.start, startBuffer, {
      contentType: 'image/png',
      allowOverwrite: true,
    });
    results.start = { url };
  } catch (err) {
    console.error('[regenerateOGImages] start failed:', err);
    results.start = { error: err instanceof Error ? err.message : 'unknown' };
  }

  return results;
};

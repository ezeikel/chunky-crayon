'use server';

import { revalidateTag } from 'next/cache';
import { GenerationType } from '@one-colored-pixel/db';
import { requireAdmin } from '@/lib/auth-guards';
import { adPurposeKey } from '@/lib/coloring-image-purpose';
import { requestAllPipelineFromWorker } from '@/lib/worker';
import { generateColoringImageWithMetadata } from './coloring-image';

export type CreateAdImageState = {
  ok: boolean;
  imageId?: string;
  error?: string;
};

// Validate the campaign key shape: lowercase letters, digits, hyphens.
// Stored as `ad:${key}` in coloring_images.purposeKey — e.g. `ad:trex`.
// Drift would break getColoringImageForAdCampaign's lookup.
const CAMPAIGN_KEY_RE = /^[a-z0-9][a-z0-9-]*$/;

/**
 * Server action — admin-only. Creates a SYSTEM coloring image tagged
 * with `purposeKey = ad:${campaignKey}` so /start can serve it for the
 * matching utm_campaign. Goes through the same generation pipeline as
 * a user-initiated image (AI gen → SVG trace → metadata → R2 upload →
 * QR → worker pipeline for region-store / fill-points / colored-ref /
 * background-music) so ads land with all derived assets — no separate
 * backfill script needed.
 *
 * Returns shape is `useActionState`-compatible.
 */
export const createAdImage = async (
  _prevState: CreateAdImageState,
  formData: FormData,
): Promise<CreateAdImageState> => {
  await requireAdmin('notFound');

  const description = ((formData.get('description') as string) || '').trim();
  const campaignKey = ((formData.get('campaignKey') as string) || '')
    .trim()
    .toLowerCase();
  const locale = (formData.get('locale') as string) || 'en';

  if (!description) {
    return { ok: false, error: 'Description is required' };
  }
  if (!campaignKey || !CAMPAIGN_KEY_RE.test(campaignKey)) {
    return {
      ok: false,
      error:
        'Campaign key must be lowercase letters / numbers / hyphens (e.g. "trex", "summer-2026")',
    };
  }

  try {
    const result = await generateColoringImageWithMetadata(
      description,
      undefined, // No userId — admin context, no credit deduction.
      GenerationType.SYSTEM,
      locale,
      description,
      undefined,
      adPurposeKey(campaignKey),
    );

    if (!result?.id) {
      return { ok: false, error: 'Generation succeeded but returned no image' };
    }

    // Fire derived-asset pipeline (region-store, fill-points,
    // colored-reference, background-music). Mirrors the sync-await
    // pattern in createColoringImage — Vercel `after()` drops ~50% under
    // load, so we await the worker acks here to guarantee delivery.
    if (result.url && result.svgUrl) {
      await requestAllPipelineFromWorker(result.id);
    }

    // Bust the cached ad lookup so /start picks the new image up
    // immediately for this campaign (would otherwise wait out cacheLife).
    revalidateTag(`ad-coloring-image-${campaignKey}`, { expire: 0 });
    revalidateTag('ad-coloring-image', { expire: 0 });

    return { ok: true, imageId: result.id };
  } catch (err) {
    console.error('[admin/ads] createAdImage failed', err);
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'Unknown error',
    };
  }
};

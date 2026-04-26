'use server';

import { revalidatePath, revalidateTag } from 'next/cache';
import { db, GenerationType } from '@one-colored-pixel/db';
import { requireAdmin } from '@/lib/auth-guards';
import {
  adPurposeKey,
  AD_PURPOSE_PREFIX,
  getAdCampaignKey,
} from '@/lib/coloring-image-purpose';
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

export type AdActionState = { ok: boolean; error?: string };

// Helper: load + admin-gate + verify the row is actually an ad image.
// Returns the row's current campaignKey so callers can invalidate the
// right cache tags on update/delete.
const loadAdImage = async (
  id: string,
): Promise<{
  row: {
    id: string;
    purposeKey: string | null;
  };
  currentCampaignKey: string;
}> => {
  await requireAdmin('notFound');
  const row = await db.coloringImage.findUnique({
    where: { id },
    select: { id: true, purposeKey: true },
  });
  if (!row) throw new Error('Ad image not found');
  const currentCampaignKey = getAdCampaignKey(row);
  if (!currentCampaignKey) throw new Error('Image is not tagged as an ad');
  return { row, currentCampaignKey };
};

const bustAdCache = (campaignKeys: string[]) => {
  revalidateTag('ad-coloring-image', { expire: 0 });
  for (const key of campaignKeys) {
    revalidateTag(`ad-coloring-image-${key}`, { expire: 0 });
  }
  revalidatePath('/admin/ads');
  revalidatePath('/[locale]/start', 'page');
};

/**
 * Update an ad's campaign key (rename `ad:OLD` → `ad:NEW`). Used to
 * promote a draft (e.g. `ad:draft:trex` → `ad:trex`) or rotate an
 * existing campaign onto a new key. Both old + new tag caches are
 * busted so /start lookups stay consistent.
 */
export const updateAdImageCampaignKey = async (
  id: string,
  newCampaignKey: string,
): Promise<AdActionState> => {
  try {
    const { currentCampaignKey } = await loadAdImage(id);
    const trimmed = newCampaignKey.trim().toLowerCase();
    if (!trimmed || !CAMPAIGN_KEY_RE.test(trimmed)) {
      return {
        ok: false,
        error:
          'Campaign key must be lowercase letters / numbers / hyphens only',
      };
    }
    if (trimmed === currentCampaignKey) {
      return { ok: true };
    }

    // Make sure no other ad is already using this key — getColoringImage
    // ForAdCampaign uses findFirst so it'd silently pick one and break
    // the other. Fail loudly here instead.
    const conflict = await db.coloringImage.findFirst({
      where: { purposeKey: adPurposeKey(trimmed) },
      select: { id: true },
    });
    if (conflict && conflict.id !== id) {
      return {
        ok: false,
        error: `Campaign key "${trimmed}" is already in use`,
      };
    }

    await db.coloringImage.update({
      where: { id },
      data: { purposeKey: adPurposeKey(trimmed) },
    });
    bustAdCache([currentCampaignKey, trimmed]);
    return { ok: true };
  } catch (err) {
    console.error('[admin/ads] updateAdImageCampaignKey failed', err);
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'Unknown error',
    };
  }
};

/**
 * Hard-delete an ad image row. Does NOT clean up R2 assets — they're
 * effectively orphaned but still publicly accessible by direct URL.
 * Cheap to leave; if R2 storage costs become a concern, add a worker
 * cleanup pass that finds orphans by listing R2 and reconciling
 * against coloring_images.url/svgUrl/etc.
 */
export const deleteAdImage = async (id: string): Promise<AdActionState> => {
  try {
    const { currentCampaignKey } = await loadAdImage(id);
    await db.coloringImage.delete({ where: { id } });
    bustAdCache([currentCampaignKey]);
    return { ok: true };
  } catch (err) {
    console.error('[admin/ads] deleteAdImage failed', err);
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'Unknown error',
    };
  }
};

/**
 * Re-fire the worker pipeline for an existing ad. Useful after a model
 * upgrade (region store regen) or if a worker run failed silently and
 * left some assets NULL. Same 4 endpoints as the create path.
 */
export const regenerateAdAssets = async (
  id: string,
): Promise<AdActionState> => {
  try {
    await requireAdmin('notFound');
    const row = await db.coloringImage.findUnique({
      where: { id },
      select: { id: true, purposeKey: true },
    });
    if (!row || !row.purposeKey?.startsWith(AD_PURPOSE_PREFIX)) {
      return { ok: false, error: 'Not an ad image' };
    }
    await requestAllPipelineFromWorker(row.id);
    const campaignKey = getAdCampaignKey(row);
    if (campaignKey) bustAdCache([campaignKey]);
    return { ok: true };
  } catch (err) {
    console.error('[admin/ads] regenerateAdAssets failed', err);
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'Unknown error',
    };
  }
};

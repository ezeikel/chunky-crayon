'use server';

/**
 * Server-side counterpart to the browser's `trackResourceSaved`. Fires
 * the same Meta `Lead` + Pinterest `lead` events server-side via CAPI
 * so we still get the signal when the browser pixel is blocked
 * (iOS in-app browsers, ad blockers, content blockers).
 *
 * The browser fire passes `eventId`; this action receives the same id
 * and Meta/Pinterest deduplicate the matched pair. Fire-and-forget
 * from the calling component — never block UI on CAPI.
 *
 * Why this exists: the strongest paid-ad lead signal is "user kept
 * the output" (downloaded a PDF, printed it, saved an in-app
 * coloring) — not "user clicked a button" or "user submitted a form."
 * Mapping all three internal actions to one Meta/Pinterest standard
 * event gives the ad platforms enough volume to optimize against
 * without splitting it across separate events.
 */

import { db } from '@one-colored-pixel/db';
import { ACTIONS } from '@/constants';
import { getUserId } from '@/app/actions/user';
import {
  readClientMatchData,
  sendLeadConversionEvents,
} from '@/lib/conversion-api';

type ResourceSavedMethod = 'download' | 'print' | 'save';

type ResourceSavedSurface =
  | 'start_hero'
  | 'coloring_page'
  | 'tool'
  | 'app_canvas'
  | 'gallery'
  | 'other';

export const recordResourceSaved = async (params: {
  method: ResourceSavedMethod;
  surface: ResourceSavedSurface;
  contentName?: string;
  // Same eventId the browser fired with, so Meta/Pinterest dedup.
  eventId: string;
}): Promise<{ ok: boolean }> => {
  try {
    const userId = await getUserId(ACTIONS.RECORD_RESOURCE_SAVED);
    const match = await readClientMatchData();

    let email: string | undefined;
    let firstName: string | undefined;
    let lastName: string | undefined;
    if (userId) {
      const user = await db.user.findUnique({
        where: { id: userId },
        select: { email: true, name: true },
      });
      email = user?.email ?? undefined;
      const parts = user?.name?.trim().split(/\s+/) ?? [];
      firstName = parts[0] || undefined;
      lastName = parts.slice(1).join(' ') || undefined;
    }

    await sendLeadConversionEvents({
      email,
      userId: userId ?? undefined,
      firstName,
      lastName,
      eventId: params.eventId,
      contentName: params.contentName ?? 'Coloring Page',
      contentCategory: 'resource_saved',
      ...match,
    });

    return { ok: true };
  } catch (err) {
    console.error('[recordResourceSaved] CAPI failed:', err);
    return { ok: false };
  }
};

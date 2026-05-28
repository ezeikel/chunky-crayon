/**
 * Scene Builder mode-gating service (userId-explicit).
 *
 * The web server actions in `app/actions/scene.ts` resolve the user from
 * the cookie session; the mobile HTTP routes resolve it from the JWT
 * (`x-user-id` header). Both paths need the same DB logic, so it lives
 * here as plain functions that take an explicit `userId`. The actions and
 * the routes are thin wrappers — one source of truth (per CLAUDE.md).
 *
 * See `app/actions/scene.ts` for the why behind per-profile gating and the
 * unlock/lock asymmetry.
 */

import { db } from '@one-colored-pixel/db';
import {
  GATEABLE_MODES,
  isGateableMode,
  type GateableMode,
} from '@/lib/scene/modes';

/**
 * Unlocked modes for a user's active profile. Returns `[]` for
 * no-profile / any error — the safe default is "Scene Builder only".
 */
export const getUnlockedModesForUser = async (
  userId: string,
): Promise<GateableMode[]> => {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { activeProfileId: true },
  });

  const profileId =
    user?.activeProfileId ??
    (
      await db.profile.findFirst({
        where: { userId, isDefault: true },
        select: { id: true },
      })
    )?.id;

  if (!profileId) return [];

  const row = await db.profile.findFirst({
    where: { id: profileId, userId },
    select: { unlockedModes: true },
  });

  return (row?.unlockedModes ?? []).filter(isGateableMode);
};

export type SetModeUnlockedResult =
  | { ok: true; unlockedModes: GateableMode[] }
  | { ok: false; error: 'no_profile' | 'invalid_mode' };

/**
 * Toggle one gateable mode on/off for a user's active profile.
 *
 * The parent-gate proof is the CALLER's responsibility — the web action
 * verifies an HMAC token, the mobile route relies on the authenticated
 * session plus the client-side gate (friction, not an auth boundary).
 * This function only does the DB write, scoped to `userId` so a stale
 * profile id can't clobber another user's row.
 */
export const setModeUnlockedForUser = async (args: {
  userId: string;
  mode: GateableMode;
  unlocked: boolean;
}): Promise<SetModeUnlockedResult> => {
  if (!isGateableMode(args.mode)) {
    return { ok: false, error: 'invalid_mode' };
  }

  const user = await db.user.findUnique({
    where: { id: args.userId },
    select: { activeProfileId: true },
  });

  const profileId =
    user?.activeProfileId ??
    (
      await db.profile.findFirst({
        where: { userId: args.userId, isDefault: true },
        select: { id: true },
      })
    )?.id;

  if (!profileId) return { ok: false, error: 'no_profile' };

  // Re-read inside the mutation so concurrent toggles compose instead of
  // clobbering.
  const row = await db.profile.findFirst({
    where: { id: profileId, userId: args.userId },
    select: { unlockedModes: true },
  });
  if (!row) return { ok: false, error: 'no_profile' };

  const current = new Set(row.unlockedModes.filter(isGateableMode));
  if (args.unlocked) {
    current.add(args.mode);
  } else {
    current.delete(args.mode);
  }
  // Stable order so the column reads predictably.
  const next = GATEABLE_MODES.filter((m) => current.has(m));

  await db.profile.update({
    where: { id: profileId },
    data: { unlockedModes: next },
  });

  return { ok: true, unlockedModes: next };
};

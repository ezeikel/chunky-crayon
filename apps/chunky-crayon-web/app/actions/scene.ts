'use server';

/**
 * Scene Builder mode-gating actions.
 *
 * Scene Builder is the privacy-first DEFAULT create mode and is always
 * available. The free-text / mic / camera modes are locked per child
 * profile until a parent unlocks them behind the parent gate.
 *
 * Why per-profile (not per-user): a parent may trust an 8yo with voice
 * but not a 4yo. `Profile.unlockedModes` is the source of truth — an
 * empty array means "Scene Builder only". Mirrors how difficulty and Colo
 * accessories already live on Profile.
 *
 * Asymmetry by design: UNLOCKING a mode (granting a child free-text / mic
 * / camera) requires a valid `modes:unlock` parent-gate token. LOCKING a
 * mode again does not — removing access is always safe and a parent
 * shouldn't have to solve a sum to take a privilege away.
 *
 * Source-of-truth pattern (per CLAUDE.md): all logic lives here; the
 * settings UI and the create form call this action directly, a mobile
 * HTTP wrapper can wrap it later.
 */

import { revalidatePath } from 'next/cache';
import { db } from '@one-colored-pixel/db';
import { getUserId } from '@/app/actions/user';
import { getActiveProfile } from '@/app/actions/profiles';
import { verifyParentGateToken } from '@/app/actions/parent-gate';
import { ACTIONS } from '@/constants';

/**
 * The gateable input modes. Scene Builder ('scene') is intentionally NOT
 * in this set — it is always on and can never be locked.
 */
export const GATEABLE_MODES = ['text', 'voice', 'image'] as const;
export type GateableMode = (typeof GATEABLE_MODES)[number];

const isGateableMode = (v: unknown): v is GateableMode =>
  typeof v === 'string' && (GATEABLE_MODES as readonly string[]).includes(v);

/**
 * Unlocked modes for the current user's active profile.
 *
 * Returns `[]` for guests, no-profile, or any error — the safe default is
 * "Scene Builder only", never accidentally exposing a locked input mode.
 * The DB column is `String[]`; we narrow + filter to the known set so a
 * stray value can't widen access.
 */
export const getUnlockedModes = async (): Promise<GateableMode[]> => {
  const userId = await getUserId(ACTIONS.GET_ACTIVE_PROFILE);
  if (!userId) return [];

  const profile = await getActiveProfile();
  if (!profile) return [];

  const row = await db.profile.findFirst({
    where: { id: profile.id, userId },
    select: { unlockedModes: true },
  });

  return (row?.unlockedModes ?? []).filter(isGateableMode);
};

export type SetModeUnlockedResult =
  | { ok: true; unlockedModes: GateableMode[] }
  | {
      ok: false;
      error:
        | 'unauthorized'
        | 'no_profile'
        | 'invalid_mode'
        | 'parent_gate_required';
    };

/**
 * Toggle one gateable mode on/off for the current user's active profile.
 *
 * Unlocking (`unlocked: true`) requires a valid `modes:unlock` parent-gate
 * token — minted client-side after the parent passes the subtraction
 * check. Locking needs no token.
 */
export const setModeUnlocked = async (args: {
  mode: GateableMode;
  unlocked: boolean;
  /** Required only when `unlocked` is true. */
  parentGateToken?: string;
}): Promise<SetModeUnlockedResult> => {
  const userId = await getUserId(ACTIONS.UPDATE_PROFILE);
  if (!userId) return { ok: false, error: 'unauthorized' };

  if (!isGateableMode(args.mode)) {
    return { ok: false, error: 'invalid_mode' };
  }

  const profile = await getActiveProfile();
  if (!profile) return { ok: false, error: 'no_profile' };

  // Unlocking is privileged — verify the scoped parent gate before
  // widening a child's access. Locking is always allowed.
  if (args.unlocked) {
    const passed =
      typeof args.parentGateToken === 'string' &&
      (await verifyParentGateToken(args.parentGateToken, 'modes:unlock'));
    if (!passed) {
      return { ok: false, error: 'parent_gate_required' };
    }
  }

  // Re-read inside the mutation so concurrent toggles compose instead of
  // clobbering. Profile is scoped to userId so a stale active-profile id
  // can't write someone else's row.
  const row = await db.profile.findFirst({
    where: { id: profile.id, userId },
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
    where: { id: profile.id },
    data: { unlockedModes: next },
  });

  // The create form's mode selector and the settings page both render
  // from this; revalidate the surfaces that show lock state.
  revalidatePath('/');
  revalidatePath('/account/settings');

  return { ok: true, unlockedModes: next };
};

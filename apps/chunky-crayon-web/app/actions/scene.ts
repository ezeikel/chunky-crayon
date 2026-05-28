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
import { getUserId } from '@/app/actions/user';
import { verifyParentGateToken } from '@/app/actions/parent-gate';
import { ACTIONS } from '@/constants';
import { isGateableMode, type GateableMode } from '@/lib/scene/modes';
import {
  getUnlockedModesForUser,
  setModeUnlockedForUser,
} from '@/lib/scene/unlock-service';

/**
 * Unlocked modes for the current user's active profile.
 *
 * Returns `[]` for guests, no-profile, or any error — the safe default is
 * "Scene Builder only", never accidentally exposing a locked input mode.
 * Delegates the DB read to the userId-explicit service so web + mobile
 * share one implementation.
 */
export const getUnlockedModes = async (): Promise<GateableMode[]> => {
  const userId = await getUserId(ACTIONS.GET_ACTIVE_PROFILE);
  if (!userId) return [];
  return getUnlockedModesForUser(userId);
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
 * check. Locking needs no token. The DB write delegates to the
 * userId-explicit service.
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

  const result = await setModeUnlockedForUser({
    userId,
    mode: args.mode,
    unlocked: args.unlocked,
  });
  if (!result.ok) return result;

  // The create form's mode selector and the settings page both render
  // from this; revalidate the surfaces that show lock state.
  revalidatePath('/');
  revalidatePath('/account/settings');

  return result;
};

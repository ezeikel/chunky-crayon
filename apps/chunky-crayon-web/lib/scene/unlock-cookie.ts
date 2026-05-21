/**
 * Guest mode-unlock storage.
 *
 * Signed-in users get persistent unlocks via `Profile.unlockedModes` in
 * the DB (see `app/actions/scene.ts`). Guests have no profile to write
 * against, so a cookie is the right home — survives reloads + closes,
 * survives across sessions for the same device, doesn't require any
 * server round-trip on the gate-pass path.
 *
 * One year expiry. The mental model is "this parent decided their kid
 * can use this once" — re-asking weekly or monthly feels patronising
 * and breaks the "your kid is the same age tomorrow as today" reality.
 * If you ever want to revoke, sign in + use the Settings panel, or
 * clear browser data.
 *
 * Storage shape: a single cookie `cc_unlocked_modes` with a comma-
 * separated list of unlocked gateable modes (e.g. `text` or `text,voice`).
 * We keep it deliberately small and human-readable for debugging.
 */

import { GATEABLE_MODES, isGateableMode, type GateableMode } from './modes';

const COOKIE_NAME = 'cc_unlocked_modes';
const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

/**
 * Read the cookie and return only valid gateable modes. SSR-safe: returns
 * an empty array when `document` is unavailable so server components / the
 * first render can never blow up. Client effects re-read after mount.
 */
export const getUnlockedModesFromCookie = (): GateableMode[] => {
  if (typeof document === 'undefined') return [];
  const raw = document.cookie
    .split('; ')
    .find((row) => row.startsWith(`${COOKIE_NAME}=`))
    ?.split('=')[1];
  if (!raw) return [];
  try {
    return decodeURIComponent(raw)
      .split(',')
      .map((s) => s.trim())
      .filter(isGateableMode);
  } catch {
    return [];
  }
};

/**
 * Add one mode to the cookie set (idempotent). Always writes the full
 * sorted set so the cookie value is stable + easy to inspect. Returns
 * the new full set for callers that want to update local state in lockstep.
 */
export const addUnlockedModeToCookie = (mode: GateableMode): GateableMode[] => {
  if (typeof document === 'undefined') return [];
  const current = new Set(getUnlockedModesFromCookie());
  current.add(mode);
  // Filter through GATEABLE_MODES to get a stable order — easier to read,
  // easier to test.
  const next = GATEABLE_MODES.filter((m) => current.has(m));
  document.cookie = [
    `${COOKIE_NAME}=${encodeURIComponent(next.join(','))}`,
    `Max-Age=${ONE_YEAR_SECONDS}`,
    'Path=/',
    'SameSite=Lax',
  ].join('; ');
  return next;
};

/**
 * Remove one mode from the cookie set. Used by a guest re-locking from
 * settings (a future surface — guests can't reach the auth-gated settings
 * page today, but the helper is here so the API is symmetric).
 */
export const removeUnlockedModeFromCookie = (
  mode: GateableMode,
): GateableMode[] => {
  if (typeof document === 'undefined') return [];
  const current = new Set(getUnlockedModesFromCookie());
  current.delete(mode);
  const next = GATEABLE_MODES.filter((m) => current.has(m));
  if (next.length === 0) {
    // Empty cookie value would survive but be noisy; clear instead.
    document.cookie = `${COOKIE_NAME}=; Max-Age=0; Path=/; SameSite=Lax`;
  } else {
    document.cookie = [
      `${COOKIE_NAME}=${encodeURIComponent(next.join(','))}`,
      `Max-Age=${ONE_YEAR_SECONDS}`,
      'Path=/',
      'SameSite=Lax',
    ].join('; ');
  }
  return next;
};

/**
 * Pending-creation persistence — survives the Stripe Checkout redirect.
 *
 * When a user hits the paywall mid-creation and subscribes, Stripe
 * Checkout is a full-page redirect that wipes their in-progress scene.
 * Before launching checkout we stash the creation intent here; on
 * return to the create form we restore it so the new subscriber
 * finishes the exact page they started.
 *
 * Storage is `localStorage` — the Stripe redirect is same-browser,
 * same-device, so localStorage survives it. We deliberately do NOT use
 * a DB table: the only case localStorage misses is "subscribe on phone,
 * open the magic-link email on a laptop", which is rare enough that
 * rebuilding one scene is acceptable.
 *
 * Everything here is defensive: a corrupt or oversized entry must never
 * throw into the create form. `save` swallows quota errors, `load`
 * swallows parse errors and self-clears bad/expired data.
 */

import type { SceneSelection } from '@one-colored-pixel/coloring-ui';

const STORAGE_KEY = 'cc_pending_creation';

// 24h: covers the checkout round-trip (minutes) plus a guest who opens
// the post-checkout magic-link email later the same day. Longer than
// that and a half-built scene resurfacing is more confusing than
// helpful.
const TTL_MS = 24 * 60 * 60 * 1000;

/**
 * The creation intent, discriminated by input mode. Mirrors the inputs
 * `createPendingColoringImage` ultimately consumes — but this is purely
 * the *form-restore* shape, not the server-action argument shape.
 */
export type PendingCreation =
  | {
      mode: 'scene';
      selection: SceneSelection;
      characterId: string | null;
      /** The built description — restored so the form is submit-ready. */
      description: string;
    }
  | { mode: 'text'; description: string }
  | { mode: 'voice'; firstAnswer: string; secondAnswer: string }
  | { mode: 'photo'; photoBase64: string };

type StoredEnvelope = {
  /** Epoch ms when this was saved — drives TTL expiry. */
  savedAt: number;
  payload: PendingCreation;
};

const isBrowser = (): boolean => typeof window !== 'undefined';

/**
 * Persist a creation intent. Call right before redirecting to Stripe
 * Checkout. Quota failures (a large photo base64) are swallowed — the
 * worst case is "scene not restored", never a thrown error in the
 * create flow.
 */
export const savePendingCreation = (payload: PendingCreation): void => {
  if (!isBrowser()) return;
  try {
    const envelope: StoredEnvelope = { savedAt: Date.now(), payload };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(envelope));
  } catch {
    // QuotaExceededError (oversized photo) or a privacy-mode storage
    // block. Fail soft — restoration is a nice-to-have, not load-bearing.
  }
};

/**
 * Read a saved creation intent. Returns null — and self-clears the
 * stored key — when the entry is missing, expired (>24h), or corrupt.
 */
export const loadPendingCreation = (): PendingCreation | null => {
  if (!isBrowser()) return null;
  let raw: string | null;
  try {
    raw = window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
  if (!raw) return null;

  let envelope: StoredEnvelope;
  try {
    envelope = JSON.parse(raw) as StoredEnvelope;
  } catch {
    // Corrupt JSON — drop it so it can't keep failing.
    clearPendingCreation();
    return null;
  }

  if (
    typeof envelope?.savedAt !== 'number' ||
    !envelope.payload ||
    Date.now() - envelope.savedAt > TTL_MS
  ) {
    clearPendingCreation();
    return null;
  }

  return envelope.payload;
};

/** Remove any stored creation intent. */
export const clearPendingCreation = (): void => {
  if (!isBrowser()) return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Nothing actionable — ignore.
  }
};

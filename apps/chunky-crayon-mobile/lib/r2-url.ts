/**
 * Env-aware R2 public URL resolver. Mirror of web's
 * `lib/scene/thumbnail-url.ts`.
 *
 * Catalog entries (profile avatars, scene thumbnails, character
 * tiles) store R2 keys like `profile-avatars/dragon.png`, not full
 * URLs. This helper builds the public URL at render time from
 * `EXPO_PUBLIC_R2_PUBLIC_URL` so the same key works in dev and prod.
 *
 * `EXPO_PUBLIC_*` prefix is required so the value gets baked into
 * the JS bundle and is readable from app code at runtime (Expo's
 * convention — the unprefixed version is only available to native
 * build-time tooling, not to JS).
 *
 * Returns null when:
 *   - `key` is null/empty (caller can fall back to initials chip)
 *   - the env var isn't set (dev surfaces without R2 wired up)
 */

// eslint-disable-next-line no-undef
const BASE = process.env.EXPO_PUBLIC_R2_PUBLIC_URL;

export const resolveR2Url = (key: string | null): string | null => {
  if (!key) return null;
  if (!BASE) return null;
  const trimmed = BASE.endsWith("/") ? BASE.slice(0, -1) : BASE;
  return `${trimmed}/${key}`;
};

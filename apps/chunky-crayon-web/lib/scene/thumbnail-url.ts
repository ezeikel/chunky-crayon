/**
 * Env-aware Scene Builder thumbnail URL resolver.
 *
 * Catalog entries store R2 keys (`scene-thumbnails/subject/dog.png`),
 * not full URLs. This resolver builds the public URL at render time
 * from `NEXT_PUBLIC_R2_PUBLIC_URL` so the same catalog file works
 * unchanged in dev (assets.chunkycrayon-dev.com or whatever) and prod
 * (assets.chunkycrayon.com), without re-running the thumbnail script
 * per-environment.
 *
 * Why a new public env var (`NEXT_PUBLIC_R2_PUBLIC_URL`) when the
 * codebase already uses `R2_PUBLIC_URL`: the latter is server-only.
 * The Scene Builder catalog is imported by a client component
 * (`SceneInput`), so we need a client-visible mirror. We deliberately
 * keep BOTH env vars set to the same value rather than rename — the
 * server-only var still gates server-side write paths.
 *
 * `null` return is a fallback signal: catalog entries with no
 * `thumbnailKey` (e.g. the `your-character` sentinel) flow through as
 * null and the SceneTile falls back to the FA icon. We also return
 * null when the env var isn't set (dev surfaces without R2 wired up).
 */

export const resolveThumbnailUrl = (
  thumbnailKey: string | null,
): string | null => {
  if (!thumbnailKey) return null;
  const base = process.env.NEXT_PUBLIC_R2_PUBLIC_URL;
  if (!base) return null;
  // Strip a trailing slash on the base so we never produce `//key`.
  const trimmed = base.endsWith('/') ? base.slice(0, -1) : base;
  return `${trimmed}/${thumbnailKey}`;
};

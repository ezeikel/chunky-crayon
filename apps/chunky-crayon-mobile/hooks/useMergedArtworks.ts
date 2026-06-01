import { useMemo } from "react";
import { useSavedArtworks } from "@/hooks/api";
import { useArtworkStore } from "@/stores/artworkStore";
import { useUserContext } from "@/contexts/UserContext";

/**
 * The My Art tab's read model — local-first, deduped against the DB.
 *
 * The kid's collection lives in two places: the on-device MMKV store (Phase 2,
 * written instantly on "Add to My Artwork", works offline / logged-out) and the
 * DB (Phase 3 pushes local→DB in the background). The tab must show BOTH, each
 * artwork exactly once, the instant it's saved — not wait for the network.
 *
 * Dedup rule (DB id is the source of truth):
 *  - Show every DB row.
 *  - Add a local record only if its `remoteId` is NOT already in the DB set.
 *    That covers the not-yet-synced records (local / pending) and the brief
 *    window after a push lands but before the DB query refetches. Once the DB
 *    list contains the row, the local copy drops out — exactly once, no flicker.
 *
 * On logout the DB cache is cleared (AuthContext), so the dedup set is empty and
 * the whole collection renders from local — the "ghost" state. No data loss: the
 * device keeps its drawings; the next login re-pulls the merged DB rows and the
 * dedup collapses them back to one each.
 */

export type MergedArtwork = {
  /** Stable React key — DB id, or the local id for not-yet-synced records. */
  key: string;
  coloringImageId: string;
  title: string;
  /** Remote URL (DB) or file:// path (local) — expo-image renders both. */
  imageUri: string;
  /** Epoch ms, for newest-first ordering. */
  createdAt: number;
  source: "db" | "local";
};

export const useMergedArtworks = () => {
  const { data, isLoading } = useSavedArtworks();
  const { activeProfile } = useUserContext();
  // Subscribe to the array itself so the tab re-renders when a local save lands.
  const localArtworks = useArtworkStore((s) => s.artworks);

  const profileId = activeProfile?.id ?? null;

  const merged = useMemo<MergedArtwork[]>(() => {
    const dbArtworks = data?.artworks ?? [];
    const dbIds = new Set(dbArtworks.map((a) => a.id));

    const fromDb: MergedArtwork[] = dbArtworks.map((a) => ({
      key: a.id,
      coloringImageId: a.coloringImageId,
      title: a.title,
      imageUri: a.imageUrl,
      createdAt: new Date(a.createdAt).getTime(),
      source: "db",
    }));

    const fromLocal: MergedArtwork[] = localArtworks
      // This profile's drawings only (null bucket = logged-out / no profile).
      .filter((a) => a.profileId === profileId)
      // Drop anything already represented by a DB row (synced + refetched).
      .filter((a) => !(a.remoteId && dbIds.has(a.remoteId)))
      .map((a) => ({
        key: a.id,
        coloringImageId: a.coloringImageId,
        title: a.title,
        imageUri: a.fileUri,
        createdAt: a.createdAt,
        source: "local",
      }));

    return [...fromDb, ...fromLocal].sort((x, y) => y.createdAt - x.createdAt);
  }, [data?.artworks, localArtworks, profileId]);

  return { artworks: merged, isLoading };
};

export default useMergedArtworks;

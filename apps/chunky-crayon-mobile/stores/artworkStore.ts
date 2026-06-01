import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { mmkvStorage } from "@/lib/storage/mmkv";

/**
 * Local-first artwork collection — the kid's saved drawings, kept on-device
 * (MMKV) so "Add to My Artwork" works offline / logged-out / instantly. The
 * heavy PNG lives on disk (see lib/artwork/files.ts); this store holds only
 * tiny metadata + the file:// URI, so launch-time rehydration stays cheap as
 * the collection grows.
 *
 * `syncState` is here from day one so Phase 3 (DB push) is a clean follow-on:
 * a sync worker will pick up records where `syncState !== "synced"`, POST them
 * via the existing useSaveArtwork mutation, then call markSynced. Phase 2 only
 * ever writes "local".
 */

export type ArtworkSyncState = "local" | "pending" | "synced";

export type LocalArtwork = {
  /** Local UUID (also the on-disk PNG filename). */
  id: string;
  coloringImageId: string;
  /** activeProfile?.id at save time; null when there's no active profile. */
  profileId: string | null;
  title: string;
  /** file:// path to the PNG in documentDirectory/artworks. */
  fileUri: string;
  createdAt: number;
  syncState: ArtworkSyncState;
  /** Server artworkId once synced (Phase 3). */
  remoteId?: string;
};

type ArtworkState = {
  artworks: LocalArtwork[];
};

type ArtworkActions = {
  /** Add a freshly-saved artwork (always starts "local"). */
  addArtwork: (artwork: Omit<LocalArtwork, "syncState">) => void;
  /** Artworks for a profile (null bucket = logged-out / no profile), newest first. */
  listByProfile: (profileId: string | null) => LocalArtwork[];
  /** Phase 3: mark pushed to DB. */
  markSynced: (id: string, remoteId: string) => void;
  /** Phase 3: mark a failed push for retry. */
  markPending: (id: string) => void;
  /** Drop a record. File deletion is the caller's job (deleteArtworkFile). */
  remove: (id: string) => void;
};

export const useArtworkStore = create<ArtworkState & ArtworkActions>()(
  persist(
    (set, get) => ({
      artworks: [],
      addArtwork: (artwork) =>
        set((s) => ({
          artworks: [{ ...artwork, syncState: "local" }, ...s.artworks],
        })),
      listByProfile: (profileId) =>
        get()
          .artworks.filter((a) => a.profileId === profileId)
          .sort((x, y) => y.createdAt - x.createdAt),
      markSynced: (id, remoteId) =>
        set((s) => ({
          artworks: s.artworks.map((a) =>
            a.id === id ? { ...a, syncState: "synced", remoteId } : a,
          ),
        })),
      markPending: (id) =>
        set((s) => ({
          artworks: s.artworks.map((a) =>
            a.id === id ? { ...a, syncState: "pending" } : a,
          ),
        })),
      remove: (id) =>
        set((s) => ({ artworks: s.artworks.filter((a) => a.id !== id) })),
    }),
    {
      name: "artwork-store",
      storage: createJSONStorage(() => mmkvStorage),
      version: 1,
    },
  ),
);

/** Local UUID v4 (dependency-free, mirrors lib/auth.ts's device-id generator). */
export const genArtworkId = (): string =>
  "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });

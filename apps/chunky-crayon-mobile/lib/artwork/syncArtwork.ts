import {
  readAsStringAsync,
  getInfoAsync,
  EncodingType,
} from "expo-file-system/legacy";
import { saveArtwork } from "@/api";
import { useArtworkStore } from "@/stores/artworkStore";
import { queryClient } from "@/providers";

/**
 * Push the local-first artwork collection (Phase 2, MMKV) to the DB. Best-effort
 * background sync — never throws, never blocks the UI, no user-facing errors.
 *
 * No-double-award guard (load-bearing): the server's save action does an
 * UNCONDITIONAL insert (no dedup / no idempotency key) and awards stickers +
 * colo-evolution on every save. So duplicate-protection lives ENTIRELY here:
 * we only POST records with `syncState !== 'synced'`, and flip to `synced` the
 * instant the POST returns. A synced record is never POSTed again, by any
 * trigger. The module-level mutex collapses overlapping triggers (add +
 * foreground firing together) so the same record can't be POSTed twice in one
 * pass. Stickers are server-idempotent regardless; colo-evolution is the only
 * thing that could over-count, which the once-per-record discipline prevents.
 */

// Single in-flight flush. Overlapping triggers return early rather than
// double-POST (the server can't dedup, so this matters).
let isFlushing = false;

/** Push all not-yet-synced local artworks to the DB. */
export const flushArtworkSync = async (): Promise<void> => {
  if (isFlushing) return;
  isFlushing = true;
  try {
    // Snapshot at start; any addArtwork during the flush is caught next trigger.
    const pending = useArtworkStore
      .getState()
      .artworks.filter((a) => a.syncState !== "synced");
    if (pending.length === 0) return;

    let syncedCount = 0;

    // Sequential (not Promise.all) — one upload at a time avoids a burst of
    // full-canvas base64 payloads on a slow link.
    for (const art of pending) {
      try {
        // The kid may have deleted the PNG out from under us → drop the record.
        const info = await getInfoAsync(art.fileUri);
        if (!info.exists) {
          useArtworkStore.getState().remove(art.id);
          continue;
        }

        const base64 = await readAsStringAsync(art.fileUri, {
          encoding: EncodingType.Base64,
        });
        const dataUrl = `data:image/png;base64,${base64}`;

        const res = await saveArtwork({
          coloringImageId: art.coloringImageId,
          imageDataUrl: dataUrl,
          title: art.title,
        });

        if (res.success && res.artworkId) {
          // Flip to 'synced' the instant it lands — THE no-double-award guard.
          useArtworkStore.getState().markSynced(art.id, res.artworkId);
          syncedCount += 1;
        } else {
          useArtworkStore.getState().markPending(art.id); // retry next trigger
        }
      } catch (err) {
        // Network / auth / server error: mark pending, keep going (one bad
        // record doesn't stall the rest). Silent — no toast for background sync.
        console.log("[ARTWORK_SYNC] push failed, will retry:", err);
        useArtworkStore.getState().markPending(art.id);
      }
    }

    if (syncedCount > 0) {
      // The My Art tab reads the DB; refresh so just-pushed items appear, and
      // refresh colo/stickers since the save action may have awarded some.
      queryClient.invalidateQueries({ queryKey: ["savedArtworks"] });
      queryClient.invalidateQueries({ queryKey: ["coloState"] });
      queryClient.invalidateQueries({ queryKey: ["stickers"] });
    }
  } finally {
    isFlushing = false;
  }
};

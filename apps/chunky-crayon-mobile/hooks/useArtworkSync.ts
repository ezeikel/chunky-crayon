import { useEffect, useRef } from "react";
import { AppState } from "react-native";
import { useAuth } from "@/contexts/AuthContext";
import { useArtworkStore } from "@/stores/artworkStore";
import { flushArtworkSync } from "@/lib/artwork/syncArtwork";

/**
 * Mount once, app-wide (under AuthProvider). Pushes the local-first artwork
 * collection to the DB at the moments that matter — fire-and-forget, so it
 * never blocks the UI. No polling loop; the `isFlushing` mutex in
 * flushArtworkSync collapses overlapping triggers.
 *
 * Triggers:
 *  A. userId appears / changes — covers cold-start device register AND the
 *     anon→email login merge (flushes any records saved offline before login).
 *  B. app foreground — catch-up moment for anything queued while backgrounded.
 *  C. a new local artwork lands — best-effort immediate push.
 *
 * (Reconnect-triggered flush is intentionally out of scope — no NetInfo dep;
 * foreground + add cover the realistic recovery cases.)
 */
export const useArtworkSync = () => {
  const { user } = useAuth();
  const userId = user?.id;

  // Trigger A — login transition / first registration.
  useEffect(() => {
    if (userId) flushArtworkSync();
  }, [userId]);

  // Trigger B — app foreground (background/inactive → active).
  const appState = useRef(AppState.currentState);
  useEffect(() => {
    const sub = AppState.addEventListener("change", (next) => {
      const cameToForeground =
        !!appState.current.match(/inactive|background/) && next === "active";
      appState.current = next;
      if (cameToForeground && userId) flushArtworkSync();
    });
    return () => sub.remove();
  }, [userId]);

  // Trigger C — a new local artwork was added (store length grew).
  useEffect(() => {
    const unsub = useArtworkStore.subscribe((state, prev) => {
      if (userId && state.artworks.length > prev.artworks.length) {
        flushArtworkSync();
      }
    });
    return () => unsub();
  }, [userId]);
};

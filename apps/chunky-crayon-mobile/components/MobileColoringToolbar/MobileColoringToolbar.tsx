import { useState } from "react";
import { View, StyleSheet, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BottomSheet } from "@swmansion/react-native-bottom-sheet";
import ToolbarContent from "./ToolbarContent";

/**
 * The kids coloring toolbar — an inline bottom sheet docked at the base
 * of the coloring canvas. The scrollable body (tools / colors / brush size /
 * undo-redo) lives in ToolbarContent so it can be storied inline (a docked
 * sheet renders off-canvas in Storybook's split layout).
 *
 * Inline (not modal) sheet: it's always on-screen and never fully
 * dismisses. Four detents matching web's MobileColoringDrawer so users can
 * push it nearly out of view for max canvas space:
 *   - MIN  (handle only) — drag the sheet nearly out of view; full canvas.
 *   - PEEK (handle + tools row) — DEFAULT mount state (index 1).
 *   - HALF (adds palette + colour swatches).
 *   - FULL ('content', adds brush + undo/redo) — sized to the content.
 *
 * Web parity (MobileColoringDrawer): the sheet holds tools / colors / brush /
 * undo-redo ONLY — no zoom (top chrome) and no actions (under the canvas), so
 * it takes no props and reads everything from the store via ToolbarContent.
 */
const MobileColoringToolbar = () => {
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  // Default to PEEK (index 1), like web — MIN is a drag-down destination, not
  // the first thing a new user sees.
  const [index, setIndex] = useState(1);

  // Four detents mirroring web's snapPoints [64, 140, 360, 580], offset by the
  // bottom inset. The top (FULL) detent uses 'content' (size-to-measured-
  // content) rather than a hardcoded pixel height: the native sheet treats a
  // FIXED detent taller than its measured content/window as fatal ("fixed
  // detent exceeds measured content height") — that crashed a short landscape
  // phone. 'content' lets the sheet size itself to whatever ToolbarContent
  // measures on any device/orientation; the body scrolls if it's taller.
  //
  // The fixed detents are clamped to the window so they can't exceed it on a
  // short viewport (also fatal), and kept strictly ascending. On a very short
  // window the lower detents collapse toward MIN — still valid, just denser.
  const maxFixed = Math.max(120, windowHeight - insets.top - 24);
  const minHeight = Math.min(64 + insets.bottom, maxFixed);
  const peekHeight = Math.min(140 + insets.bottom, maxFixed);
  const halfHeight = Math.min(360 + insets.bottom, maxFixed);
  // Strictly ascending, de-duped — the native sheet rejects equal/descending
  // detents. On a short window where clamping collapses several to maxFixed,
  // drop the duplicates so only distinct heights (plus 'content') remain.
  const fixedAscending = [minHeight, peekHeight, halfHeight].filter(
    (h, i, arr) => i === 0 || h > arr[i - 1],
  );
  const detents: (number | "content")[] = [...fixedAscending, "content"];
  // Keep the index in range if the detent count collapsed on a short window.
  const safeIndex = Math.min(index, detents.length - 1);

  return (
    <BottomSheet detents={detents} index={safeIndex} onIndexChange={setIndex}>
      <View style={[styles.surface, { paddingBottom: insets.bottom + 8 }]}>
        <View style={styles.handleIndicator} />
        <ToolbarContent />
      </View>
    </BottomSheet>
  );
};

const styles = StyleSheet.create({
  surface: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    // Generous gap above the handle (web parity — the drag handle has a roomy
    // py-5 hit area before any content).
    paddingTop: 16,
    paddingHorizontal: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 10,
  },
  handleIndicator: {
    alignSelf: "center",
    backgroundColor: "#D1D5DB",
    width: 40,
    height: 4,
    borderRadius: 2,
    // Roomy gap between the handle and the content below it (web parity).
    marginBottom: 16,
  },
});

export default MobileColoringToolbar;

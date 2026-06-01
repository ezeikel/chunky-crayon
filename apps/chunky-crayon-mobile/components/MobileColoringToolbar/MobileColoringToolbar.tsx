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
 * dismisses. Two pixel detents — collapsed (tools + colors visible) and
 * expanded (all options). Starts collapsed (index 0).
 *
 * Web parity (MobileColoringDrawer): the sheet holds tools / colors / brush /
 * undo-redo ONLY — no zoom (top chrome) and no actions (under the canvas), so
 * it takes no props and reads everything from the store via ToolbarContent.
 */
const MobileColoringToolbar = () => {
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const [index, setIndex] = useState(0);

  // Two detents: a small fixed "peek" (tools row visible) and an expanded one
  // that reveals the full grid + colors + brush + undo/redo.
  //
  // The expanded detent uses 'content' (size-to-measured-content) rather than
  // a hardcoded pixel height: the native sheet treats a FIXED detent taller
  // than its measured content as fatal ("fixed detent exceeds measured content
  // height"), which crashed a short landscape phone (~390pt window) where a
  // 460pt detent didn't fit. 'content' lets the sheet size itself to whatever
  // ToolbarContent measures on any device/orientation; the body scrolls if the
  // content is taller than the window.
  //
  // The collapsed peek stays fixed but is clamped to the window so it can't
  // exceed it on a very short viewport (which would also be fatal).
  const collapsedHeight = Math.min(
    150 + insets.bottom,
    Math.max(120, windowHeight - insets.top - 24),
  );

  return (
    <BottomSheet
      detents={[collapsedHeight, "content"]}
      index={index}
      onIndexChange={setIndex}
    >
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

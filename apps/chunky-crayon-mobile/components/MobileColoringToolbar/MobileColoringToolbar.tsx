import { useState } from "react";
import { View, StyleSheet } from "react-native";
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
  const [index, setIndex] = useState(0);

  // Collapsed shows the tools row; expanded reveals the full grid + colors +
  // brush + undo/redo. (No zoom/actions in the sheet — see ToolbarContent.)
  const collapsedHeight = 150 + insets.bottom;
  const expandedHeight = 460 + insets.bottom;

  return (
    <BottomSheet
      detents={[collapsedHeight, expandedHeight]}
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

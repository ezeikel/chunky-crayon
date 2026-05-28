import { useCallback, useMemo, useRef } from "react";
import { StyleSheet } from "react-native";
import BottomSheet, { BottomSheetScrollView } from "@gorhom/bottom-sheet";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import ToolbarContent from "./ToolbarContent";

/**
 * The kids coloring toolbar — a bottom sheet that docks at the base of
 * the coloring canvas. The scrollable body (tools / colors / brush size /
 * fill / history) lives in ToolbarContent so it can be storied inline
 * (a docked sheet renders off-canvas in Storybook's split layout).
 *
 * Visuals match web's coloring-ui ToolSelector — see ToolbarContent.
 */
const MobileColoringToolbar = () => {
  const insets = useSafeAreaInsets();
  const bottomSheetRef = useRef<BottomSheet>(null);

  // Snap points: collapsed (tools + colors visible), expanded (all options)
  const snapPoints = useMemo(() => {
    const collapsedHeight = 140 + insets.bottom;
    const expandedHeight = 380 + insets.bottom;
    return [collapsedHeight, expandedHeight];
  }, [insets.bottom]);

  const handleSheetChanges = useCallback((_index: number) => {
    // Optional: handle sheet position changes
  }, []);

  return (
    <BottomSheet
      ref={bottomSheetRef}
      index={0}
      snapPoints={snapPoints}
      onChange={handleSheetChanges}
      backgroundStyle={styles.sheetBackground}
      handleIndicatorStyle={styles.handleIndicator}
      enablePanDownToClose={false}
    >
      <BottomSheetScrollView
        contentContainerStyle={[
          styles.contentContainer,
          { paddingBottom: insets.bottom + 8 },
        ]}
      >
        <ToolbarContent />
      </BottomSheetScrollView>
    </BottomSheet>
  );
};

const styles = StyleSheet.create({
  sheetBackground: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 10,
  },
  handleIndicator: {
    backgroundColor: "#D1D5DB",
    width: 40,
    height: 4,
  },
  contentContainer: {
    paddingHorizontal: 16,
  },
});

export default MobileColoringToolbar;

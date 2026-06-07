import { useState, type ReactNode } from "react";
import { View, StyleSheet, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BottomSheet } from "@swmansion/react-native-bottom-sheet";
import { SHEET_HANDLE } from "@/lib/design";

/**
 * The onboarding coloring slide's bottom sheet — a REAL draggable BottomSheet
 * with the SAME four detents as the live MobileColoringToolbar (MIN / PEEK /
 * HALF / FULL), so the kid can drag it down for more canvas exactly like the
 * real coloring screen. The earlier static <View> sheet had no snap points.
 *
 * Detent logic is copied verbatim from MobileColoringToolbar (web's snapPoints
 * [64, 140, 360, 580], offset by the bottom inset, clamped to the window, top
 * detent = 'content'). The clamp + 'content' top matter: a FIXED detent taller
 * than measured content/window is fatal on the native sheet (it crashed a short
 * landscape phone), so we clamp the fixed ones to the window and let the top
 * size to content. See feedback_bottom_sheet_content_detent_not_fixed.
 *
 * Children = the sheet body (handle is rendered here; pass the picker + tools +
 * Done pill). Keep it identical to the real sheet's surface so the language
 * matches.
 */
type OnboardingColoringSheetProps = {
  children: ReactNode;
};

const OnboardingColoringSheet = ({
  children,
}: OnboardingColoringSheetProps) => {
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  // Default to PEEK (index 1), like the real sheet — MIN is a drag-down
  // destination, not the first thing a new user sees.
  const [index, setIndex] = useState(1);

  const maxFixed = Math.max(120, windowHeight - insets.top - 24);
  const minHeight = Math.min(64 + insets.bottom, maxFixed);
  const peekHeight = Math.min(180 + insets.bottom, maxFixed);
  const halfHeight = Math.min(400 + insets.bottom, maxFixed);
  // Strictly ascending, de-duped — the native sheet rejects equal/descending
  // detents (on a short window where clamping collapses several to maxFixed).
  const fixedAscending = [minHeight, peekHeight, halfHeight].filter(
    (h, i, arr) => i === 0 || h > arr[i - 1],
  );
  const detents: (number | "content")[] = [...fixedAscending, "content"];
  const safeIndex = Math.min(index, detents.length - 1);

  return (
    <BottomSheet detents={detents} index={safeIndex} onIndexChange={setIndex}>
      <View style={[styles.surface, { paddingBottom: insets.bottom + 8 }]}>
        <View style={styles.handle} />
        {children}
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
    // Match the live sheet's roomy handle hit-area.
    paddingTop: 16,
    paddingHorizontal: 16,
    gap: 14,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 10,
  },
  handle: {
    ...SHEET_HANDLE,
    marginBottom: 2,
  },
});

export default OnboardingColoringSheet;

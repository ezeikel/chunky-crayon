import { View, Text, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { Meta, StoryObj } from "@storybook/react-native";
import {
  FocusModeProvider,
  useFocusMode,
  FocusModeToggleButton,
  FocusModeFloatingExit,
} from "./index";
import { FONTS, COLORS } from "@/lib/design";

/**
 * Storybook surface for focus mode. Wraps a stand-in "coloring
 * screen" (header chrome + canvas placeholder + bottom toolbar
 * placeholder) inside its own FocusModeProvider so the story is
 * self-contained — toggling focus from a Storybook tile won't
 * affect any other story on the same device.
 *
 * Why a stand-in instead of importing the real screen: the real
 * coloring-image route needs `useLocalSearchParams`, `useColoringImage`
 * (TanStack Query), `useResponsiveLayout`, and a fixture coloring
 * image. The chrome-hiding behavior is what's worth previewing here
 * — not those moving parts.
 */

const DemoScreen = () => {
  const { isFocusMode } = useFocusMode();
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.container}>
      {/* Stand-in header chrome — hides when focus mode is on. */}
      {!isFocusMode && (
        <View
          style={[styles.header, { paddingTop: Math.max(insets.top, 12) + 8 }]}
        >
          <View style={styles.chip} />
          <View style={styles.titleArea}>
            <Text style={styles.title}>Sleepy Bunny Garden</Text>
          </View>
          <View style={[styles.chip, styles.chipPrimary]} />
        </View>
      )}

      {/* Canvas controls row — also hides; FocusModeToggleButton
          lives in here so the user can enter focus mode. */}
      {!isFocusMode && (
        <View style={styles.controlsRow}>
          <View style={styles.miniPill}>
            <Text style={styles.miniPillText}>42%</Text>
          </View>
          <View style={styles.miniPill}>
            <Text style={styles.miniPillText}>🔊</Text>
          </View>
          <FocusModeToggleButton />
        </View>
      )}

      {/* Canvas placeholder — always visible (the whole point of
          focus mode is keeping this big). */}
      <View style={styles.canvasArea}>
        <View style={styles.canvasCard}>
          <Text style={styles.canvasLabel}>
            🎨 Canvas{"\n"}
            {isFocusMode ? "Focus mode" : "Normal mode"}
          </Text>
        </View>
      </View>

      {/* Bottom toolbar placeholder — hidden in focus mode. */}
      {!isFocusMode && (
        <View style={styles.bottomBar}>
          <View style={styles.toolDot} />
          <View style={styles.toolDot} />
          <View style={styles.toolDot} />
          <View style={styles.toolDot} />
          <View style={styles.toolDot} />
        </View>
      )}

      {/* Floating exit — only renders while focus mode is active. */}
      <FocusModeFloatingExit />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FDFAF5",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 12,
  },
  chip: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    borderWidth: 2,
    borderColor: COLORS.borderLight,
  },
  chipPrimary: {
    backgroundColor: COLORS.crayonOrange,
    borderColor: COLORS.crayonOrange,
  },
  titleArea: {
    flex: 1,
  },
  title: {
    fontFamily: FONTS.bold,
    fontSize: 18,
    color: "#3D2C1E",
  },
  controlsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  miniPill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: "#FFFFFF",
    borderRadius: 999,
    borderWidth: 2,
    borderColor: COLORS.borderLight,
  },
  miniPillText: {
    fontFamily: FONTS.bold,
    fontSize: 14,
    color: "#3D2C1E",
  },
  canvasArea: {
    flex: 1,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  canvasCard: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    borderWidth: 2,
    borderColor: COLORS.borderLight,
    alignItems: "center",
    justifyContent: "center",
  },
  canvasLabel: {
    fontFamily: FONTS.regular,
    fontSize: 18,
    color: "#7A6F66",
    textAlign: "center",
    lineHeight: 26,
  },
  bottomBar: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 24,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
  },
  toolDot: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.bgPeach,
    borderWidth: 2,
    borderColor: COLORS.borderLight,
  },
});

const meta: Meta = {
  title: "Coloring Experience/Focus Mode",
  decorators: [
    (Story) => (
      <FocusModeProvider>
        <Story />
      </FocusModeProvider>
    ),
  ],
  parameters: { layout: "fullscreen" },
};

export default meta;
type Story = StoryObj;

export const Demo: Story = {
  render: () => <DemoScreen />,
};

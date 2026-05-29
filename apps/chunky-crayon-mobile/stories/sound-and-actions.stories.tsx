import { useState } from "react";
import { View, Text, Pressable, ScrollView, StyleSheet } from "react-native";
import type { Meta, StoryObj } from "@storybook/react-native";
import { FontAwesomeIcon } from "@fortawesome/react-native-fontawesome";
import {
  faVolumeHigh,
  faHandPointer,
} from "@fortawesome/pro-duotone-svg-icons";
import { COLORS, FONTS } from "@/lib/design";
import {
  playPop,
  playSwoosh,
  playSparkle,
  playSplash,
  playClick,
  playSuccess,
  playUndo,
} from "@/utils/sounds";
import {
  tapLight,
  tapMedium,
  tapHeavy,
  notifySuccess,
  notifyWarning,
  selectionChanged,
} from "@/utils/haptics";
import ActionModal from "@/components/ActionModal/ActionModal";

/**
 * Mobile mirror of web's "Sound / SfxPlayground" and "Celebrations &
 * Actions / ActionRow" stories.
 *
 * SfxPlayground: one screen that fires every sound effect (utils/sounds)
 * and every haptic (utils/haptics) so the full audio/tactile palette can
 * be auditioned on-device in one place. Sounds need a real build to play
 * (Storybook on the simulator has no audio output, but haptics fire on a
 * physical device).
 *
 * ActionRow: the mobile equivalent of web's ActionRow — the post-coloring
 * ActionModal (Save / Share / My Art / Start Over) shown open. Its side
 * effects are inert without a real artwork, so it's safe to drive here.
 */

type Trigger = { label: string; fire: () => void };

const SOUND_TRIGGERS: Trigger[] = [
  { label: "Pop", fire: playPop },
  { label: "Swoosh", fire: playSwoosh },
  { label: "Sparkle", fire: playSparkle },
  { label: "Splash", fire: playSplash },
  { label: "Click", fire: playClick },
  { label: "Success", fire: playSuccess },
  { label: "Undo", fire: playUndo },
];

const HAPTIC_TRIGGERS: Trigger[] = [
  { label: "Tap light", fire: tapLight },
  { label: "Tap medium", fire: tapMedium },
  { label: "Tap heavy", fire: tapHeavy },
  { label: "Success", fire: notifySuccess },
  { label: "Warning", fire: notifyWarning },
  { label: "Selection", fire: selectionChanged },
];

const TriggerRow = ({ items }: { items: Trigger[] }) => (
  <View style={styles.grid}>
    {items.map((t) => (
      <Pressable
        key={t.label}
        onPress={t.fire}
        accessibilityRole="button"
        accessibilityLabel={t.label}
        style={({ pressed }) => [styles.chip, pressed && styles.chipPressed]}
      >
        <Text style={styles.chipText}>{t.label}</Text>
      </Pressable>
    ))}
  </View>
);

const SfxPlayground = () => (
  <ScrollView contentContainerStyle={styles.stage}>
    <Text style={styles.title}>SFX Playground</Text>
    <Text style={styles.caption}>
      Tap to fire each effect. Audit the full audio + haptic palette in one
      place. Sounds need a real build with audio; haptics need a device.
    </Text>

    <View style={styles.sectionRow}>
      <FontAwesomeIcon
        icon={faVolumeHigh}
        size={18}
        color={COLORS.crayonOrange}
        secondaryColor={COLORS.yellow}
        secondaryOpacity={1}
      />
      <Text style={styles.sectionTitle}>Sounds</Text>
    </View>
    <TriggerRow items={SOUND_TRIGGERS} />

    <View style={[styles.sectionRow, { marginTop: 24 }]}>
      <FontAwesomeIcon
        icon={faHandPointer}
        size={18}
        color={COLORS.crayonOrange}
        secondaryColor={COLORS.yellow}
        secondaryOpacity={1}
      />
      <Text style={styles.sectionTitle}>Haptics</Text>
    </View>
    <TriggerRow items={HAPTIC_TRIGGERS} />
  </ScrollView>
);

const ActionRow = () => {
  const [open, setOpen] = useState(true);
  return (
    <View style={styles.actionStage}>
      <Pressable
        onPress={() => setOpen(true)}
        style={styles.reopen}
        accessibilityRole="button"
      >
        <Text style={styles.reopenText}>Open action sheet</Text>
      </Pressable>
      <ActionModal visible={open} onClose={() => setOpen(false)} />
    </View>
  );
};

const styles = StyleSheet.create({
  stage: { padding: 20, backgroundColor: COLORS.bgCream, flexGrow: 1 },
  title: { fontFamily: FONTS.bold, fontSize: 32, color: COLORS.textPrimary },
  caption: {
    fontFamily: FONTS.regular,
    fontSize: 15,
    color: COLORS.textSecondary,
    lineHeight: 22,
    marginTop: 8,
    marginBottom: 16,
  },
  sectionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  sectionTitle: {
    fontFamily: FONTS.bold,
    fontSize: 20,
    color: COLORS.textPrimary,
  },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  chip: {
    backgroundColor: COLORS.white,
    borderRadius: 999,
    borderWidth: 2,
    borderColor: COLORS.bgCreamDark,
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  chipPressed: { opacity: 0.85, transform: [{ scale: 0.97 }] },
  chipText: { fontFamily: FONTS.bold, fontSize: 15, color: COLORS.textPrimary },
  actionStage: {
    flex: 1,
    backgroundColor: COLORS.bgCream,
    alignItems: "center",
    justifyContent: "center",
  },
  reopen: {
    backgroundColor: COLORS.white,
    borderRadius: 999,
    borderWidth: 2,
    borderColor: COLORS.bgCreamDark,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  reopenText: {
    fontFamily: FONTS.bold,
    fontSize: 15,
    color: COLORS.textPrimary,
  },
});

const meta: Meta = {
  title: "Celebrations & Actions/Sound & Actions",
  parameters: { layout: "fullscreen" },
};
export default meta;
type Story = StoryObj;

export const Sfx_Playground: Story = { render: () => <SfxPlayground /> };
export const Action_Row: Story = { render: () => <ActionRow /> };

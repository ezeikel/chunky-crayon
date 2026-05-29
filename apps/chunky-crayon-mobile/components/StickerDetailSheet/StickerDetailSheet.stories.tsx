import { useState } from "react";
import { View, Pressable, Text, StyleSheet } from "react-native";
import type { Meta, StoryObj } from "@storybook/react-native";
import StickerDetailSheet, { type StickerDetail } from "./StickerDetailSheet";
import { COLORS, FONTS } from "@/lib/design";

/**
 * Sticker detail bottom sheet — mobile port of web's StickerDetailModal.
 * Tap a sticker in the book → it slides up with the big sticker, rarity
 * stars, and either the unlock celebration or how-to-unlock hint.
 *
 * Each story wraps a tappable "Open" trigger (the sheet is contextual,
 * like the Colo + paywall sheets), so the reviewer can show / dismiss.
 */

const Trigger = ({
  sticker,
  label,
}: {
  sticker: StickerDetail;
  label: string;
}) => {
  const [open, setOpen] = useState(true);
  return (
    <View style={styles.stage}>
      <Pressable style={styles.openBtn} onPress={() => setOpen(true)}>
        <Text style={styles.openLabel}>{label}</Text>
      </Pressable>
      <StickerDetailSheet
        sticker={sticker}
        isOpen={open}
        onClose={() => setOpen(false)}
      />
    </View>
  );
};

const meta: Meta = {
  title: "Mascot & Stickers/Sticker Detail Sheet",
  parameters: { layout: "fullscreen" },
};

export default meta;
type Story = StoryObj;

export const UnlockedCommon: Story = {
  render: () => (
    <Trigger
      label="Open — Unlocked"
      sticker={{
        id: "first-steps",
        name: "First Steps",
        emoji: "🎨",
        rarity: "common",
        isUnlocked: true,
        unlockedAt: "2026-05-20T10:00:00.000Z",
        unlockMessage: "Your very first masterpiece!",
      }}
    />
  ),
};

export const UnlockedLegendary: Story = {
  render: () => (
    <Trigger
      label="Open — Legendary"
      sticker={{
        id: "master-creator",
        name: "Master Creator",
        emoji: "👑",
        rarity: "legendary",
        isUnlocked: true,
        unlockedAt: "2026-05-25T14:30:00.000Z",
        unlockMessage: "You're a coloring legend!",
      }}
    />
  ),
};

export const Locked: Story = {
  render: () => (
    <Trigger
      label="Open — Locked"
      sticker={{
        id: "century-club",
        name: "Century Club",
        emoji: "💯",
        rarity: "rare",
        isUnlocked: false,
        unlockedAt: null,
        unlockHint: "Save 100 artworks to unlock this sticker!",
      }}
    />
  ),
};

const styles = StyleSheet.create({
  stage: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.bgCream,
  },
  openBtn: {
    backgroundColor: COLORS.crayonOrange,
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 24,
  },
  openLabel: {
    color: "#FFFFFF",
    fontFamily: FONTS.bold,
    fontSize: 16,
  },
});

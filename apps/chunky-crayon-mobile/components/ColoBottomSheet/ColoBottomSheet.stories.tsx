import { useState } from "react";
import { View, Pressable, Text } from "react-native";
import type { Meta, StoryObj } from "@storybook/react-native";
import ColoBottomSheet from "./ColoBottomSheet";
import { COLO_STAGES } from "@/lib/colo";
import type { ColoStage, ColoState } from "@/lib/colo";

/**
 * Storybook surface for the kid-friendly Colo detail sheet. Each
 * story wraps a tappable "Open" button so the reviewer can show /
 * dismiss the sheet at will, matching how AppHeader fires it in
 * production.
 *
 * Mirrors web's HeaderColoIndicator dropdown body — same blocks
 * (avatar + stage name + visual progress bar + ready-to-grow / max
 * trophy + accessories row).
 */

const makeColoState = (
  stage: ColoStage,
  progressPercentage: number,
  accessories: string[] = [],
): ColoState => {
  const info = COLO_STAGES[stage];
  const nextInfo = stage < 6 ? COLO_STAGES[(stage + 1) as ColoStage] : null;
  const required = nextInfo ? nextInfo.requiredArtworks : 0;
  const current = Math.round((progressPercentage / 100) * required);
  return {
    stage,
    stageName: info.name,
    stageDescription: info.description,
    imagePath: info.imagePath,
    accessories,
    nextStage: nextInfo,
    progressToNext: nextInfo
      ? { current, required, percentage: progressPercentage }
      : null,
  };
};

const Trigger = ({ state, label }: { state: ColoState; label: string }) => {
  const [open, setOpen] = useState(true);
  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
      <Pressable
        onPress={() => setOpen(true)}
        style={{
          backgroundColor: "#E46444",
          paddingVertical: 16,
          paddingHorizontal: 32,
          borderRadius: 999,
        }}
      >
        <Text style={{ color: "white", fontWeight: "bold", fontSize: 18 }}>
          {label}
        </Text>
      </Pressable>
      <ColoBottomSheet
        isOpen={open}
        onClose={() => setOpen(false)}
        coloState={state}
      />
    </View>
  );
};

const meta: Meta<typeof ColoBottomSheet> = {
  title: "Mascot & Stickers/ColoBottomSheet",
  component: ColoBottomSheet,
};

export default meta;
type Story = StoryObj<typeof ColoBottomSheet>;

export const Stage1MidProgress: Story = {
  render: () => (
    <Trigger state={makeColoState(1, 40)} label="Stage 1 — 40% to next" />
  ),
};

export const Stage3NearlyReady: Story = {
  render: () => (
    <Trigger state={makeColoState(3, 85)} label="Stage 3 — 85% to next" />
  ),
};

export const Stage4ReadyToGrow: Story = {
  render: () => (
    <Trigger
      state={makeColoState(4, 100)}
      label="Stage 4 — Ready to grow (100%)"
    />
  ),
};

export const Stage6Master: Story = {
  render: () => (
    <Trigger state={makeColoState(6, 0)} label="Stage 6 — Master (trophy)" />
  ),
};

export const WithAccessories: Story = {
  render: () => (
    <Trigger
      state={makeColoState(3, 60, [
        "rainbow-scarf",
        "crown",
        "astronaut-helmet",
      ])}
      label="Stage 3 — with 3 accessories"
    />
  ),
};

export const WithManyAccessories: Story = {
  render: () => (
    <Trigger
      state={makeColoState(5, 30, [
        "rainbow-scarf",
        "crown",
        "astronaut-helmet",
        "wizard-hat",
        "superhero-cape",
        "rocket-jetpack",
        "magic-wand",
        "sparkle-aura",
      ])}
      label="Stage 5 — 8 accessories (overflow chip)"
    />
  ),
};

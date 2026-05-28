import { useState } from "react";
import {
  View,
  Pressable,
  Text,
  StyleSheet,
  type ImageSourcePropType,
} from "react-native";
import { action } from "storybook/actions";
import type { Meta, StoryObj } from "@storybook/react-native";
import AutoColorModal, { type AutoColorModalState } from "./AutoColorModal";
import { COLORS, FONTS } from "@/lib/design";

/**
 * Auto-Color modal — mobile port of coloring-ui's AutoColorModal +
 * AutoColorPreview. A full-screen blocking modal with two states:
 *
 *   Loading            → spinner + "Coloring your picture!" while the AI paints
 *   Preview            → the AI-colored reference + Cancel / Try Again / Apply
 *   PreviewRetrying    → preview with a Try-Again generation in flight
 *   PreviewLoadingImage→ preview before the reference image has loaded
 *
 * Each story wraps a tappable "Open" trigger (it's a Modal, like the
 * paywall stories) so the reviewer can show / dismiss at will. The mock
 * reference uses a bundled scene illustration.
 */

const MOCK_REFERENCE = require("@/assets/scene-thumbnails/subject/dog.png");

const Trigger = ({
  state,
  referenceImage,
  isRetrying,
  label,
}: {
  state: AutoColorModalState;
  referenceImage?: string | ImageSourcePropType | null;
  isRetrying?: boolean;
  label: string;
}) => {
  const [open, setOpen] = useState(true);
  return (
    <View style={styles.stage}>
      <Pressable style={styles.openBtn} onPress={() => setOpen(true)}>
        <Text style={styles.openLabel}>{label}</Text>
      </Pressable>
      <AutoColorModal
        visible={open}
        state={state}
        referenceImage={referenceImage}
        isRetrying={isRetrying}
        onApply={() => {
          action("apply")();
          setOpen(false);
        }}
        onRetry={action("retry")}
        onCancel={() => {
          action("cancel")();
          setOpen(false);
        }}
      />
    </View>
  );
};

const meta: Meta = {
  title: "Coloring Experience/Auto Color Modal",
  parameters: { layout: "fullscreen" },
};

export default meta;
type Story = StoryObj;

export const Loading: Story = {
  render: () => <Trigger state="loading" label="Open — Loading" />,
};

export const Preview: Story = {
  render: () => (
    <Trigger
      state="preview"
      referenceImage={MOCK_REFERENCE}
      label="Open — Preview"
    />
  ),
};

export const PreviewRetrying: Story = {
  render: () => (
    <Trigger
      state="preview"
      referenceImage={MOCK_REFERENCE}
      isRetrying
      label="Open — Preview (retrying)"
    />
  ),
};

export const PreviewLoadingImage: Story = {
  render: () => (
    <Trigger
      state="preview"
      referenceImage={null}
      label="Open — Preview (image loading)"
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

import { View, StyleSheet } from "react-native";
import type { Meta, StoryObj } from "@storybook/react-native";
import CharacterBuilder from "./CharacterBuilder";
import { COLORS } from "@/lib/design";

/**
 * The 5-step icon-first create wizard (Species → Colour → Traits → Name →
 * Voice). It owns its own step state, so a single story is enough — walk
 * it tile-by-tile. The Default story logs the final draft on submit; the
 * Submitting story shows the disabled in-flight state.
 *
 * Mirrors web's CreateCharacterModal flow + the SceneBuilder visual family
 * (tiles, carousel, circular nav, progress bar).
 */

const Stage = ({ children }: { children: React.ReactNode }) => (
  <View style={styles.stage}>{children}</View>
);

const meta: Meta = {
  title: "Characters/Character Builder",
  parameters: { layout: "fullscreen" },
};
export default meta;
type Story = StoryObj;

export const Default: Story = {
  render: () => (
    <Stage>
      <CharacterBuilder onSubmit={() => {}} submitting={false} />
    </Stage>
  ),
};

/** In-flight: nav + CTA disabled while the create request runs. */
export const Submitting: Story = {
  render: () => (
    <Stage>
      <CharacterBuilder onSubmit={() => {}} submitting />
    </Stage>
  ),
};

const styles = StyleSheet.create({
  stage: {
    flex: 1,
    padding: 16,
    paddingTop: 24,
    backgroundColor: COLORS.bgCream,
  },
});

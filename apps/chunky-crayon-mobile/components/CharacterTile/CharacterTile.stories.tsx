import { View, StyleSheet } from "react-native";
import type { Meta, StoryObj } from "@storybook/react-native";
import CharacterTile, { AddCharacterTile } from "./CharacterTile";
import type { Character } from "@/api";
import { COLORS } from "@/lib/design";

/**
 * The character roster tile — RN port of web's CharacterTile. Three
 * states: READY (portrait + name + species), GENERATING (pulsing wand +
 * "Drawing…" + yellow pill), FAILED (refresh icon + tap-to-retry + retry
 * pill). Plus the dashed AddCharacterTile that sits at the end of the grid.
 *
 * Stories render the tile at its real grid width (≈47.5%) inside a cream
 * stage so the card chrome reads as it does on the characters screen.
 */

const base: Character = {
  id: "c1",
  name: "Rex the Brave",
  species: "dragon",
  traits: ["brave", "sparkly"],
  signatureDetails: [],
  portraitUrl: null,
  portraitLineArtUrl: null,
  status: "READY",
  failureReason: null,
  voicePersona: "brave-neutral",
  equippedOutfitId: null,
  createdAt: new Date().toISOString(),
};

const ready: Character = {
  ...base,
  status: "READY",
  // A stand-in remote portrait so the READY state shows an image in SB.
  portraitUrl:
    "https://upload.wikimedia.org/wikipedia/commons/thumb/4/47/PNG_transparency_demonstration_1.png/280px-PNG_transparency_demonstration_1.png",
};

const generating: Character = { ...base, status: "GENERATING" };
const failed: Character = {
  ...base,
  name: "Buddy the Sparkly",
  species: "puppy",
  status: "FAILED",
  failureReason: "worker error (never shown to kids)",
};

const Stage = ({ children }: { children: React.ReactNode }) => (
  <View style={styles.stage}>
    <View style={styles.cell}>{children}</View>
  </View>
);

const meta: Meta = {
  title: "Characters/Character Tile",
  parameters: { layout: "fullscreen" },
};
export default meta;
type Story = StoryObj;

export const Ready: Story = {
  render: () => (
    <Stage>
      <CharacterTile character={ready} onPress={() => {}} onRetry={() => {}} />
    </Stage>
  ),
};

export const Generating: Story = {
  render: () => (
    <Stage>
      <CharacterTile
        character={generating}
        onPress={() => {}}
        onRetry={() => {}}
      />
    </Stage>
  ),
};

export const Failed: Story = {
  render: () => (
    <Stage>
      <CharacterTile character={failed} onPress={() => {}} onRetry={() => {}} />
    </Stage>
  ),
};

export const AddTile: Story = {
  render: () => (
    <Stage>
      <AddCharacterTile onPress={() => {}} />
    </Stage>
  ),
};

/** The full grid: a READY + GENERATING + FAILED + Add tile, as on-screen. */
export const Grid: Story = {
  render: () => (
    <View style={styles.stage}>
      <View style={styles.grid}>
        <View style={styles.gridCell}>
          <CharacterTile
            character={ready}
            onPress={() => {}}
            onRetry={() => {}}
          />
        </View>
        <View style={styles.gridCell}>
          <CharacterTile
            character={generating}
            onPress={() => {}}
            onRetry={() => {}}
          />
        </View>
        <View style={styles.gridCell}>
          <CharacterTile
            character={failed}
            onPress={() => {}}
            onRetry={() => {}}
          />
        </View>
        <View style={styles.gridCell}>
          <AddCharacterTile onPress={() => {}} />
        </View>
      </View>
    </View>
  ),
};

const styles = StyleSheet.create({
  stage: {
    flex: 1,
    padding: 16,
    backgroundColor: COLORS.bgCream,
    justifyContent: "center",
  },
  cell: {
    width: "47.5%",
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  gridCell: {
    width: "47.5%",
    flexGrow: 1,
  },
});

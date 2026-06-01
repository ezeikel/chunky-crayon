import { View } from "react-native";
import { action } from "storybook/actions";
import type { Meta, StoryObj } from "@storybook/react-native";
import MoreColoringPagesView from "./MoreColoringPagesView";
import type { MoreColoringPagesItem } from "./MoreColoringPagesView";

/**
 * Stories for the "More Coloring Pages" grid (tablet-portrait dead-space
 * filler below the canvas). Uses the presentational View so no TanStack
 * Query / Expo Router host is needed. Populated / loading / empty
 * reviewable on-device.
 */

const SAMPLE_ITEMS: MoreColoringPagesItem[] = [
  { id: "1", title: "Sleepy bunny in a flower garden", svgUrl: null },
  { id: "2", title: "Three dragons reading a book", svgUrl: null },
  { id: "3", title: "Astronaut planting a sunflower", svgUrl: null },
  { id: "4", title: "Unicorn cooking pancakes", svgUrl: null },
  { id: "5", title: "Ghost playing the violin", svgUrl: null },
  { id: "6", title: "Rainbow over a forest", svgUrl: null },
];

const meta: Meta<typeof MoreColoringPagesView> = {
  title: "Coloring/MoreColoringPages",
  component: MoreColoringPagesView,
  parameters: { layout: "fullscreen" },
  decorators: [
    (Story) => (
      <View style={{ flex: 1, backgroundColor: "#FDFAF5" }}>
        <Story />
      </View>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof MoreColoringPagesView>;

const baseArgs = {
  heading: "More Coloring Pages",
  containerWidth: 1032,
  onItemPress: action("item-press"),
};

export const Populated: Story = {
  args: { ...baseArgs, items: SAMPLE_ITEMS, isLoading: false },
};

export const Loading: Story = {
  args: { ...baseArgs, items: [], isLoading: true },
};

export const Empty: Story = {
  args: { ...baseArgs, items: [], isLoading: false },
};

export const Three: Story = {
  args: { ...baseArgs, items: SAMPLE_ITEMS.slice(0, 3), isLoading: false },
};

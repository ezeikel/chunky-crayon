import { View } from "react-native";
import { action } from "storybook/actions";
import type { Meta, StoryObj } from "@storybook/react-native";
import MyRecentCreationsView from "./MyRecentCreationsView";
import type { MyRecentCreationsItem } from "./MyRecentCreationsView";

/**
 * Storybook stories for the recent-creations strip — uses the
 * presentational View so we don't need a TanStack Query host or the
 * Expo Router stack in the bundle. Empty / loading / populated /
 * with-svg-fallbacks all reviewable on-device.
 */

const SAMPLE_ITEMS: MyRecentCreationsItem[] = [
  {
    id: "1",
    title: "Sleepy bunny in a flower garden",
    previewUrl: null,
    svgUrl: null,
  },
  {
    id: "2",
    title: "Three dragons reading a book",
    previewUrl: null,
    svgUrl: null,
  },
  {
    id: "3",
    title: "Astronaut planting a sunflower",
    previewUrl: null,
    svgUrl: null,
  },
  {
    id: "4",
    title: "Unicorn cooking pancakes",
    previewUrl: null,
    svgUrl: null,
  },
  {
    id: "5",
    title: "Ghost playing the violin",
    previewUrl: null,
    svgUrl: null,
  },
  { id: "6", title: "Rainbow over a forest", previewUrl: null, svgUrl: null },
];

const meta: Meta<typeof MyRecentCreationsView> = {
  title: "Homepage Sections/MyRecentCreations",
  component: MyRecentCreationsView,
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
type Story = StoryObj<typeof MyRecentCreationsView>;

export const Empty: Story = {
  args: {
    items: [],
    isLoading: false,
    onItemPress: action("item-press"),
    onSeeAllPress: action("see-all-press"),
  },
};

export const Loading: Story = {
  args: {
    items: [],
    isLoading: true,
    onItemPress: action("item-press"),
    onSeeAllPress: action("see-all-press"),
  },
};

export const Populated: Story = {
  args: {
    items: SAMPLE_ITEMS,
    isLoading: false,
    onItemPress: action("item-press"),
    onSeeAllPress: action("see-all-press"),
  },
};

export const Two: Story = {
  args: {
    items: SAMPLE_ITEMS.slice(0, 2),
    isLoading: false,
    onItemPress: action("item-press"),
    onSeeAllPress: action("see-all-press"),
  },
};

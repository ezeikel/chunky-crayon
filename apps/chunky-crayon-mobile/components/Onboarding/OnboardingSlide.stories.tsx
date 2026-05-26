import { View, Text } from "react-native";
import { FontAwesomeIcon } from "@fortawesome/react-native-fontawesome";
import {
  faPalette,
  faWandMagicSparkles,
} from "@fortawesome/pro-solid-svg-icons";
import type { Meta, StoryObj } from "@storybook/react-native";
import OnboardingSlide from "./OnboardingSlide";

const meta: Meta<typeof OnboardingSlide> = {
  title: "Onboarding/OnboardingSlide",
  component: OnboardingSlide,
  argTypes: {
    title: { control: "text" },
    description: { control: "text" },
    isActive: { control: "boolean" },
  },
};

export default meta;
type Story = StoryObj<typeof OnboardingSlide>;

export const ColorPaletteSlide: Story = {
  args: {
    title: "Pick your colors",
    description:
      "Tap any colour, then tap a shape to fill it. Magic happens when you mix and match!",
    isActive: true,
    renderVisual: () => (
      <View
        style={{
          alignItems: "center",
          justifyContent: "center",
          padding: 16,
        }}
      >
        <FontAwesomeIcon icon={faPalette} size={120} color="#E46444" />
      </View>
    ),
  },
};

export const MagicBrushSlide: Story = {
  args: {
    title: "Use the magic brush",
    description:
      "Reveal the picture's colours bit by bit. The brush knows which colour to paint where!",
    isActive: true,
    renderVisual: () => (
      <View
        style={{
          alignItems: "center",
          justifyContent: "center",
          padding: 16,
        }}
      >
        <FontAwesomeIcon
          icon={faWandMagicSparkles}
          size={120}
          color="#9B4DCA"
        />
      </View>
    ),
  },
};

export const WithCustomVisual: Story = {
  args: {
    title: "Custom visual",
    description: "renderVisual lets each slide bring its own illustration.",
    isActive: true,
    renderVisual: () => (
      <View
        style={{
          width: 200,
          height: 200,
          backgroundColor: "#FFE9D6",
          borderRadius: 32,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Text style={{ fontSize: 64 }}>🎨</Text>
      </View>
    ),
  },
};

import { View, Text } from "react-native";
import { FontAwesomeIcon } from "@fortawesome/react-native-fontawesome";
import { faHouse, faPalette, faStar } from "@fortawesome/pro-solid-svg-icons";
import { action } from "storybook/actions";
import type { Meta, StoryObj } from "@storybook/react-native";
import type { BottomTabBarButtonProps } from "expo-router/js-tabs";
import HapticTab from "./HapticTab";

// HapticTab is normally rendered inside a React Navigation bottom
// tab bar; in Storybook we render it as a row of stubs that just
// exercise the haptic + press behaviour.
type StubProps = Pick<
  BottomTabBarButtonProps,
  | "accessibilityState"
  | "accessibilityLabel"
  | "testID"
  | "onPress"
  | "onPressIn"
  | "style"
  | "children"
>;

const stubTabProps = (label: string, selected: boolean): StubProps => ({
  accessibilityState: { selected },
  accessibilityLabel: label,
  testID: `tab-${label}`,
  onPress: () => action("press")(label),
  onPressIn: () => action("press-in")(label),
  style: undefined,
  children: (
    <View style={{ alignItems: "center", gap: 4 }}>
      <FontAwesomeIcon
        icon={
          label === "Home" ? faHouse : label === "Coloring" ? faPalette : faStar
        }
        size={22}
        color={selected ? "#E46444" : "#7A6F66"}
      />
      <Text
        style={{
          fontSize: 11,
          color: selected ? "#E46444" : "#7A6F66",
          fontWeight: selected ? "700" : "500",
        }}
      >
        {label}
      </Text>
    </View>
  ),
});

const meta: Meta<typeof HapticTab> = {
  title: "Navigation/HapticTab",
  component: HapticTab,
};

export default meta;
type Story = StoryObj<typeof HapticTab>;

export const TabRow: Story = {
  render: () => (
    <View style={{ flex: 1, justifyContent: "flex-end" }}>
      <View
        style={{
          flexDirection: "row",
          height: 72,
          borderTopWidth: 1,
          borderTopColor: "#EFE2D2",
          backgroundColor: "white",
        }}
      >
        <HapticTab
          {...(stubTabProps("Home", true) as BottomTabBarButtonProps)}
        />
        <HapticTab
          {...(stubTabProps("Coloring", false) as BottomTabBarButtonProps)}
        />
        <HapticTab
          {...(stubTabProps("Stickers", false) as BottomTabBarButtonProps)}
        />
      </View>
    </View>
  ),
};

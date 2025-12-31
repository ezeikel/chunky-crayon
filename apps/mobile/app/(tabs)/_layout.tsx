import FontAwesome6 from "@expo/vector-icons/FontAwesome6";
import {
  NativeTabs,
  Icon,
  Label,
  VectorIcon,
} from "expo-router/unstable-native-tabs";

export default function TabLayout() {
  return (
    <NativeTabs
      iconColor={{
        default: "#9CA3AF",
        selected: "#E46444",
      }}
      labelStyle={{
        default: { color: "#9CA3AF", fontFamily: "TondoTrial-Regular" },
        selected: { color: "#E46444", fontFamily: "TondoTrial-Bold" },
      }}
    >
      <NativeTabs.Trigger name="index">
        <Icon src={<VectorIcon family={FontAwesome6} name="house-chimney" />} />
        <Label>Home</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="my-artwork">
        <Icon src={<VectorIcon family={FontAwesome6} name="heart" />} />
        <Label>My Art</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="challenges">
        <Icon src={<VectorIcon family={FontAwesome6} name="trophy" />} />
        <Label>Challenges</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="stickers">
        <Icon src={<VectorIcon family={FontAwesome6} name="note-sticky" />} />
        <Label>Stickers</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="settings">
        <Icon src={<VectorIcon family={FontAwesome6} name="gear" />} />
        <Label>Settings</Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}

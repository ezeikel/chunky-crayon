import { Tabs } from "expo-router";
import { FontAwesomeIcon } from "@fortawesome/react-native-fontawesome";
import {
  faHouseChimney,
  faHeart,
  faTrophy,
  faNoteSticky,
  faGear,
} from "@fortawesome/pro-solid-svg-icons";
import {
  faHouseChimney as faHouseChimneyLight,
  faHeart as faHeartLight,
  faTrophy as faTrophyLight,
  faNoteSticky as faNoteStickyLight,
  faGear as faGearLight,
} from "@fortawesome/pro-light-svg-icons";

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "#E46444",
        tabBarInactiveTintColor: "#9CA3AF",
        tabBarLabelStyle: {
          fontFamily: "TondoTrial-Regular",
          fontSize: 11,
        },
        tabBarStyle: {
          backgroundColor: "#FFFFFF",
          borderTopColor: "#E5E7EB",
          paddingTop: 8,
          paddingBottom: 8,
          height: 80,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ focused, color }) => (
            <FontAwesomeIcon
              icon={focused ? faHouseChimney : faHouseChimneyLight}
              size={24}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="my-artwork"
        options={{
          title: "My Art",
          tabBarIcon: ({ focused, color }) => (
            <FontAwesomeIcon
              icon={focused ? faHeart : faHeartLight}
              size={24}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="challenges"
        options={{
          title: "Challenges",
          tabBarIcon: ({ focused, color }) => (
            <FontAwesomeIcon
              icon={focused ? faTrophy : faTrophyLight}
              size={24}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="stickers"
        options={{
          title: "Stickers",
          tabBarIcon: ({ focused, color }) => (
            <FontAwesomeIcon
              icon={focused ? faNoteSticky : faNoteStickyLight}
              size={24}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "Settings",
          tabBarIcon: ({ focused, color }) => (
            <FontAwesomeIcon
              icon={focused ? faGear : faGearLight}
              size={24}
              color={color}
            />
          ),
        }}
      />
    </Tabs>
  );
}

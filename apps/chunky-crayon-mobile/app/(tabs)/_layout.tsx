import { View, Pressable, Text, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Tabs, router } from "expo-router";
import { FontAwesomeIcon } from "@fortawesome/react-native-fontawesome";
import {
  faHouseChimney,
  faImages,
  faNoteSticky,
  faWandMagicSparkles,
} from "@fortawesome/pro-solid-svg-icons";
import {
  faHouseChimney as faHouseChimneyLight,
  faImages as faImagesLight,
  faNoteSticky as faNoteStickyLight,
} from "@fortawesome/pro-light-svg-icons";
import { useT } from "@/lib/i18n/useT";
import { tapMedium } from "@/utils/haptics";
import { COLORS, FONTS } from "@/lib/design";

// The three real tabs, in display order around the center Create FAB:
// [Home] [Gallery] · (Create FAB) · [Stickers]. Create is the app's
// primary action — an elevated center button that opens the create
// modal, not a tab screen — so it sits above the flat row.
const TAB_ITEMS = [
  {
    name: "index",
    labelKey: "home",
    icon: faHouseChimney,
    iconLight: faHouseChimneyLight,
  },
  {
    name: "gallery",
    labelKey: "gallery",
    icon: faImages,
    iconLight: faImagesLight,
  },
  {
    name: "stickers",
    labelKey: "stickers",
    icon: faNoteSticky,
    iconLight: faNoteStickyLight,
  },
] as const;

// Minimal shape of the props expo-router's Tabs passes to a custom
// tabBar. We only read the focused route + navigate; typing it locally
// avoids depending on @react-navigation/bottom-tabs (not a direct dep
// under pnpm's strict isolation).
type TabBarProps = {
  state: { index: number; routes: { name: string }[] };
  navigation: { navigate: (name: string) => void };
};

const CustomTabBar = ({ state, navigation }: TabBarProps) => {
  const insets = useSafeAreaInsets();
  const t = useT("mobile.tabs");
  const tButton = useT("mobile.button");

  // Map route name → whether it's the focused tab.
  const focusedRouteName = state.routes[state.index]?.name;

  const renderTab = (item: (typeof TAB_ITEMS)[number]) => {
    const focused = focusedRouteName === item.name;
    const color = focused ? COLORS.crayonOrange : "#9CA3AF";
    return (
      <Pressable
        key={item.name}
        style={styles.tabItem}
        onPress={() => {
          if (!focused) {
            tapMedium();
            navigation.navigate(item.name);
          }
        }}
        accessibilityRole="button"
        accessibilityState={{ selected: focused }}
        accessibilityLabel={t(item.labelKey)}
      >
        <FontAwesomeIcon
          icon={focused ? item.icon : item.iconLight}
          size={24}
          color={color}
        />
        <Text style={[styles.tabLabel, { color }]}>{t(item.labelKey)}</Text>
      </Pressable>
    );
  };

  return (
    <View style={[styles.bar, { paddingBottom: insets.bottom || 8 }]}>
      {renderTab(TAB_ITEMS[0])}
      {renderTab(TAB_ITEMS[1])}

      {/* Elevated center Create FAB — opens the create modal. */}
      <View style={styles.fabSlot}>
        <Pressable
          style={({ pressed }) => [styles.fab, pressed && styles.fabPressed]}
          onPress={() => {
            tapMedium();
            router.push("/create");
          }}
          accessibilityRole="button"
          accessibilityLabel={tButton("createColoringPage")}
        >
          <FontAwesomeIcon
            icon={faWandMagicSparkles}
            size={26}
            color="#FFFFFF"
          />
        </Pressable>
      </View>

      {renderTab(TAB_ITEMS[2])}
    </View>
  );
};

export default function TabLayout() {
  return (
    <Tabs
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tabs.Screen name="index" />
      <Tabs.Screen name="gallery" />
      <Tabs.Screen name="stickers" />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-around",
    backgroundColor: "#FFFFFF",
    borderTopColor: "#E5E7EB",
    borderTopWidth: 1,
    paddingTop: 8,
    paddingHorizontal: 8,
  },
  tabItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingTop: 4,
  },
  tabLabel: {
    fontFamily: FONTS.regular,
    fontSize: 11,
  },
  // Reserve a column for the FAB so the flat tabs stay evenly spaced.
  fabSlot: {
    flex: 1,
    alignItems: "center",
  },
  fab: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: COLORS.crayonOrange,
    alignItems: "center",
    justifyContent: "center",
    // Lift the FAB above the bar.
    marginTop: -22,
    shadowColor: COLORS.crayonOrange,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
    borderWidth: 4,
    borderColor: "#FFFFFF",
  },
  fabPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.95 }],
  },
});

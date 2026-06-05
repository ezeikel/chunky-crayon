import { View, Pressable, Text, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Tabs, router } from "expo-router";
import { FontAwesomeIcon } from "@fortawesome/react-native-fontawesome";
import {
  faHouseChimney,
  faImages,
  faNoteSticky,
  faHeart,
  faWandMagicSparkles,
} from "@fortawesome/pro-solid-svg-icons";
import {
  faHouseChimney as faHouseChimneyLight,
  faImages as faImagesLight,
  faNoteSticky as faNoteStickyLight,
  faHeart as faHeartLight,
} from "@fortawesome/pro-light-svg-icons";
import { useT } from "@/lib/i18n/useT";
import { tapMedium } from "@/utils/haptics";
import { COLORS, FONTS } from "@/lib/design";

// Tab bar reads as: [Home] [Gallery] · (Create FAB) · [Stickers] [My Art].
// Two flat tabs on each side of a centered, elevated Create FAB — the
// app's primary action. The FAB opens the create modal (not a tab
// screen), so it sits raised above the row in a fixed center slot while
// the two flanking pairs share the remaining width equally, keeping the
// FAB dead-centre.
const LEFT_TABS = [
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
] as const;

const RIGHT_TABS = [
  {
    name: "stickers",
    labelKey: "stickers",
    icon: faNoteSticky,
    iconLight: faNoteStickyLight,
  },
  {
    name: "my-artwork",
    labelKey: "myArt",
    icon: faHeart,
    iconLight: faHeartLight,
  },
] as const;

// Minimal shape of the props expo-router's Tabs passes to a custom
// tabBar. We only read the focused route + navigate; typing it locally
// avoids depending on @react-navigation/bottom-tabs (not a direct dep
// under pnpm's strict isolation).
type TabItem = {
  name: string;
  labelKey: string;
  icon: typeof faHouseChimney;
  iconLight: typeof faHouseChimney;
};
type TabBarProps = {
  state: { index: number; routes: { name: string }[] };
  navigation: { navigate: (name: string) => void };
};

const CustomTabBar = ({ state, navigation }: TabBarProps) => {
  const insets = useSafeAreaInsets();
  const t = useT("mobile.tabs");
  const tButton = useT("mobile.button");

  const focusedRouteName = state.routes[state.index]?.name;

  const renderTab = (item: TabItem) => {
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
        {/* Active tab = a soft orange-tinted pill chip behind the icon so the
            current tab reads as "lit up", not just a colour swap. */}
        <View style={[styles.tabChip, focused && styles.tabChipActive]}>
          <FontAwesomeIcon
            icon={focused ? item.icon : item.iconLight}
            size={22}
            color={color}
          />
        </View>
        <Text style={[styles.tabLabel, { color }]} numberOfLines={1}>
          {t(item.labelKey)}
        </Text>
      </Pressable>
    );
  };

  return (
    // Outer transparent wrapper: pads the floating pill in from the screen
    // edges + lifts it above the home indicator so it reads as a hovering
    // pill, not a docked bar.
    <View
      style={[styles.barWrap, { paddingBottom: Math.max(insets.bottom, 12) }]}
      pointerEvents="box-none"
    >
      <View style={styles.bar}>
        <View style={styles.side}>{LEFT_TABS.map(renderTab)}</View>

        {/* Centered Create FAB — raised above the bar in a white cradle
          ring so it reads as attached, not floating. Opens the modal. */}
        <View style={styles.fabSlot}>
          <View style={styles.fabCradle}>
            <Pressable
              style={({ pressed }) => [
                styles.fab,
                pressed && styles.fabPressed,
              ]}
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
        </View>

        <View style={styles.side}>{RIGHT_TABS.map(renderTab)}</View>
      </View>
    </View>
  );
};

export default function TabLayout() {
  return (
    <Tabs
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        // position:absolute → expo-router/react-navigation does NOT reserve
        // tab-bar height in the scene, so each screen renders full-height behind
        // the (absolutely-positioned, transparent) custom pill. transparent bg
        // so the page's cream gradient shows around it (no white strip).
        tabBarStyle: {
          position: "absolute",
          backgroundColor: "transparent",
          borderTopWidth: 0,
          elevation: 0,
        },
      }}
    >
      <Tabs.Screen name="index" />
      <Tabs.Screen name="gallery" />
      <Tabs.Screen name="stickers" />
      <Tabs.Screen name="my-artwork" />
    </Tabs>
  );
}

const FAB_SIZE = 58;
const CRADLE = FAB_SIZE + 12;

const styles = StyleSheet.create({
  // ABSOLUTELY positioned over the screen so the cream page background shows
  // through around the pill (a non-absolute wrapper takes layout height and the
  // tab region renders opaque/white — the "still a bar" look). Screens reserve
  // bottom padding (TAB_BAR_CLEARANCE) so content isn't hidden behind the pill.
  barWrap: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 16,
    paddingTop: 8,
    backgroundColor: "transparent",
  },
  // The floating pill itself — rounded, white, soft shadow, no top border.
  bar: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#FFFFFF",
    borderRadius: 28,
    paddingTop: 10,
    paddingBottom: 10,
    paddingHorizontal: 4,
    borderWidth: 1,
    borderColor: COLORS.bgCreamDark,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 8,
  },
  // Each flanking group takes equal width and splits its two tabs
  // evenly, so the fixed-width center FAB slot lands dead-centre.
  side: {
    flex: 1,
    flexDirection: "row",
  },
  tabItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "flex-start",
    gap: 3,
  },
  // Icon sits in a rounded chip; the active chip gets an orange tint so the
  // current tab reads as "lit", not just a colour change.
  tabChip: {
    width: 48,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  tabChipActive: {
    backgroundColor: "rgba(228, 100, 68, 0.12)",
  },
  tabLabel: {
    fontFamily: FONTS.regular,
    fontSize: 11,
  },
  // Fixed center column the FAB cradle sits in.
  fabSlot: {
    width: CRADLE,
    alignItems: "center",
  },
  // White ring that "cradles" the FAB and breaks the bar's top edge,
  // so the button reads as docked to the bar rather than hovering.
  fabCradle: {
    width: CRADLE,
    height: CRADLE,
    borderRadius: CRADLE / 2,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    marginTop: -(CRADLE / 2),
  },
  fab: {
    width: FAB_SIZE,
    height: FAB_SIZE,
    borderRadius: FAB_SIZE / 2,
    backgroundColor: COLORS.crayonOrange,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: COLORS.crayonOrange,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 8,
  },
  fabPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.95 }],
  },
});

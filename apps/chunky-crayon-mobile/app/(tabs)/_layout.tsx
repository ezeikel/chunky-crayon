import { useState } from "react";
import { View, Pressable, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Tabs } from "expo-router";
import { FontAwesomeIcon } from "@fortawesome/react-native-fontawesome";
// All-duotone icon family (smooth, not sharp) for a consistent, lively bar.
import {
  faHouse,
  faImage,
  faStar,
  faHeart,
  faHatWizard,
} from "@fortawesome/pro-duotone-svg-icons";
import CreateSheet from "@/components/CreateSheet/CreateSheet";
import { useT } from "@/lib/i18n/useT";
import { tapMedium } from "@/utils/haptics";
import { COLORS } from "@/lib/design";

// Tab bar reads as: [Home] [Gallery] · (Create FAB) · [Stickers] [My Art].
// Two flat tabs on each side of a centered, elevated Create FAB — the
// app's primary action. The FAB opens the create modal (not a tab
// screen), so it sits raised above the row in a fixed center slot while
// the two flanking pairs share the remaining width equally, keeping the
// FAB dead-centre.
const LEFT_TABS = [
  { name: "index", labelKey: "home", icon: faHouse },
  { name: "gallery", labelKey: "gallery", icon: faImage },
] as const;

const RIGHT_TABS = [
  // Stickers = a STAR (rewards you earned). The old note/post-it read as
  // "notes" to a kid, not "prizes".
  { name: "stickers", labelKey: "stickers", icon: faStar },
  { name: "my-artwork", labelKey: "myArt", icon: faHeart },
] as const;

// Minimal shape of the props expo-router's Tabs passes to a custom
// tabBar. We only read the focused route + navigate; typing it locally
// avoids depending on @react-navigation/bottom-tabs (not a direct dep
// under pnpm's strict isolation).
type TabItem = {
  name: string;
  labelKey: string;
  icon: typeof faHouse;
};
type TabBarProps = {
  state: { index: number; routes: { name: string }[] };
  navigation: { navigate: (name: string) => void };
  onCreatePress: () => void;
};

const CustomTabBar = ({ state, navigation, onCreatePress }: TabBarProps) => {
  const insets = useSafeAreaInsets();
  const t = useT("mobile.tabs");
  const tButton = useT("mobile.button");

  const focusedRouteName = state.routes[state.index]?.name;

  const renderTab = (item: TabItem) => {
    const focused = focusedRouteName === item.name;
    // Duotone: active = brand orange + a lighter orange fill; inactive = muted
    // grey two-tone. Icon-only (no text label) — the label is the a11y name.
    const primary = focused ? COLORS.crayonOrange : "#9CA3AF";
    const secondary = focused ? COLORS.secondaryOrange : "#C9CDD3";
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
            current tab reads as "lit up". Icon-only — labels removed. */}
        <View style={[styles.tabChip, focused && styles.tabChipActive]}>
          <FontAwesomeIcon
            icon={item.icon}
            size={26}
            color={primary}
            secondaryColor={secondary}
            secondaryOpacity={1}
          />
        </View>
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
          ring so it reads as attached, not floating. Opens the create sheet. */}
        <View style={styles.fabSlot}>
          <View style={styles.fabCradle}>
            <Pressable
              style={({ pressed }) => [
                styles.fab,
                pressed && styles.fabPressed,
              ]}
              onPress={() => {
                tapMedium();
                onCreatePress();
              }}
              accessibilityRole="button"
              accessibilityLabel={tButton("createColoringPage")}
            >
              <FontAwesomeIcon
                icon={faHatWizard}
                size={26}
                color="#FFFFFF"
                secondaryColor="rgba(255,255,255,0.55)"
                secondaryOpacity={1}
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
  // The Create sheet is owned here (always-mounted layout) and toggled by the
  // centre FAB — an in-app ModalBottomSheet, NOT a native modal route, so it
  // matches the app's other sheets (handle, swipe-to-dismiss, cream surface).
  const [createOpen, setCreateOpen] = useState(false);

  return (
    <>
      <Tabs
        tabBar={(props) => (
          <CustomTabBar {...props} onCreatePress={() => setCreateOpen(true)} />
        )}
        screenOptions={{
          headerShown: false,
          // position:absolute → expo-router/react-navigation does NOT reserve
          // tab-bar height in the scene, so each screen renders full-height
          // behind the (absolutely-positioned, transparent) custom pill.
          // transparent bg so the page's cream gradient shows around it.
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
      <CreateSheet isOpen={createOpen} onClose={() => setCreateOpen(false)} />
    </>
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
    justifyContent: "center",
  },
  // Icon-only — sits in a rounded chip; the active chip gets an orange tint so
  // the current tab reads as "lit", not just a colour change.
  tabChip: {
    width: 56,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  tabChipActive: {
    backgroundColor: "rgba(228, 100, 68, 0.12)",
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

import { useState, useEffect } from "react";
import {
  View,
  Text,
  useWindowDimensions,
  StyleSheet,
  ScrollView,
  Pressable,
} from "react-native";
import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { FontAwesomeIcon } from "@fortawesome/react-native-fontawesome";
import {
  faSparkles,
  faTrophy,
  faUserAstronaut,
  faPalette,
  faStar,
  faShapes,
  faImages,
} from "@fortawesome/pro-duotone-svg-icons";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from "react-native-reanimated";
import MyRecentCreations from "@/components/MyRecentCreations";
import CreateColoringImageForm from "@/components/forms/CreateColoringImageForm/CreateColoringImageForm";
import ColoAvatar from "@/components/ColoAvatar";
import AppHeader from "@/components/AppHeader";
import ProfileSwitcher from "@/components/ProfileSwitcher";
import ColoBottomSheet from "@/components/ColoBottomSheet";
import ParentalGate from "@/components/ParentalGate";
import PaywallRouter from "@/components/PaywallRouter";
import { useRefreshEntitlements } from "@/hooks/useEntitlements";
import CategoryRow from "@/components/CategoryRow/CategoryRow";
import SectionHeader from "@/components/SectionHeader/SectionHeader";
import SeeAllButton from "@/components/SeeAllButton/SeeAllButton";
import { useColoContext } from "@/contexts";
import useHeaderData from "@/hooks/useHeaderData";
import { tapMedium } from "@/utils/haptics";
import { track } from "@/utils/analytics";
import { ANALYTICS_EVENTS } from "@/constants/analytics";
import { useT } from "@/lib/i18n/useT";
import { COLORS, FONTS } from "@/lib/design";
import { perfect } from "@/styles";

const padding = 20;

const HomeScreen = () => {
  const t = useT("mobile");
  // useWindowDimensions (not a one-time Dimensions.get) so the grid re-flows
  // when the iPad rotates — Dimensions.get captured at mount goes stale.
  const { width: screenWidth } = useWindowDimensions();
  const [isProfileSwitcherOpen, setIsProfileSwitcherOpen] = useState(false);
  const [isColoSheetOpen, setIsColoSheetOpen] = useState(false);
  // Tapping the credits chip opens the paywall router — TopUpPackModal for
  // subscribers (buy more credits), SubscriptionPaywallModal for non-subs. The
  // actual purchase is parent-gated INSIDE those modals (Kids Category rule), so
  // opening the surface itself needs no gate — same pattern as the create form.
  const [isPaywallOpen, setIsPaywallOpen] = useState(false);
  const refreshEntitlements = useRefreshEntitlements();
  // Settings lives behind a parent-gated corner (not a tab). Tapping the
  // gear opens the gate; passing it routes to the settings stack.
  const [isSettingsGateOpen, setIsSettingsGateOpen] = useState(false);
  const { coloState, isLoading: coloLoading } = useColoContext();
  const headerData = useHeaderData();

  // Float animation for Colo Avatar (matches web's animate-float)
  const floatY = useSharedValue(0);

  useEffect(() => {
    floatY.value = withRepeat(
      withTiming(-10, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
      -1, // infinite
      true, // reverse - creates smooth continuous back-and-forth
    );
  }, []);

  const floatStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: floatY.value }],
  }));

  return (
    <View className="flex-1">
      <LinearGradient colors={["#FDFAF5", "#F5EEE5"]} style={{ flex: 1 }}>
        <AppHeader
          credits={headerData.credits}
          profileName={headerData.profileName}
          avatarId={headerData.avatarId}
          onCreditsPress={() => {
            track(ANALYTICS_EVENTS.PAYWALL_VIEWED, { source: "credits_chip" });
            setIsPaywallOpen(true);
          }}
          onProfilePress={() => setIsProfileSwitcherOpen(true)}
          onChallengePress={() => router.push("/challenges")}
          onStickersPress={() => router.push("/stickers")}
          onSettingsPress={() => setIsSettingsGateOpen(true)}
        />
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingBottom: 128 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Colo Avatar & Greeting */}
          <View className="items-center pt-4">
            <Animated.View style={floatStyle}>
              {/* Tapping Baby Colo plays the wiggle reaction AND opens the Colo
                  growth sheet — the mascot is the discoverable home for Colo now
                  that the header profile pill shows the kid's profile avatar (not
                  Colo). Previously the Colo sheet was triggered by tapping the
                  profile avatar, which read as "tap my face → Colo grows" and
                  felt wrong. */}
              <ColoAvatar
                coloState={coloState}
                size="lg"
                showProgress
                enableTapReactions
                onPress={() => setIsColoSheetOpen(true)}
              />
            </Animated.View>
            {!coloLoading && (
              <Text style={styles.stageName}>{coloState.stageName}</Text>
            )}
            {/* Main greeting */}
            <View style={styles.greetingRow}>
              <FontAwesomeIcon
                icon={faSparkles}
                size={24}
                color="#E46444"
                secondaryColor="#F1AE7E"
                secondaryOpacity={1}
              />
              <Text style={styles.greeting}>
                What do you want to color today?
              </Text>
              <FontAwesomeIcon
                icon={faSparkles}
                size={24}
                color="#E46444"
                secondaryColor="#F1AE7E"
                secondaryOpacity={1}
              />
            </View>

            {/* Colo encouragement message. Trailing FontAwesome duotone icon
                (faPalette / faStar) replaces the old 🎨 / 🌟 emoji — FA over
                emoji in UI copy. Centered row so the icon sits inline after
                the text. */}
            {!coloLoading && coloState.progressToNext && (
              <View style={styles.encouragementRow}>
                <Text style={styles.encouragement}>
                  {coloState.stageName} wants to grow! Save{" "}
                  {coloState.progressToNext.required -
                    coloState.progressToNext.current}{" "}
                  more artworks to evolve!
                </Text>
                <FontAwesomeIcon
                  icon={faPalette}
                  size={14}
                  color={COLORS.crayonOrange}
                />
              </View>
            )}
            {!coloLoading && !coloState.progressToNext && (
              <View style={styles.encouragementRow}>
                <Text style={styles.encouragement}>
                  Your {coloState.stageName} is so proud of you!
                </Text>
                <FontAwesomeIcon
                  icon={faStar}
                  size={14}
                  color={COLORS.yellow}
                />
              </View>
            )}
          </View>

          {/* Create form card — matches web's CreateColoringPageForm card
              exactly: white, rounded, 2px cream-dark border, soft shadow, and
              ONLY the form inside (no in-card heading / subtitle / ready pill /
              decorative blobs). The "What do you want to color today?" greeting
              + Colo mascot above this card are web's page header. */}
          <View
            style={[
              styles.card,
              {
                width: screenWidth - padding * 2,
                alignSelf: "center",
                marginTop: 24,
              },
            ]}
          >
            <CreateColoringImageForm />
          </View>

          {/* Ready-made library FIRST — the easy start. A kid scans the real
              sample-page tiles for what they want to color, no generating
              needed. The create form above stays the co-equal hero; this is
              the lower-effort alternative, surfaced prominently. */}
          <SectionHeader
            title="What do you like?"
            icon={faShapes}
            tint="purple"
            style={styles.librarySectionHeader}
            right={
              <SeeAllButton
                onPress={() => router.push("/categories")}
                accessibilityLabel="See all categories"
              />
            }
          />
          <CategoryRow />

          {/* "Discover more" — the whole-library door (pages the kid hasn't
              seen yet). The header arrow opens the category grid; this opens
              everything. Surfacing it on Home makes the big premade library the
              easy start. Wrapper holds the phone gutter; the button caps to a
              centered pill on iPad. */}
          <View style={styles.discoverMoreWrap}>
            <Pressable
              style={styles.discoverMore}
              onPress={() => {
                tapMedium();
                track(ANALYTICS_EVENTS.BROWSE_ALL_OPENED);
                router.push("/category/all");
              }}
              accessibilityRole="button"
              accessibilityLabel="Discover more coloring pages"
            >
              <FontAwesomeIcon
                icon={faImages}
                size={18}
                color={COLORS.crayonOrange}
                secondaryColor={COLORS.secondaryOrange}
                secondaryOpacity={1}
              />
              <Text style={styles.discoverMoreText}>Discover more</Text>
            </Pressable>
          </View>

          {/* The kid's own pages, below the ready-made library. */}
          <MyRecentCreations />

          {/* Challenges + My Characters as a side-by-side pair of compact,
              icon-led tiles (big icon, ≤2-word label, no adult subtitle) —
              kid-light, consistent with the category-tile language. */}
          <View style={styles.miniTileRow}>
            <Pressable
              style={({ pressed }) => [
                styles.miniTile,
                pressed && styles.miniTilePressed,
              ]}
              onPress={() => {
                tapMedium();
                router.push("/challenges");
              }}
              accessibilityRole="button"
              accessibilityLabel={t("challenges.homeCardTitle")}
            >
              <View style={[styles.miniTileIcon, styles.challengeIconGold]}>
                <FontAwesomeIcon
                  icon={faTrophy}
                  size={32}
                  color="#F59E0B"
                  secondaryColor="#FDD835"
                  secondaryOpacity={1}
                />
              </View>
              <Text style={styles.miniTileLabel}>
                {t("challenges.homeCardTitle")}
              </Text>
            </Pressable>

            <Pressable
              style={({ pressed }) => [
                styles.miniTile,
                pressed && styles.miniTilePressed,
              ]}
              onPress={() => {
                tapMedium();
                router.push("/characters");
              }}
              accessibilityRole="button"
              accessibilityLabel={t("characters.homeCardTitle")}
            >
              <View style={[styles.miniTileIcon, styles.challengeIconPurple]}>
                <FontAwesomeIcon
                  icon={faUserAstronaut}
                  size={32}
                  color="#A65979"
                  secondaryColor="#C18B9D"
                  secondaryOpacity={1}
                />
              </View>
              <Text style={styles.miniTileLabel}>
                {t("characters.homeCardTitle")}
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      </LinearGradient>

      <ProfileSwitcher
        isOpen={isProfileSwitcherOpen}
        onClose={() => setIsProfileSwitcherOpen(false)}
      />

      <ColoBottomSheet
        isOpen={isColoSheetOpen}
        onClose={() => setIsColoSheetOpen(false)}
        coloState={coloState}
      />

      {/* Opened by the header credits chip. Router picks top-up vs subscription
          by entitlement; the buy is parent-gated inside. Refresh entitlements on
          a successful purchase so the chip's credit count updates. */}
      <PaywallRouter
        visible={isPaywallOpen}
        onClose={() => setIsPaywallOpen(false)}
        onSuccess={() => {
          setIsPaywallOpen(false);
          refreshEntitlements();
        }}
      />

      {/* Settings is parent-gated: the gear opens this gate, passing it
          routes to the settings stack. Keeps kids out of the account /
          subscription surface. */}
      <ParentalGate
        visible={isSettingsGateOpen}
        onClose={() => setIsSettingsGateOpen(false)}
        onSuccess={() => {
          setIsSettingsGateOpen(false);
          router.push("/settings");
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  stageName: {
    color: "#E46444",
    fontSize: 14,
    marginTop: 8,
    fontFamily: "TondoTrial-Bold",
  },
  librarySectionHeader: {
    paddingHorizontal: padding,
    marginTop: 20,
    marginBottom: 4,
  },
  // "Discover more" whole-library door under the category row (mirrors the
  // Gallery tab's button so the affordance is identical across surfaces).
  // Wrapper gives the phone-edge gutter (paddingHorizontal) so the button
  // itself can use width:100% + maxWidth + alignSelf:center to be full-width on
  // phone yet a centered capped pill on iPad (echoes the centered tab bar).
  discoverMoreWrap: {
    paddingHorizontal: padding,
  },
  discoverMore: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 12,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: COLORS.white,
    ...perfect.boxShadow,
    width: "100%",
    maxWidth: 480,
    alignSelf: "center",
  },
  discoverMoreText: {
    fontFamily: FONTS.bold,
    fontSize: 15,
    color: COLORS.textPrimary,
  },
  // Challenges + My Characters: a side-by-side pair of compact, icon-led tiles
  // (big icon + ≤2-word label, no adult subtitle) — kid-light, consistent with
  // the category-tile language.
  miniTileRow: {
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: padding,
    marginTop: 24,
  },
  miniTile: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    paddingVertical: 18,
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderColor: COLORS.bgCreamDark,
    shadowColor: "#E46444",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  miniTilePressed: {
    opacity: 0.9,
    transform: [{ scale: 0.97 }],
  },
  miniTileIcon: {
    width: 60,
    height: 60,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  challengeIconGold: {
    backgroundColor: "rgba(245, 158, 11, 0.14)",
  },
  challengeIconPurple: {
    backgroundColor: "rgba(193, 139, 157, 0.18)",
  },
  miniTileLabel: {
    fontFamily: "TondoTrial-Bold",
    fontSize: 15,
    color: COLORS.textPrimary,
  },
  greetingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 12,
    marginBottom: 8,
    paddingHorizontal: 16,
  },
  greeting: {
    fontSize: 22,
    color: "#374151",
    textAlign: "center",
    fontFamily: "TondoTrial-Bold",
    flexShrink: 1,
  },
  encouragementRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    flexWrap: "wrap",
    gap: 6,
    paddingHorizontal: 24,
    marginTop: 4,
  },
  encouragement: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
    fontFamily: "TondoTrial-Regular",
    flexShrink: 1,
  },
  // Matches web's CreateColoringPageForm card:
  //   bg-white rounded-2xl shadow-card border-2 border-paper-cream-dark p-6
  // shadow-card = a soft crayon-orange shadow at low opacity (web uses 0.08),
  // border = paper-cream-dark (#F4EEE6 = COLORS.bgCreamDark).
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 24,
    borderWidth: 2,
    borderColor: COLORS.bgCreamDark,
    shadowColor: "#E46444",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
});

export default HomeScreen;

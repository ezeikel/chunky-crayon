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
  faChevronRight,
  faUserAstronaut,
  faPalette,
  faStar,
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
import { useColoContext } from "@/contexts";
import useHeaderData from "@/hooks/useHeaderData";
import { useT } from "@/lib/i18n/useT";
import { COLORS } from "@/lib/design";

const padding = 20;

const HomeScreen = () => {
  const t = useT("mobile");
  // useWindowDimensions (not a one-time Dimensions.get) so the grid re-flows
  // when the iPad rotates — Dimensions.get captured at mount goes stale.
  const { width: screenWidth } = useWindowDimensions();
  const [isProfileSwitcherOpen, setIsProfileSwitcherOpen] = useState(false);
  const [isColoSheetOpen, setIsColoSheetOpen] = useState(false);
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
          onColoPress={() => setIsColoSheetOpen(true)}
          onProfilePress={() => setIsProfileSwitcherOpen(true)}
          onChallengePress={() => router.push("/challenges")}
          onStickersPress={() => router.push("/stickers")}
          onSettingsPress={() => setIsSettingsGateOpen(true)}
        />
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Colo Avatar & Greeting */}
          <View className="items-center pt-4">
            <Animated.View style={floatStyle}>
              <ColoAvatar
                coloState={coloState}
                size="lg"
                showProgress
                enableTapReactions
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

          {/* Recent creations strip — kid's active workbench.
              Matches web's logged-in dashboard composition: greeting +
              create + recent creations, deliberately minimal/kid-focused.
              Browse content (today's pick / challenge / collections) lives
              on the Gallery tab, not here — same split as web, where the
              feed-like content sits on browse routes, not the dashboard. */}
          <MyRecentCreations />

          {/* Challenges card — Challenges folds into Home (no longer a
              tab). Taps through to the challenges route. */}
          <Pressable
            style={({ pressed }) => [
              styles.challengeCard,
              {
                width: screenWidth - padding * 2,
                alignSelf: "center",
              },
              pressed && styles.challengeCardPressed,
            ]}
            onPress={() => router.push("/challenges")}
          >
            <View style={[styles.challengeIcon, styles.challengeIconGold]}>
              <FontAwesomeIcon
                icon={faTrophy}
                size={30}
                color="#F59E0B"
                secondaryColor="#FDD835"
                secondaryOpacity={1}
              />
            </View>
            <View style={styles.challengeText}>
              <Text style={styles.challengeTitle}>
                {t("challenges.homeCardTitle")}
              </Text>
              <Text style={styles.challengeSubtitle}>
                {t("challenges.homeCardSubtitle")}
              </Text>
            </View>
            <FontAwesomeIcon
              icon={faChevronRight}
              size={16}
              color={COLORS.crayonOrange}
            />
          </Pressable>

          {/* My Characters card — Characters surface lives off Home (not a
              tab). Taps through to the characters route. */}
          <Pressable
            style={({ pressed }) => [
              styles.challengeCard,
              {
                width: screenWidth - padding * 2,
                alignSelf: "center",
                marginTop: 12,
              },
              pressed && styles.challengeCardPressed,
            ]}
            onPress={() => router.push("/characters")}
          >
            <View style={[styles.challengeIcon, styles.challengeIconPurple]}>
              <FontAwesomeIcon
                icon={faUserAstronaut}
                size={30}
                color="#A65979"
                secondaryColor="#C18B9D"
                secondaryOpacity={1}
              />
            </View>
            <View style={styles.challengeText}>
              <Text style={styles.challengeTitle}>
                {t("characters.homeCardTitle")}
              </Text>
              <Text style={styles.challengeSubtitle}>
                {t("characters.homeCardSubtitle")}
              </Text>
            </View>
            <FontAwesomeIcon
              icon={faChevronRight}
              size={16}
              color={COLORS.lavender}
            />
          </Pressable>
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
  challengeCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    marginTop: 20,
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: COLORS.bgCreamDark,
    shadowColor: "#E46444",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  challengeCardPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  // Bigger, bolder icon medallion. Per-card tint (gold / purple) makes each
  // section pop instead of every row sharing one pale orange circle.
  challengeIcon: {
    width: 56,
    height: 56,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  challengeIconGold: {
    backgroundColor: "rgba(245, 158, 11, 0.14)",
  },
  challengeIconPurple: {
    backgroundColor: "rgba(193, 139, 157, 0.18)",
  },
  challengeText: {
    flex: 1,
  },
  challengeTitle: {
    fontFamily: "TondoTrial-Bold",
    fontSize: 18,
    color: COLORS.textPrimary,
  },
  challengeSubtitle: {
    fontFamily: "TondoTrial-Regular",
    fontSize: 13,
    color: "#9CA3AF",
    marginTop: 2,
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

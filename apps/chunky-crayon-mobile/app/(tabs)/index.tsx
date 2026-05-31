import { useState, useEffect } from "react";
import {
  View,
  Text,
  Dimensions,
  StyleSheet,
  ScrollView,
  Pressable,
} from "react-native";
import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { FontAwesomeIcon } from "@fortawesome/react-native-fontawesome";
import {
  faWandMagicSparkles,
  faClock,
  faSparkles,
  faTrophy,
  faChevronRight,
  faUserAstronaut,
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

const padding = 20;

const HomeScreen = () => {
  const t = useT("mobile");
  const [screenWidth] = useState(Dimensions.get("window").width);
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

            {/* Colo encouragement message */}
            {!coloLoading && coloState.progressToNext && (
              <Text style={styles.encouragement}>
                {coloState.stageName} wants to grow! Save{" "}
                {coloState.progressToNext.required -
                  coloState.progressToNext.current}{" "}
                more artworks to evolve! 🎨
              </Text>
            )}
            {!coloLoading && !coloState.progressToNext && (
              <Text style={styles.encouragement}>
                Your {coloState.stageName} is so proud of you! 🌟
              </Text>
            )}
          </View>

          {/* Create Magic Card */}
          <View
            style={[
              styles.card,
              {
                width: screenWidth - padding * 2,
                alignSelf: "center",
                marginTop: 24,
                gap: 20,
              },
            ]}
          >
            {/* Decorative blur circles */}
            <View style={styles.topRightBlur} />
            <View style={styles.bottomLeftBlur} />

            {/* Header with icon */}
            <View className="items-center z-10">
              <View className="flex-row items-center justify-center gap-2 mb-3">
                <FontAwesomeIcon
                  icon={faWandMagicSparkles}
                  size={24}
                  color="#E46444"
                  secondaryColor="#F1AE7E"
                  secondaryOpacity={1}
                />
                <Text style={styles.headerTitle}>Create Magic!</Text>
              </View>
              <Text style={styles.headerSubtitle}>
                Type, talk, or snap a photo!
              </Text>
            </View>

            {/* Time notice */}
            <View style={styles.timeNotice}>
              <FontAwesomeIcon
                icon={faClock}
                size={14}
                color="#E46444"
                secondaryColor="#F1AE7E"
                secondaryOpacity={1}
              />
              <Text style={styles.timeNoticeText}>
                Ready in about 30 seconds
              </Text>
            </View>

            {/* Form */}
            <View style={styles.zIndex}>
              <CreateColoringImageForm />
            </View>
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
            <View style={styles.challengeIcon}>
              <FontAwesomeIcon
                icon={faTrophy}
                size={22}
                color="#E46444"
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
            <FontAwesomeIcon icon={faChevronRight} size={16} color="#9CA3AF" />
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
            <View style={styles.challengeIcon}>
              <FontAwesomeIcon
                icon={faUserAstronaut}
                size={22}
                color="#E46444"
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
            <FontAwesomeIcon icon={faChevronRight} size={16} color="#9CA3AF" />
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
    gap: 14,
    marginTop: 20,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    paddingVertical: 16,
    paddingHorizontal: 18,
    shadowColor: "#E46444",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  challengeCardPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.99 }],
  },
  challengeIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(228, 100, 68, 0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  challengeText: {
    flex: 1,
  },
  challengeTitle: {
    fontFamily: "TondoTrial-Bold",
    fontSize: 17,
    color: "#374151",
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
  encouragement: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
    paddingHorizontal: 24,
    marginTop: 4,
    fontFamily: "TondoTrial-Regular",
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 24,
    borderWidth: 2,
    borderColor: "#FFF5EB",
    shadowColor: "#E46444",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 6,
    overflow: "hidden",
  },
  topRightBlur: {
    position: "absolute",
    top: -48,
    right: -48,
    width: 96,
    height: 96,
    backgroundColor: "rgba(255, 138, 101, 0.15)",
    borderRadius: 48,
  },
  bottomLeftBlur: {
    position: "absolute",
    bottom: -32,
    left: -32,
    width: 80,
    height: 80,
    backgroundColor: "rgba(20, 184, 166, 0.15)",
    borderRadius: 40,
  },
  zIndex: {
    zIndex: 10,
  },
  headerTitle: {
    fontSize: 24,
    fontFamily: "TondoTrial-Bold",
    color: "#E46444",
  },
  headerSubtitle: {
    fontSize: 16,
    fontFamily: "TondoTrial-Regular",
    color: "#374151",
    textAlign: "center",
    lineHeight: 22,
  },
  timeNotice: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: "rgba(251, 191, 36, 0.2)",
    borderRadius: 12,
    zIndex: 10,
  },
  timeNoticeText: {
    fontSize: 14,
    fontFamily: "TondoTrial-Regular",
    color: "#6B7280",
  },
});

export default HomeScreen;

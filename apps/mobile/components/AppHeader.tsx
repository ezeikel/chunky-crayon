import { View, Text, StyleSheet, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { FontAwesomeIcon } from "@fortawesome/react-native-fontawesome";
import {
  faCoins,
  faTrophy,
  faNoteSticky,
  faChevronDown,
} from "@fortawesome/pro-solid-svg-icons";
import ColoAvatar from "./ColoAvatar/ColoAvatar";
import type { ColoStage } from "@/lib/colo/types";

type HeaderIndicatorProps = {
  icon: typeof faCoins;
  iconColor: string;
  value: string | number;
  onPress?: () => void;
};

const HeaderIndicator = ({
  icon,
  iconColor,
  value,
  onPress,
}: HeaderIndicatorProps) => (
  <Pressable
    style={({ pressed }) => [
      styles.indicator,
      pressed && styles.indicatorPressed,
    ]}
    onPress={onPress}
    disabled={!onPress}
  >
    <FontAwesomeIcon icon={icon} size={14} color={iconColor} />
    <Text style={styles.indicatorValue}>{value}</Text>
  </Pressable>
);

type ProfileSwitcherProps = {
  name: string;
  coloStage: ColoStage;
  onPress?: () => void;
};

const ProfileSwitcher = ({
  name,
  coloStage,
  onPress,
}: ProfileSwitcherProps) => (
  <Pressable
    style={({ pressed }) => [
      styles.profileSwitcher,
      pressed && styles.profileSwitcherPressed,
    ]}
    onPress={onPress}
  >
    <View style={styles.avatarContainer}>
      <ColoAvatar stage={coloStage} size="xs" enableTapReactions={false} />
    </View>
    <Text style={styles.profileName} numberOfLines={1}>
      {name}
    </Text>
    <FontAwesomeIcon icon={faChevronDown} size={10} color="#9CA3AF" />
  </Pressable>
);

type AppHeaderProps = {
  credits?: number;
  challengeProgress?: number; // 0-100 percentage
  stickerCount?: number;
  profileName?: string;
  coloStage?: ColoStage;
  onCreditsPress?: () => void;
  onChallengePress?: () => void;
  onStickersPress?: () => void;
  onProfilePress?: () => void;
};

const AppHeader = ({
  credits = 0,
  challengeProgress = 0,
  stickerCount = 0,
  profileName = "Artist",
  coloStage = 1,
  onCreditsPress,
  onChallengePress,
  onStickersPress,
  onProfilePress,
}: AppHeaderProps) => {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingTop: insets.top + 8 }]}>
      {/* Left side - Indicators */}
      <View style={styles.indicatorsContainer}>
        <HeaderIndicator
          icon={faCoins}
          iconColor="#F59E0B"
          value={credits}
          onPress={onCreditsPress}
        />

        {/* Challenge Progress Ring */}
        <Pressable
          style={({ pressed }) => [
            styles.challengeRing,
            pressed && styles.indicatorPressed,
          ]}
          onPress={onChallengePress}
        >
          <View style={styles.challengeRingOuter}>
            <View
              style={[
                styles.challengeRingProgress,
                {
                  transform: [
                    { rotate: `${(challengeProgress / 100) * 360}deg` },
                  ],
                },
              ]}
            />
            <View style={styles.challengeRingInner}>
              <FontAwesomeIcon icon={faTrophy} size={12} color="#E46444" />
            </View>
          </View>
        </Pressable>

        <HeaderIndicator
          icon={faNoteSticky}
          iconColor="#8B5CF6"
          value={stickerCount}
          onPress={onStickersPress}
        />
      </View>

      {/* Right side - Profile Switcher */}
      <ProfileSwitcher
        name={profileName}
        coloStage={coloStage}
        onPress={onProfilePress}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 8,
    backgroundColor: "#FDFAF5",
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  indicatorsContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  indicator: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  indicatorPressed: {
    opacity: 0.7,
    transform: [{ scale: 0.98 }],
  },
  indicatorValue: {
    fontFamily: "TondoTrial-Bold",
    fontSize: 14,
    color: "#374151",
  },
  challengeRing: {
    padding: 4,
  },
  challengeRingOuter: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#FEE2E2",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  challengeRingProgress: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 16,
    borderWidth: 3,
    borderColor: "#E46444",
    borderLeftColor: "transparent",
    borderBottomColor: "transparent",
  },
  challengeRingInner: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  profileSwitcher: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    paddingLeft: 4,
    paddingRight: 10,
    paddingVertical: 4,
    borderRadius: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  profileSwitcherPressed: {
    opacity: 0.7,
    transform: [{ scale: 0.98 }],
  },
  avatarContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  profileName: {
    fontFamily: "TondoTrial-Bold",
    fontSize: 14,
    color: "#374151",
    maxWidth: 80,
  },
});

export default AppHeader;

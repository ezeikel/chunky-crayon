import { View, Text, StyleSheet, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { FontAwesomeIcon } from "@fortawesome/react-native-fontawesome";
import {
  faCoins,
  faTrophy,
  faNoteSticky,
  faChevronDown,
  faGear,
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
  /**
   * Backwards-compat — when only `onPress` is given, the whole pill
   * triggers it. Newer call sites pass `onColoPress` + `onProfilePress`
   * separately so the Colo avatar opens the Colo detail sheet while
   * the name+chevron half opens the profile switcher.
   */
  onPress?: () => void;
  onColoPress?: () => void;
  onProfilePress?: () => void;
};

const ProfileSwitcher = ({
  name,
  coloStage,
  onPress,
  onColoPress,
  onProfilePress,
}: ProfileSwitcherProps) => {
  // If callers pass split handlers, render two distinct tap zones
  // inside the shared pill chrome. Otherwise fall back to the old
  // single-Pressable shape.
  const hasSplit = onColoPress != null || onProfilePress != null;

  if (!hasSplit) {
    return (
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
  }

  return (
    <View style={styles.profileSwitcher}>
      <Pressable
        style={({ pressed }) => [
          styles.coloTap,
          pressed && styles.profileSwitcherPressed,
        ]}
        onPress={onColoPress}
        accessibilityLabel="Open Colo details"
      >
        <ColoAvatar stage={coloStage} size="xs" enableTapReactions={false} />
      </Pressable>
      <Pressable
        style={({ pressed }) => [
          styles.profileTap,
          pressed && styles.profileSwitcherPressed,
        ]}
        onPress={onProfilePress}
        accessibilityLabel={`Switch profile, current: ${name}`}
      >
        <Text style={styles.profileName} numberOfLines={1}>
          {name}
        </Text>
        <FontAwesomeIcon icon={faChevronDown} size={10} color="#9CA3AF" />
      </Pressable>
    </View>
  );
};

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
  /**
   * Optional. When given, tapping the Colo avatar inside the profile
   * pill opens the Colo detail sheet (instead of falling through to
   * onProfilePress). Web's kid-friendly Colo dropdown maps to this
   * on mobile — see ColoBottomSheet.
   */
  onColoPress?: () => void;
  /**
   * Optional. When given, renders a parent-gated settings gear after
   * the profile pill (Settings lives behind this corner, not a tab).
   * The handler is responsible for the parental gate before opening.
   */
  onSettingsPress?: () => void;
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
  onColoPress,
  onSettingsPress,
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

      {/* Right side - Profile Switcher + parent-gated Settings gear.
          Split tap zones when callers give onColoPress (Colo avatar
          opens Colo detail sheet, rest opens profile switcher). Falls
          back to single onPress otherwise. The gear only renders when
          onSettingsPress is given (Settings lives behind this corner,
          not a tab); the handler gates entry. */}
      <View style={styles.rightSide}>
        <ProfileSwitcher
          name={profileName}
          coloStage={coloStage}
          onPress={onColoPress == null ? onProfilePress : undefined}
          onColoPress={onColoPress}
          onProfilePress={onColoPress == null ? undefined : onProfilePress}
        />
        {onSettingsPress && (
          <Pressable
            style={({ pressed }) => [
              styles.gearButton,
              pressed && styles.indicatorPressed,
            ]}
            onPress={onSettingsPress}
            accessibilityLabel="Settings"
            hitSlop={8}
          >
            <FontAwesomeIcon icon={faGear} size={18} color="#9CA3AF" />
          </Pressable>
        )}
      </View>
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
  rightSide: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  gearButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
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
  // Split-mode tap zones — sit inside the profile pill chrome so the
  // pill still looks like one element while reading as two tap targets.
  coloTap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  profileTap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 4,
    paddingVertical: 4,
  },
  profileName: {
    fontFamily: "TondoTrial-Bold",
    fontSize: 14,
    color: "#374151",
    maxWidth: 80,
  },
});

export default AppHeader;

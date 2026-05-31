import { View, Text, StyleSheet, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { FontAwesomeIcon } from "@fortawesome/react-native-fontawesome";
import { faCoins, faUserShield } from "@fortawesome/pro-duotone-svg-icons";
import ProfileAvatar from "./ProfileAvatar/ProfileAvatar";
import { useT } from "@/lib/i18n/useT";
import { COLORS, FONTS } from "@/lib/design";
import type { ColoStage } from "@/lib/colo/types";

/**
 * Minimal kids (ages 3-8) status strip.
 *
 * Just two things, nothing else: a vivid credit-coin chip on the left
 * and a chunky profile pill on the right (the kid's chosen profile
 * avatar + their name in bold, no chevron). Stickers and the
 * challenge/trophy ring were removed from the header by product
 * decision — the icon carries the meaning, the number is secondary,
 * and every tap target clears 44pt. A clear-but-calm "Grown-ups" door
 * sits in the corner only when a settings handler is given.
 */

type CreditsChipProps = {
  value: number;
  onPress?: () => void;
};

// Vivid crayon-coin chip. Reads as intentional even at 0 — the coin is
// the hero, the number rides shotgun. Whole chip is a ≥44pt tap target.
const CreditsChip = ({ value, onPress }: CreditsChipProps) => (
  <Pressable
    style={({ pressed }) => [styles.creditsChip, pressed && styles.pressed]}
    onPress={onPress}
    disabled={!onPress}
    hitSlop={8}
    accessibilityRole="button"
    accessibilityLabel={`${value} crayon coins`}
  >
    <View style={styles.coinBadge}>
      <FontAwesomeIcon
        icon={faCoins}
        size={24}
        color={COLORS.white}
        secondaryColor="rgba(255,255,255,0.55)"
      />
    </View>
    <Text style={styles.creditsValue}>{value}</Text>
  </Pressable>
);

type ProfilePillProps = {
  name: string;
  avatarId: string;
  /**
   * Backwards-compat — when only `onPress` is given, the whole pill
   * triggers it. Newer call sites pass `onColoPress` + `onProfilePress`
   * separately so the avatar half opens the Colo detail sheet while the
   * name half opens the profile switcher. No chevron — the avatar +
   * name read as a tappable identity on their own.
   */
  onPress?: () => void;
  onColoPress?: () => void;
  onProfilePress?: () => void;
};

const ProfilePill = ({
  name,
  avatarId,
  onPress,
  onColoPress,
  onProfilePress,
}: ProfilePillProps) => {
  // Split-tap when callers give separate handlers; otherwise the whole
  // chunky pill is one big target (the old single-Pressable shape).
  const hasSplit = onColoPress != null || onProfilePress != null;

  if (!hasSplit) {
    return (
      <Pressable
        style={({ pressed }) => [styles.profilePill, pressed && styles.pressed]}
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={`Profile: ${name}`}
      >
        <ProfileAvatar avatarId={avatarId} name={name} size="sm" />
        <Text style={styles.profileName} numberOfLines={1}>
          {name}
        </Text>
      </Pressable>
    );
  }

  return (
    <View style={styles.profilePill}>
      <Pressable
        style={({ pressed }) => [styles.coloTap, pressed && styles.pressed]}
        onPress={onColoPress}
        accessibilityRole="button"
        accessibilityLabel="Open Colo"
      >
        <ProfileAvatar avatarId={avatarId} name={name} size="sm" />
      </Pressable>
      <Pressable
        style={({ pressed }) => [styles.nameTap, pressed && styles.pressed]}
        onPress={onProfilePress}
        accessibilityRole="button"
        accessibilityLabel={`Switch profile, current: ${name}`}
      >
        <Text style={styles.profileName} numberOfLines={1}>
          {name}
        </Text>
      </Pressable>
    </View>
  );
};

type AppHeaderProps = {
  credits?: number;
  profileName?: string;
  /** The active profile's avatar id (dragon / unicorn / … — see lib/avatars). */
  avatarId?: string;
  onCreditsPress?: () => void;
  onProfilePress?: () => void;
  /**
   * Optional. When given, tapping the Colo avatar inside the profile
   * pill opens the Colo detail sheet (instead of falling through to
   * onProfilePress). Web's kid-friendly Colo dropdown maps to this on
   * mobile — see ColoBottomSheet.
   */
  onColoPress?: () => void;
  /**
   * Optional. When given, renders a low-key "For Grown-ups" corner
   * (shield-person icon) after the profile pill — the parent door for
   * settings/account, deliberately not a gear and not a tab so kids
   * aren't drawn to it (matches Spotify Kids' "For grown-ups" pattern).
   * The handler is responsible for the parental gate before opening.
   */
  onSettingsPress?: () => void;

  // ─── Deprecated / ignored (kept for backward compat with call sites) ───
  // The header is now a minimal status strip (credits + profile only).
  // The challenge/trophy ring + sticker chip were removed, and the
  // profile pill shows the profile AVATAR (not Colo). These remain
  // optional + ignored so the existing call sites don't churn; remove
  // once every call site stops passing them.
  /** @deprecated Header shows the profile avatar now, not Colo stage. */
  coloStage?: ColoStage;
  /** @deprecated Removed from the header. Accepted but ignored. */
  challengeProgress?: number;
  /** @deprecated Removed from the header. Accepted but ignored. */
  stickerCount?: number;
  /** @deprecated Removed from the header. Accepted but ignored. */
  onChallengePress?: () => void;
  /** @deprecated Removed from the header. Accepted but ignored. */
  onStickersPress?: () => void;
};

const AppHeader = ({
  credits = 0,
  profileName = "Artist",
  avatarId = "ice-cream",
  onCreditsPress,
  onProfilePress,
  onColoPress,
  onSettingsPress,
}: AppHeaderProps) => {
  const insets = useSafeAreaInsets();
  const t = useT("mobile.header");

  return (
    <View style={[styles.container, { paddingTop: insets.top + 8 }]}>
      {/* LEFT — single vivid credits chip */}
      <CreditsChip value={credits} onPress={onCreditsPress} />

      {/* RIGHT — profile pill + low-key "For Grown-ups" corner.
          Split tap zones when callers give onColoPress (Colo avatar
          opens Colo detail sheet, name opens profile switcher). Falls
          back to a single onPress otherwise. The grown-ups door only
          renders when onSettingsPress is given; the handler gates it. */}
      <View style={styles.rightSide}>
        <ProfilePill
          name={profileName}
          avatarId={avatarId}
          onPress={onColoPress == null ? onProfilePress : undefined}
          onColoPress={onColoPress}
          onProfilePress={onColoPress == null ? undefined : onProfilePress}
        />
        {onSettingsPress && (
          <Pressable
            style={({ pressed }) => [
              styles.grownUpsButton,
              pressed && styles.pressed,
            ]}
            onPress={onSettingsPress}
            accessibilityRole="button"
            accessibilityLabel={t("forGrownUps")}
            hitSlop={8}
          >
            <FontAwesomeIcon
              icon={faUserShield}
              size={20}
              color={COLORS.textSecondary}
            />
            <Text style={styles.grownUpsLabel}>{t("grownUps")}</Text>
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
    backgroundColor: COLORS.bgCream,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },

  // Shared press feedback — gentle squish, kid-satisfying.
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.96 }],
  },

  // ─── Credits chip (left) ───
  // Chunky rounded pill on white, vivid orange coin badge leading the
  // number. The coin badge keeps the icon "alive" even at 0.
  creditsChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    minHeight: 44,
    paddingLeft: 5,
    paddingRight: 16,
    paddingVertical: 5,
    borderRadius: 24,
    backgroundColor: COLORS.white,
    shadowColor: COLORS.crayonOrangeDark,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 4,
    elevation: 2,
  },
  coinBadge: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: COLORS.crayonOrange,
    alignItems: "center",
    justifyContent: "center",
  },
  creditsValue: {
    fontFamily: FONTS.bold,
    fontSize: 20,
    color: COLORS.textPrimary,
    includeFontPadding: false,
  },

  // ─── Right cluster ───
  rightSide: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  // ─── Profile pill (right) ───
  // Chunky rounded pill, avatar (40pt wrapper) + bold name, no chevron.
  // Whole pill clears 44pt; the avatar evolves by stage as the progress
  // indicator.
  profilePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    minHeight: 48,
    paddingLeft: 4,
    paddingRight: 14,
    paddingVertical: 4,
    borderRadius: 28,
    backgroundColor: COLORS.white,
    shadowColor: COLORS.textPrimary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  // Split-mode tap zones — sit inside the pill chrome so it still reads
  // as one element while exposing two targets. ColoAvatar's own 40pt
  // wrapper keeps the avatar half a comfortable kid target.
  coloTap: {
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 20,
  },
  nameTap: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 44,
    paddingHorizontal: 6,
    justifyContent: "center",
  },
  profileName: {
    fontFamily: FONTS.bold,
    fontSize: 17,
    color: COLORS.textPrimary,
    maxWidth: 96,
    includeFontPadding: false,
  },

  // ─── "For Grown-ups" door ───
  // A clear, labelled pill — shield + "For Grown-ups" — so an adult can
  // actually find it (the bare lone icon read like an accident). Still
  // calm vs the kid chips: muted neutral fill + secondary text, no playful
  // colour, so it reads as a deliberate parent door, not a fun tappable.
  grownUpsButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    minHeight: 44,
    paddingHorizontal: 12,
    borderRadius: 22,
    backgroundColor: "rgba(67, 52, 45, 0.06)",
    justifyContent: "center",
  },
  grownUpsLabel: {
    fontFamily: FONTS.bold,
    fontSize: 15,
    color: COLORS.textSecondary,
    includeFontPadding: false,
  },
});

export default AppHeader;

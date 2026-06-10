import { useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import { Image } from "expo-image";
import { getAvatar, getInitials } from "@/lib/avatars";
import { useT } from "@/lib/i18n/useT";
import { COLORS, FONTS } from "@/lib/design";

/**
 * Profile avatar render. Mobile port of
 * apps/chunky-crayon-web/components/ProfileAvatar/ProfileAvatar.tsx.
 *
 * An illustrated tile sitting on a soft tinted circular background.
 * The PNG comes from the bundled `assets/profile-avatars/` dir (not
 * R2 like the web app) — fast first-paint, works offline, no network
 * dependency for a static asset that's never user-uploaded.
 *
 * `expo-image` over RN's default Image because it ships proper
 * SDWebImage / Coil caching, decode-on-background-thread, and a
 * smoother fade-in than the RN default.
 *
 * Falls back to a grey initials chip when the avatarId has no
 * catalog match (unknown id) or — extremely rarely — the bundled
 * asset fails to decode.
 *
 * The illustration is pulled in from the circular edge by ~12% on
 * each side so tall features (unicorn horn, dragon spikes, ghost
 * tendrils) stay inside the inscribed circle when the round mask
 * clips. The 256² source PNGs use the full square (subject filling
 * edge to edge) so without the safety margin the four corners get
 * clipped by the rounded mask.
 */

type AvatarSize = "xs" | "sm" | "md" | "lg" | "xl";

type ProfileAvatarProps = {
  avatarId: string;
  /** Used as a11y label + initials fallback. */
  name?: string;
  size?: AvatarSize;
  /** Adds a white ring around the avatar (used on selected state). */
  showBorder?: boolean;
};

const SIZE_PX: Record<AvatarSize, number> = {
  xs: 32,
  sm: 40,
  md: 64,
  lg: 96,
  xl: 128,
};

const TEXT_SIZE: Record<AvatarSize, number> = {
  xs: 12,
  sm: 14,
  md: 18,
  lg: 24,
  xl: 30,
};

const BORDER_WIDTH: Record<AvatarSize, number> = {
  xs: 2,
  sm: 2,
  md: 4,
  lg: 4,
  xl: 6,
};

const ProfileAvatar = ({
  avatarId,
  name,
  size = "md",
  showBorder = false,
}: ProfileAvatarProps) => {
  const t = useT("mobile.profileAvatar");
  // Avatar display names come from the catalog (slug-keyed); translate at the
  // render site via a slug -> key lookup (mobile.avatar.<id>) rather than
  // editing the shared avatar catalog.
  const tAvatar = useT("mobile.avatar");
  const avatar = getAvatar(avatarId);
  const initials = name ? getInitials(name) : "?";
  const [imageError, setImageError] = useState(false);

  const dimension = SIZE_PX[size];
  const padding = Math.round(dimension * 0.12); // 12% safety margin
  const ring = showBorder ? BORDER_WIDTH[size] : 0;

  const wrapperStyle = {
    width: dimension,
    height: dimension,
    borderRadius: dimension / 2,
    borderWidth: ring,
    borderColor: COLORS.white,
  };

  const renderInitialsFallback = () => (
    <View
      style={[styles.fallback, wrapperStyle]}
      accessibilityLabel={name ? t("a11yNamed", { name }) : t("a11yFallback")}
    >
      <Text style={[styles.initialsText, { fontSize: TEXT_SIZE[size] }]}>
        {initials}
      </Text>
    </View>
  );

  if (!avatar || imageError) return renderInitialsFallback();

  return (
    <View
      style={[
        styles.wrapper,
        wrapperStyle,
        { backgroundColor: avatar.bg, padding },
      ]}
      accessibilityLabel={name ? t("a11yNamed", { name }) : tAvatar(avatar.id)}
    >
      <Image
        source={avatar.image}
        style={styles.image}
        contentFit="contain"
        transition={150}
        onError={() => setImageError(true)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  image: {
    width: "100%",
    height: "100%",
  },
  fallback: {
    backgroundColor: "#E5E7EB",
    alignItems: "center",
    justifyContent: "center",
  },
  initialsText: {
    color: "#6B7280",
    fontFamily: FONTS.bold,
    fontWeight: "700",
  },
});

export default ProfileAvatar;

import { useState } from "react";
import { View, Text, Image, StyleSheet } from "react-native";
import { getAvatar, getInitials } from "@/lib/avatars";
import { resolveR2Url } from "@/lib/r2-url";
import { COLORS, FONTS } from "@/lib/design";

/**
 * Profile avatar render. Mobile port of web's
 * apps/chunky-crayon-web/components/ProfileAvatar/ProfileAvatar.tsx.
 *
 * An illustrated tile from R2 sitting on a soft tinted circular
 * background. `resolveR2Url` builds the URL from the catalog entry's
 * imageKey + `EXPO_PUBLIC_R2_PUBLIC_URL`. Falls back to a grey
 * initials chip when:
 *   - the avatarId has no catalog match (unknown id)
 *   - the env var isn't set (dev surfaces without R2)
 *   - the image fails to load
 *
 * The illustration is pulled in from the circular edge by ~12% on
 * each side so tall features (unicorn horn, dragon spikes, ghost
 * tendrils) stay inside the inscribed circle when the round mask
 * clips. The generated PNGs use the full square — so anything in the
 * corners gets cut by the rounded mask without this safety margin.
 * Same value web uses (`p-[12%]` Tailwind).
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
      accessibilityLabel={name ? `${name}'s avatar` : "Profile avatar"}
    >
      <Text style={[styles.initialsText, { fontSize: TEXT_SIZE[size] }]}>
        {initials}
      </Text>
    </View>
  );

  if (!avatar) return renderInitialsFallback();

  const imageUrl = resolveR2Url(avatar.imageKey);
  if (!imageUrl || imageError) return renderInitialsFallback();

  return (
    <View
      style={[
        styles.wrapper,
        wrapperStyle,
        { backgroundColor: avatar.bg, padding },
      ]}
      accessibilityLabel={name ? `${name}'s avatar` : avatar.name}
    >
      <Image
        source={{ uri: imageUrl }}
        style={styles.image}
        resizeMode="contain"
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

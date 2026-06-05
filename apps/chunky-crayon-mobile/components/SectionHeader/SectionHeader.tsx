import { View, Text, StyleSheet, StyleProp, ViewStyle } from "react-native";
import { FontAwesomeIcon } from "@fortawesome/react-native-fontawesome";
import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import { COLORS } from "@/lib/design";

/**
 * THE shared section-header medallion used across every collection/browse
 * surface (Stickers, Gallery/Feed, My Art, recent creations, Challenges,
 * Characters): a 40px tinted rounded-squircle holding an FA DUOTONE icon, next
 * to a bold 19px title. One source of truth so the kids design language can't
 * drift per screen.
 */

export type SectionTint = "orange" | "gold" | "purple" | "teal" | "pink";

export const SECTION_TINTS: Record<
  SectionTint,
  { bg: string; primary: string; secondary: string }
> = {
  orange: {
    bg: "rgba(228,100,68,0.12)",
    primary: "#E46444",
    secondary: "#F1AE7E",
  },
  gold: {
    bg: "rgba(245,158,11,0.14)",
    primary: "#F59E0B",
    secondary: "#FDD835",
  },
  purple: {
    bg: "rgba(193,139,157,0.18)",
    primary: "#A65979",
    secondary: "#C18B9D",
  },
  teal: {
    bg: "rgba(127,176,105,0.16)",
    primary: "#5E9C6E",
    secondary: "#A8D08D",
  },
  pink: {
    bg: "rgba(228,100,68,0.10)",
    primary: "#E46444",
    secondary: "#F2A18C",
  },
};

type SectionHeaderProps = {
  title: string;
  icon: IconDefinition;
  tint?: SectionTint;
  /** Optional secondary line under the title (e.g. "3 / 7"). */
  subtitle?: string;
  /** Optional right-side element (e.g. a See-all pill). */
  right?: React.ReactNode;
  /** Container override (e.g. paddingHorizontal per screen). */
  style?: StyleProp<ViewStyle>;
};

const SectionHeader = ({
  title,
  icon,
  tint = "orange",
  subtitle,
  right,
  style,
}: SectionHeaderProps) => {
  const t = SECTION_TINTS[tint];
  return (
    <View style={[styles.row, style]}>
      <View style={[styles.badge, { backgroundColor: t.bg }]}>
        <FontAwesomeIcon
          icon={icon}
          size={18}
          color={t.primary}
          secondaryColor={t.secondary}
          secondaryOpacity={1}
        />
      </View>
      <View style={styles.titleBlock}>
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
      {right}
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 14,
  },
  badge: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  titleBlock: {
    flex: 1,
  },
  title: {
    fontSize: 19,
    fontFamily: "TondoTrial-Bold",
    color: COLORS.textPrimary,
  },
  subtitle: {
    fontSize: 13,
    fontFamily: "TondoTrial-Regular",
    color: COLORS.textMuted,
    marginTop: 1,
  },
});

export default SectionHeader;

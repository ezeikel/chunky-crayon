import { View, Text, StyleSheet } from "react-native";
import { FontAwesomeIcon } from "@fortawesome/react-native-fontawesome";
import { faStar } from "@fortawesome/pro-solid-svg-icons";
import { PAYWALL_TRUST } from "@/lib/paywall/plans";
import { useT } from "@/lib/i18n/useT";

/**
 * Social proof, mirroring CC web's homepage/pricing Testimonials header
 * (Testimonials.tsx → SocialProofHeader): the "Loved by families
 * everywhere" line, an overlapping cluster of initials avatars, and a
 * star rating + review count. This replaces the earlier single-rotating
 * testimonial (lifted from PTP) with CC's own pattern.
 *
 * The paywall is height-constrained, so we render web's compact HEADER
 * block (cluster + rating) rather than the full 8-card grid — it's the
 * trust-dense piece. Names mirror web's testimonial set; when the
 * whole-app i18n pass lands these move into messages alongside the rest.
 */

// First 5 reviewer names (matches web's testimonials.items 1-5) for the
// overlapping cluster. Full set + quotes live on web; the paywall only
// needs the cluster.
const CLUSTER_NAMES = [
  "Sophie Bennett",
  "Marcus Reed",
  "Hannah Whitfield",
  "Rachel Doyle",
  "Brian Coletti",
];

// Crayon-palette circle backgrounds (NO purple, per brand). Cycled by a
// stable hash of the name so a given person always gets the same colour.
const INITIALS_BG = [
  "#E46444", // crayon orange
  "#F1AE7E", // crayon peach
  "#E68991", // crayon pink
  "#FAC342", // crayon yellow
  "#8CAF5A", // crayon green
  "#5A9EE2", // crayon blue
];

const getInitials = (name: string): string => {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

const getInitialsBg = (name: string): string => {
  let hash = 0;
  for (let i = 0; i < name.length; i += 1) hash += name.charCodeAt(i);
  return INITIALS_BG[hash % INITIALS_BG.length];
};

const PaywallSocialProof = () => {
  const t = useT("mobile.paywall.socialProof");

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t("title")}</Text>

      <View style={styles.statsRow}>
        {/* Overlapping initials cluster — reads as "real people who didn't
            upload a photo", matching web's SocialProofHeader. */}
        <View style={styles.cluster}>
          {CLUSTER_NAMES.map((name, i) => (
            <View
              key={name}
              style={[
                styles.avatar,
                {
                  backgroundColor: getInitialsBg(name),
                  zIndex: CLUSTER_NAMES.length - i,
                },
                i > 0 && styles.avatarOverlap,
              ]}
            >
              <Text style={styles.avatarInitials}>{getInitials(name)}</Text>
            </View>
          ))}
        </View>

        <View style={styles.rating}>
          <View style={styles.stars}>
            {[0, 1, 2, 3, 4].map((i) => (
              <FontAwesomeIcon
                key={i}
                icon={faStar}
                size={13}
                color={
                  i < Math.floor(PAYWALL_TRUST.averageRating)
                    ? "#FBBF24"
                    : "#E5E0D8"
                }
              />
            ))}
          </View>
          <Text style={styles.ratingValue}>{PAYWALL_TRUST.averageRating}</Text>
          <Text style={styles.ratingCount}>
            {t("reviewCount", { count: PAYWALL_TRUST.reviewCount })}
          </Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    gap: 10,
  },
  title: {
    fontFamily: "TondoTrial-Bold",
    fontSize: 17,
    color: "#43342D",
    textAlign: "center",
  },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    flexWrap: "wrap",
    gap: 12,
  },
  cluster: {
    flexDirection: "row",
  },
  avatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  avatarOverlap: {
    marginLeft: -10,
  },
  avatarInitials: {
    fontFamily: "TondoTrial-Bold",
    fontSize: 11,
    color: "#FFFFFF",
  },
  rating: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  stars: {
    flexDirection: "row",
    gap: 1,
  },
  ratingValue: {
    fontFamily: "TondoTrial-Bold",
    fontSize: 14,
    color: "#43342D",
  },
  ratingCount: {
    fontFamily: "TondoTrial-Regular",
    fontSize: 13,
    color: "#72625A",
  },
});

export default PaywallSocialProof;

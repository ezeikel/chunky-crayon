import { View, Text, StyleSheet } from "react-native";
import { FontAwesomeIcon } from "@fortawesome/react-native-fontawesome";
import { faStar } from "@fortawesome/pro-solid-svg-icons";
import type { PurchasesPackage } from "react-native-purchases";
import SquishyPressable from "@/components/SquishyPressable";
import {
  PLAN_DISPLAY_NAMES,
  PLAN_TAGLINES,
  type PlanKey,
} from "@/lib/paywall/plans";
import { formatPackagePrice } from "@/hooks/usePaywall";

/**
 * One compact, selectable subscription plan row (Duolingo-style): name +
 * tagline + credits on the left, price on the right, a radio-style
 * selected ring, and a "Most Popular" ribbon on the recommended plan.
 *
 * Rows (not tall cards) so all three plans + the hero + the CTA fit on
 * one screen without scrolling or dead space. Selection is visual only;
 * the single bottom CTA commits the purchase of whatever's selected.
 */

type PlanRowProps = {
  planKey: PlanKey;
  pkg: PurchasesPackage;
  cycle: "monthly" | "annual";
  credits: number;
  isBestValue: boolean;
  isSelected: boolean;
  onPress: () => void;
};

const PlanRow = ({
  planKey,
  pkg,
  cycle,
  credits,
  isBestValue,
  isSelected,
  onPress,
}: PlanRowProps) => {
  const price = formatPackagePrice(pkg);

  return (
    <SquishyPressable
      onPress={onPress}
      scaleTo={0.97}
      accessibilityRole="button"
      accessibilityState={{ selected: isSelected }}
      accessibilityLabel={`${PLAN_DISPLAY_NAMES[planKey]}, ${credits} credits a month, ${price} per ${cycle === "annual" ? "year" : "month"}`}
      style={styles.pressable}
    >
      <View
        style={[
          styles.row,
          isSelected && styles.rowSelected,
          isBestValue && !isSelected && styles.rowBestValue,
        ]}
      >
        {isBestValue && (
          <View style={styles.badge}>
            <FontAwesomeIcon icon={faStar} size={9} color="#FFFFFF" />
            <Text style={styles.badgeText}>Most Popular</Text>
          </View>
        )}

        {/* Radio ring */}
        <View style={[styles.radio, isSelected && styles.radioSelected]}>
          {isSelected && <View style={styles.radioDot} />}
        </View>

        <View style={styles.info}>
          <Text style={styles.name}>{PLAN_DISPLAY_NAMES[planKey]}</Text>
          <Text style={styles.tagline} numberOfLines={1}>
            {credits} credits/mo · {PLAN_TAGLINES[planKey]}
          </Text>
        </View>

        <View style={styles.priceCol}>
          <Text style={styles.price}>{price}</Text>
          <Text style={styles.cycle}>/{cycle === "annual" ? "yr" : "mo"}</Text>
        </View>
      </View>
    </SquishyPressable>
  );
};

const styles = StyleSheet.create({
  pressable: {
    width: "100%",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    borderWidth: 2,
    borderColor: "#F0E7DC",
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  rowSelected: {
    borderColor: "#E46444",
    shadowColor: "#E46444",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 3,
  },
  rowBestValue: {
    borderColor: "#F4C7A0",
  },
  badge: {
    position: "absolute",
    top: -10,
    right: 16,
    backgroundColor: "#E46444",
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 999,
  },
  badgeText: {
    fontFamily: "TondoTrial-Bold",
    fontSize: 10,
    color: "#FFFFFF",
  },
  radio: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#D8CCC0",
    alignItems: "center",
    justifyContent: "center",
  },
  radioSelected: {
    borderColor: "#E46444",
  },
  radioDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#E46444",
  },
  info: {
    flex: 1,
    gap: 2,
  },
  name: {
    fontFamily: "TondoTrial-Bold",
    fontSize: 18,
    color: "#3D2C1E",
  },
  tagline: {
    fontFamily: "TondoTrial-Regular",
    fontSize: 12,
    color: "#7A6F66",
  },
  priceCol: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 2,
  },
  price: {
    fontFamily: "TondoTrial-Bold",
    fontSize: 20,
    color: "#3D2C1E",
  },
  cycle: {
    fontFamily: "TondoTrial-Regular",
    fontSize: 13,
    color: "#7A6F66",
  },
});

export default PlanRow;

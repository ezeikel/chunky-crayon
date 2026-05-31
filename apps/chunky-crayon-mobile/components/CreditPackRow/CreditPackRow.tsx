import { View, Text, StyleSheet } from "react-native";
import { Image } from "expo-image";
import { FontAwesomeIcon } from "@fortawesome/react-native-fontawesome";
import { faStar } from "@fortawesome/pro-solid-svg-icons";
import SquishyPressable from "@/components/SquishyPressable";
import { PAYWALL_COIN } from "@/lib/paywall/assets";

/**
 * One credit-pack row, shared by the two credit-pack paywalls
 * (ColorAsYouGoModal + TopUpPackModal). Tapping the row buys that pack
 * (one-off purchases — no select-then-confirm like the subscription
 * paywall). Leads with the brand coin mascot, then the credit amount and
 * a chunky orange price pill on the right. Best-value pack gets an orange
 * ring + "Best Value" ribbon. Built on SquishyPressable for the shared
 * squish; uses the web crayon palette (orange / brown), no purple.
 */

type CreditPackRowProps = {
  credits: number;
  price: string;
  isBestValue?: boolean;
  disabled?: boolean;
  onPress: () => void;
};

const CreditPackRow = ({
  credits,
  price,
  isBestValue = false,
  disabled = false,
  onPress,
}: CreditPackRowProps) => (
  <SquishyPressable
    onPress={onPress}
    disabled={disabled}
    scaleTo={0.97}
    accessibilityRole="button"
    accessibilityLabel={`${credits} credits for ${price}${isBestValue ? ", best value" : ""}`}
    style={styles.pressable}
  >
    <View style={[styles.row, isBestValue && styles.rowBestValue]}>
      {isBestValue && (
        <View style={styles.badge}>
          <FontAwesomeIcon icon={faStar} size={9} color="#FFFFFF" />
          <Text style={styles.badgeText}>Best Value</Text>
        </View>
      )}

      <Image
        source={PAYWALL_COIN}
        style={styles.coin}
        contentFit="contain"
        transition={150}
      />

      <View style={styles.info}>
        <Text style={styles.credits}>{credits}</Text>
        <Text style={styles.creditsLabel}>credits</Text>
      </View>

      <View style={styles.pricePill}>
        <Text style={styles.priceText}>{price}</Text>
      </View>
    </View>
  </SquishyPressable>
);

const styles = StyleSheet.create({
  pressable: {
    width: "100%",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    borderWidth: 2,
    borderColor: "#F0E7DC",
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  rowBestValue: {
    borderColor: "#E46444",
    shadowColor: "#E46444",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 3,
  },
  badge: {
    position: "absolute",
    top: -10,
    alignSelf: "center",
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
  coin: {
    width: 44,
    height: 44,
  },
  info: {
    flex: 1,
    flexDirection: "row",
    alignItems: "baseline",
    gap: 6,
  },
  credits: {
    fontFamily: "TondoTrial-Bold",
    fontSize: 24,
    color: "#43342D",
  },
  creditsLabel: {
    fontFamily: "TondoTrial-Regular",
    fontSize: 15,
    color: "#72625A",
  },
  pricePill: {
    backgroundColor: "#E46444",
    borderRadius: 999,
    paddingVertical: 9,
    paddingHorizontal: 18,
    shadowColor: "#D04725",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 0,
  },
  priceText: {
    fontFamily: "TondoTrial-Bold",
    fontSize: 16,
    color: "#FFFFFF",
  },
});

export default CreditPackRow;

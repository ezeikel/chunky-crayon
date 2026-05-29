import { useEffect } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { Image } from "expo-image";
import { FontAwesomeIcon } from "@fortawesome/react-native-fontawesome";
import {
  faWandMagicSparkles,
  faRotateRight,
  faPlus,
} from "@fortawesome/pro-duotone-svg-icons";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import type { Character } from "@/api";
import { useT } from "@/lib/i18n/useT";
import { COLORS, FONTS } from "@/lib/design";

/**
 * One character in the mobile roster grid — RN port of web's CharacterTile.
 *
 * Three states (matching web):
 *   - READY: colored portrait + name. Tap → onPress (manage/delete).
 *   - GENERATING: pulsing wand + "Drawing {name}…". Not tappable.
 *   - FAILED: refresh icon + "Tap to try again" → onRetry. Raw failure
 *     reason is NEVER shown to kids.
 */

type Props = {
  character: Character;
  onPress: () => void;
  onRetry: () => void;
};

const CharacterTile = ({ character, onPress, onRetry }: Props) => {
  const t = useT("mobile.characters");
  const { name, species, status, portraitUrl, portraitLineArtUrl } = character;
  const portrait = portraitUrl ?? portraitLineArtUrl;
  const isReady = status === "READY";
  const isGenerating = status === "GENERATING";
  const isFailed = status === "FAILED";

  // Gentle pulse on the GENERATING wand (Reanimated, UI thread).
  const pulse = useSharedValue(1);
  useEffect(() => {
    if (!isGenerating) return;
    pulse.value = withRepeat(withTiming(0.5, { duration: 700 }), -1, true);
  }, [isGenerating, pulse]);
  const pulseStyle = useAnimatedStyle(() => ({ opacity: pulse.value }));

  const handlePress = () => {
    if (isGenerating) return;
    if (isFailed) return onRetry();
    onPress();
  };

  return (
    <Pressable
      onPress={handlePress}
      disabled={isGenerating}
      accessibilityRole="button"
      accessibilityLabel={name}
      style={({ pressed }) => [
        styles.card,
        pressed && !isGenerating && styles.cardPressed,
      ]}
    >
      <View style={styles.portraitArea}>
        {isReady && portrait ? (
          <Image
            source={{ uri: portrait }}
            style={styles.portrait}
            contentFit="contain"
            transition={200}
          />
        ) : isGenerating ? (
          <>
            <Animated.View style={pulseStyle}>
              <FontAwesomeIcon
                icon={faWandMagicSparkles}
                size={44}
                color={COLORS.crayonOrange}
                secondaryColor={COLORS.yellow}
                secondaryOpacity={1}
              />
            </Animated.View>
            <Text style={styles.statusText} numberOfLines={1}>
              {t("drawing", { name })}
            </Text>
          </>
        ) : isFailed ? (
          <>
            <FontAwesomeIcon
              icon={faRotateRight}
              size={44}
              color={COLORS.crayonOrange}
              secondaryColor="#E68991"
              secondaryOpacity={1}
            />
            <Text style={styles.statusText}>{t("tryAgain")}</Text>
          </>
        ) : (
          <Text style={styles.statusText}>{t("gettingReady")}</Text>
        )}
      </View>

      <View style={styles.footer}>
        <Text style={styles.name} numberOfLines={1}>
          {name}
        </Text>
        {isGenerating ? (
          <Animated.View style={[styles.pill, styles.pillDrawing, pulseStyle]}>
            <Text style={styles.pillTextDark}>{t("drawingBadge")}</Text>
          </Animated.View>
        ) : isFailed ? (
          <View style={[styles.pill, styles.pillRetry]}>
            <Text style={styles.pillTextLight}>{t("retryBadge")}</Text>
          </View>
        ) : (
          <Text style={styles.species} numberOfLines={1}>
            {species}
          </Text>
        )}
      </View>
    </Pressable>
  );
};

/** The "add a new character" tile — sits at the end of the grid. */
export const AddCharacterTile = ({ onPress }: { onPress: () => void }) => {
  const t = useT("mobile.characters");
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={t("addCharacter")}
      style={({ pressed }) => [
        styles.card,
        styles.addCard,
        pressed && styles.cardPressed,
      ]}
    >
      <View style={styles.portraitArea}>
        <FontAwesomeIcon icon={faPlus} size={44} color={COLORS.crayonOrange} />
        <Text style={styles.statusText}>{t("addCharacter")}</Text>
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  card: {
    flex: 1,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: COLORS.bgCreamDark,
    backgroundColor: COLORS.white,
    overflow: "hidden",
    shadowColor: "#E46444",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  addCard: {
    borderStyle: "dashed",
    borderColor: COLORS.crayonOrangeLight,
    backgroundColor: COLORS.bgCream,
  },
  cardPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  portraitArea: {
    aspectRatio: 1,
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: COLORS.white,
  },
  portrait: {
    width: "100%",
    height: "100%",
    padding: 12,
  },
  statusText: {
    fontFamily: FONTS.bold,
    fontSize: 13,
    color: COLORS.textSecondary,
    textAlign: "center",
    paddingHorizontal: 8,
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  name: {
    flex: 1,
    fontFamily: FONTS.bold,
    fontSize: 17,
    color: COLORS.textPrimary,
  },
  species: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    color: COLORS.textMuted,
    textTransform: "capitalize",
  },
  pill: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  pillDrawing: {
    backgroundColor: COLORS.yellow,
  },
  pillRetry: {
    backgroundColor: COLORS.crayonOrange,
  },
  pillTextDark: {
    fontFamily: FONTS.bold,
    fontSize: 11,
    color: "#374151",
    textTransform: "uppercase",
  },
  pillTextLight: {
    fontFamily: FONTS.bold,
    fontSize: 11,
    color: COLORS.white,
    textTransform: "uppercase",
  },
});

export default CharacterTile;

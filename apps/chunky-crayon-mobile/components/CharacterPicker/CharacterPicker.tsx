import { useEffect } from "react";
import { View, Text, Pressable, ScrollView, StyleSheet } from "react-native";
import { Image } from "expo-image";
import Svg, { Circle } from "react-native-svg";
import { router } from "expo-router";
import { FontAwesomeIcon } from "@fortawesome/react-native-fontawesome";
import { faBan, faUserPlus, faCheck } from "@fortawesome/pro-duotone-svg-icons";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from "react-native-reanimated";
import { useCharacters } from "@/hooks/api";
import type { Character } from "@/api";
import { tapLight } from "@/utils/haptics";
import { COLORS, FONTS } from "@/lib/design";

/**
 * Text-mode "Add a friend" picker — feature one of the kid's READY characters
 * in the next coloring page. Mobile port of web's CharacterPicker, in the
 * kids-app circular-disc style (Spotify Kids / Duolingo ABC): each friend is a
 * round disc on a soft colour wash with a chunky white "sticker" ring; the
 * selected one pops (spring scale + bold orange ring + check badge).
 *
 * Single-select (v1 caps at one character per page). Shows the COLOUR portrait
 * (line art is only the generation reference). "No friend" is the default;
 * "New friend" always deep-links to /characters so the add path is never
 * hidden. Empty roster → a single "Make a friend" deep-link row.
 */

type Props = {
  /** Selected characterId, or null for "No friend". */
  value: string | null;
  onChange: (id: string | null) => void;
};

// Soft per-disc colour washes (Duolingo-ABC kids pattern) — cycles so a row of
// friends reads as a colourful set, not grey. Mirrors web's DISC_TINTS order.
const DISC_TINTS = [
  "rgba(228,100,68,0.15)", // crayon-orange
  "rgba(90,158,226,0.15)", // crayon-blue
  "rgba(140,175,90,0.15)", // crayon-green
  "rgba(193,139,157,0.18)", // crayon-purple
  "rgba(250,195,66,0.2)", // crayon-yellow
  "rgba(230,137,145,0.15)", // crayon-pink
] as const;

const DISC = 80;

// Smooth dashed ring for the "New friend" add disc, drawn as an SVG <Circle>.
// Android's CSS dashed border (and the disc's elevation shadow) polygonize a
// large-radius disc into a flat-edged octagon; SVG strokeDasharray draws a true
// circle on both platforms. Mirrors SceneBuilder's DashedRing.
const DashedRing = () => {
  const stroke = 3;
  const r = (DISC - stroke) / 2;
  return (
    <Svg
      width={DISC}
      height={DISC}
      style={StyleSheet.absoluteFill}
      pointerEvents="none"
    >
      <Circle
        cx={DISC / 2}
        cy={DISC / 2}
        r={r}
        fill="rgba(228,100,68,0.05)"
        stroke={COLORS.crayonOrangeLight}
        strokeWidth={stroke}
        strokeDasharray="8 6"
        strokeLinecap="round"
      />
    </Svg>
  );
};

const goToCharacters = () => {
  tapLight();
  router.push("/characters?from=create");
};

/** One selectable friend disc with a spring pop on select. */
const FriendDisc = ({
  character,
  index,
  selected,
  onPress,
}: {
  character: Character;
  index: number;
  selected: boolean;
  onPress: () => void;
}) => {
  const scale = useSharedValue(selected ? 1.06 : 1);
  useEffect(() => {
    scale.value = withSpring(selected ? 1.06 : 1, {
      damping: 12,
      stiffness: 220,
    });
  }, [selected, scale]);
  const discStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const portrait = character.portraitUrl ?? character.portraitLineArtUrl;
  const tint = DISC_TINTS[index % DISC_TINTS.length];

  return (
    <Pressable
      onPress={() => {
        tapLight();
        onPress();
      }}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={`Include ${character.name}, a ${character.species}`}
      style={styles.item}
    >
      <Animated.View
        style={[
          styles.disc,
          // Tint wash only when SELECTED. Unselected must be a clean transparent
          // cut-out: with the white sticker ring removed (discUnselected), the
          // per-disc DISC_TINTS wash the ring used to mask shows as a pink/peach
          // circle (a clipped arc on iOS where the portrait overflows the disc).
          { backgroundColor: selected ? tint : "transparent" },
          selected ? styles.discSelected : styles.discUnselected,
          discStyle,
        ]}
      >
        {portrait ? (
          <Image
            source={{ uri: portrait }}
            style={styles.portrait}
            contentFit="contain"
            transition={150}
          />
        ) : null}
        {selected && (
          <View style={styles.checkBadge}>
            <FontAwesomeIcon icon={faCheck} size={11} color={COLORS.white} />
          </View>
        )}
      </Animated.View>
      <Text
        style={[styles.label, selected && styles.labelSelected]}
        numberOfLines={1}
      >
        {character.name}
      </Text>
    </Pressable>
  );
};

const CharacterPicker = ({ value, onChange }: Props) => {
  const { data, isLoading } = useCharacters();
  const ready = (data?.characters ?? []).filter((c) => c.status === "READY");

  // Drop a stale selection if the character vanished (deleted / not ready).
  useEffect(() => {
    if (value && !ready.some((c) => c.id === value)) onChange(null);
  }, [value, ready, onChange]);

  if (isLoading) {
    return (
      <View style={styles.root}>
        <Text style={styles.header}>
          Add a friend <Text style={styles.headerMuted}>(optional)</Text>
        </Text>
        <View style={styles.row}>
          {[0, 1, 2].map((i) => (
            <View key={i} style={[styles.disc, styles.discSkeleton]} />
          ))}
        </View>
      </View>
    );
  }

  // Empty roster → a single "Make a friend" deep-link row (don't dead-end).
  if (ready.length === 0) {
    return (
      <View style={styles.root}>
        <Text style={styles.header}>
          Add a friend <Text style={styles.headerMuted}>(optional)</Text>
        </Text>
        <Pressable
          onPress={goToCharacters}
          accessibilityRole="button"
          accessibilityLabel="Make a friend"
          style={styles.emptyRow}
        >
          <View style={styles.emptyIcon}>
            <FontAwesomeIcon
              icon={faUserPlus}
              size={20}
              color={COLORS.white}
              secondaryColor={COLORS.white}
              secondaryOpacity={0.55}
            />
          </View>
          <Text style={styles.emptyText}>
            <Text style={styles.emptyTextBold}>Make a friend</Text> who shows up
            in your pages!
          </Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <Text style={styles.header}>
        Add a friend <Text style={styles.headerMuted}>(optional)</Text>
      </Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
      >
        {/* "No friend" disc — the default. faBan reads friendlier than ∅. */}
        <Pressable
          onPress={() => {
            tapLight();
            onChange(null);
          }}
          accessibilityRole="button"
          accessibilityState={{ selected: value === null }}
          accessibilityLabel="No friend"
          style={styles.item}
        >
          <View
            style={[
              styles.disc,
              styles.discNeutral,
              value === null && styles.discSelected,
            ]}
          >
            <FontAwesomeIcon
              icon={faBan}
              size={24}
              color={value === null ? COLORS.crayonOrange : COLORS.textMuted}
            />
          </View>
          <Text
            style={[styles.label, value === null && styles.labelSelected]}
            numberOfLines={1}
          >
            No friend
          </Text>
        </Pressable>

        {ready.map((c, i) => (
          <FriendDisc
            key={c.id}
            character={c}
            index={i}
            selected={value === c.id}
            onPress={() => onChange(c.id)}
          />
        ))}

        {/* "New friend" disc — always present; deep-links to /characters. */}
        <Pressable
          onPress={goToCharacters}
          accessibilityRole="button"
          accessibilityLabel="Make a new friend"
          style={styles.item}
        >
          <View style={[styles.disc, styles.discAdd]}>
            <DashedRing />
            <FontAwesomeIcon
              icon={faUserPlus}
              size={22}
              color={COLORS.crayonOrange}
              secondaryColor={COLORS.crayonOrange}
              secondaryOpacity={0.4}
            />
          </View>
          <Text style={[styles.label, styles.labelAdd]} numberOfLines={1}>
            New friend
          </Text>
        </Pressable>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  root: { gap: 8 },
  header: {
    fontFamily: FONTS.bold,
    fontSize: 14,
    color: COLORS.textPrimary,
  },
  headerMuted: {
    fontFamily: FONTS.regular,
    color: COLORS.textMuted,
  },
  row: {
    flexDirection: "row",
    gap: 16,
    paddingVertical: 4,
    paddingRight: 8,
  },
  item: {
    alignItems: "center",
    gap: 6,
    width: DISC,
  },
  disc: {
    width: DISC,
    height: DISC,
    borderRadius: DISC / 2,
    borderWidth: 4,
    borderColor: COLORS.white,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    // Soft "sticker" lift.
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
  discNeutral: {
    backgroundColor: COLORS.bgCream,
  },
  discUnselected: {
    // Match iOS: drop disc's white sticker ring + elevation on unselected
    // friends. On Android the white `borderWidth: 4` renders as a hard opaque
    // halo and `elevation` adds a heavy circular shadow that iOS never shows.
    // borderWidth: 0 (not just a transparent colour) removes the border geometry
    // so no faint halo survives on Android; the portrait reads as a clean cut-out
    // on both platforms. Mirrors SceneBuilder's tileFaceDefault. (Selected state
    // re-adds the orange ring via discSelected, which restores borderWidth via
    // disc's base 4px — so the ring still shows when picked.)
    borderWidth: 0,
    borderColor: "transparent",
    shadowOpacity: 0,
    elevation: 0,
  },
  discSelected: {
    borderColor: COLORS.crayonOrange,
  },
  discAdd: {
    // Strip ALL of disc's sticker chrome and draw only the SVG DashedRing + the
    // user-plus icon. On Android, the CSS dashed border, the rounded
    // overflow:'hidden' fill, and the elevation shadow each polygonize a
    // large-radius disc into a flat-edged octagon. SVG strokeDasharray renders a
    // true circle, so the ring is the only visual. Mirrors SceneBuilder's
    // tileFaceAdd.
    borderWidth: 0,
    borderColor: "transparent",
    backgroundColor: "transparent",
    overflow: "visible",
    shadowOpacity: 0,
    elevation: 0,
  },
  discSkeleton: {
    backgroundColor: COLORS.bgCreamDark,
    opacity: 0.5,
  },
  portrait: {
    width: "100%",
    height: "100%",
    padding: 4,
  },
  checkBadge: {
    position: "absolute",
    top: 0,
    right: 0,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: COLORS.crayonOrange,
    borderWidth: 2,
    borderColor: COLORS.white,
    alignItems: "center",
    justifyContent: "center",
  },
  label: {
    fontFamily: FONTS.bold,
    fontSize: 12,
    color: COLORS.textPrimary,
    textAlign: "center",
    maxWidth: DISC,
  },
  labelSelected: {
    color: COLORS.crayonOrange,
  },
  labelAdd: {
    color: COLORS.crayonOrange,
  },
  // Empty-roster row.
  emptyRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 2,
    borderStyle: "dashed",
    borderColor: COLORS.crayonOrangeLight,
    backgroundColor: "rgba(228,100,68,0.05)",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  emptyIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.crayonOrange,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyText: {
    flex: 1,
    fontFamily: FONTS.regular,
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  emptyTextBold: {
    fontFamily: FONTS.bold,
    color: COLORS.textPrimary,
  },
});

export default CharacterPicker;

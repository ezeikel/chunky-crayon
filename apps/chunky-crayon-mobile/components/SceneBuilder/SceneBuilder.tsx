import { useMemo, useState } from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
  type ImageSourcePropType as ImageSource,
} from "react-native";
import { Image } from "expo-image";
import Svg, { Circle } from "react-native-svg";
import { FontAwesomeIcon } from "@fortawesome/react-native-fontawesome";
import {
  faDice,
  faArrowLeft,
  faArrowRight,
  faWandMagicSparkles,
  faPlus,
} from "@fortawesome/pro-duotone-svg-icons";
import { faCheck, faLock } from "@fortawesome/pro-solid-svg-icons";
import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import Animated, {
  useAnimatedStyle,
  withSpring,
  withTiming,
  ZoomIn,
} from "react-native-reanimated";
import { COLORS, FONTS } from "@/lib/design";
import { tapLight } from "@/utils/haptics";

/**
 * SceneBuilder — mobile RN port of
 * packages/coloring-ui/src/SceneBuilder.tsx (the web wizard).
 *
 * The privacy-first default create surface: a 3-8yo builds a coloring
 * scene by tapping colourful tiles. Zero typing, no mic, no camera.
 *
 * Wizard, not a wall of options — one question per screen:
 *   Step 0  Who?   (required, pick up to maxSelections)
 *   Step 1  Where? (required, pick 1)
 *   Step 2  Make it special (OPTIONAL) — remaining layers folded into one
 *           light screen (weather + activity + accent), each a small row.
 *
 * Presentational + controlled + app-agnostic, same contract as the web
 * component: the app owns the catalogue + i18n + dice, this never imports
 * app data. The mobile adapter (SceneInput) supplies layers/selection.
 *
 * Animations are Reanimated (UI thread), never RN Animated.
 */

// ─── Public data contract (app supplies these) ──────────────────────────────

export type SceneTileDuotone = {
  primary: string;
  secondary: string;
};

export type SceneTileOption = {
  /** Stable key, opaque to this component. */
  key: string;
  /** Short label under the tile (app passes the translated string). */
  label: string;
  /** FA fallback icon, shown when `thumbnail` is null. */
  icon: IconDefinition;
  /** Duotone palette for the FA fallback. */
  duotone: SceneTileDuotone;
  /**
   * Bundled illustration source (the primary visual). The app passes a
   * `require()`'d PNG (ImageSourcePropType); null falls back to the FA
   * icon. Web passes a remote URL string instead — both are valid
   * expo-image sources, but mobile bundles the assets (see lib/scene/
   * scene-catalog.ts) so this is typically a require() module.
   */
  thumbnail: ImageSource | null;
  /**
   * "add" replaces the tile content with a plus-icon affordance — for
   * sentinels like `your-character` when the entity doesn't exist yet.
   * Distinct from `locked`: an `add` tile IS tappable.
   */
  state?: "add";
  /**
   * Optional grouping within the subject step. `"friends"` options (the
   * kid's saved characters + an add tile) render in their own row above the
   * preset subjects. Both groups share the layer's maxSelections cap.
   */
  group?: "friends";
};

export type SceneLayer = {
  /** Stable layer id (subject, location, weather, activity, accent). */
  id: string;
  /** Step / section heading (app passes the translated string). */
  title: string;
  /** "single" → one selection; "multi" → up to maxSelections. */
  kind: "single" | "multi";
  /** Multi-select cap. Ignored for single-select rows. */
  maxSelections?: number;
  options: readonly SceneTileOption[];
};

export type SceneSelection = Record<string, readonly string[]>;

export type SceneBuilderLabels = {
  ariaLabel?: string;
  surpriseMe?: string;
  lockedSuffix?: string;
  back?: string;
  next?: string;
  create?: string;
  extrasTitle?: string;
  skip?: string;
  /** Sub-heading above the saved-character row, e.g. "Your friends". */
  friendsTitle?: string;
  /** Sub-heading above the preset row when a friends row shows, e.g.
   *  "or pick one". */
  subjectGroupTitle?: string;
};

export type SceneBuilderProps = {
  layers: readonly SceneLayer[];
  selection: SceneSelection;
  onSelectionChange: (next: SceneSelection) => void;
  /** Dice tap → app rolls a scene and applies it via onSelectionChange. */
  onSurpriseMe?: () => void;
  /** Final "Create!" tap. Enabled only when required steps are satisfied. */
  onCreate?: () => void;
  /**
   * When true the Create button stays inviting (full brand fill, real
   * Create icon) but tap fires onCreateBlockedTap (opens a paywall)
   * instead of onCreate — surfaces the paywall before the kid invests.
   */
  createBlocked?: boolean;
  onCreateBlockedTap?: () => void;
  /** Option keys to render locked. Keyed by layer id → locked keys. */
  lockedKeys?: Record<string, readonly string[]>;
  onLockedTap?: (layerId: string, optionKey: string) => void;
  disabled?: boolean;
  labels?: SceneBuilderLabels;
};

// ─── Tile ────────────────────────────────────────────────────────────────────

const TILE_LG = 104;
const TILE_SM = 76;

// Soft colour wash behind a disc, derived from the option's duotone primary
// (a #RRGGBB hex) at low opacity — so each disc sits on its own gentle colour
// like the kids-app references, instead of flat white.
const tintFromDuotone = (hex: string): string => {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return "rgba(228,100,68,0.12)";
  const n = parseInt(m[1], 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return `rgba(${r}, ${g}, ${b}, 0.14)`;
};

// Smooth dashed ring drawn as an absolutely-positioned SVG <Circle> overlay.
// Android's CSS dashed border polygonizes a large-radius rounded border into a
// flat-edged octagon; SVG strokeDasharray renders a true circle on both
// platforms. Sized to overlay the full tile box.
const DashedRing = ({ box }: { box: number }) => {
  const stroke = 3;
  const r = (box - stroke) / 2; // keep the stroke inside the box bounds
  const dash = box >= 100 ? "10 8" : "8 6"; // chunkier dashes on the lg tile
  return (
    <Svg
      width={box}
      height={box}
      style={StyleSheet.absoluteFill}
      pointerEvents="none"
    >
      <Circle
        cx={box / 2}
        cy={box / 2}
        r={r}
        // Faint round wash painted by the SVG, not the View background, so it
        // stays circular on Android (a rounded View background polygonizes the
        // same way the dashed border does).
        fill="rgba(228,100,68,0.05)"
        stroke={COLORS.crayonOrangeLight}
        strokeWidth={stroke}
        strokeDasharray={dash}
        strokeLinecap="round"
      />
    </Svg>
  );
};

type SceneTileProps = {
  option: SceneTileOption;
  selected: boolean;
  locked: boolean;
  disabled: boolean;
  size: "lg" | "sm";
  onToggle: () => void;
};

const SceneTile = ({
  option,
  selected,
  locked,
  disabled,
  size,
  onToggle,
}: SceneTileProps) => {
  const box = size === "lg" ? TILE_LG : TILE_SM;
  const iconSize = size === "lg" ? 52 : 34;

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: withSpring(selected ? 1.05 : 1) }],
  }));

  const isAdd = option.state === "add";

  return (
    <Pressable
      onPress={onToggle}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={locked ? `${option.label} (locked)` : option.label}
      style={styles.tileWrapper}
    >
      <View style={{ width: box, height: box }}>
        <Animated.View
          style={[
            styles.tileFace,
            // Circular disc (kids-app pattern — Spotify Kids / Duolingo ABC),
            // matching the Text-mode friend picker. A per-option soft colour
            // wash sits behind the thumbnail so the row reads as a colourful
            // set, not white cards.
            {
              width: box,
              height: box,
              borderRadius: box / 2,
              // Background wash only when SELECTED. The add tile paints its own
              // wash via the SVG DashedRing, and the unselected tile must be a
              // clean transparent cut-out: once the white sticker ring is removed
              // (tileFaceDefault), the soft tint wash that the ring used to mask
              // shows through as a pink/peach circle (a clipped arc on iOS where
              // the art overflows). Transparent when unselected fixes that.
              backgroundColor:
                isAdd || !selected
                  ? "transparent"
                  : tintFromDuotone(option.duotone.primary),
            },
            selected
              ? styles.tileFaceSelected
              : isAdd
                ? styles.tileFaceAdd
                : styles.tileFaceDefault,
            disabled && styles.tileFaceDisabled,
            animatedStyle,
          ]}
        >
          {isAdd ? (
            <>
              <DashedRing box={box} />
              <FontAwesomeIcon
                icon={faPlus}
                size={iconSize}
                color={COLORS.crayonOrange}
              />
            </>
          ) : option.thumbnail ? (
            <Image
              source={option.thumbnail}
              style={styles.thumbnail}
              contentFit="cover"
              transition={150}
            />
          ) : (
            <FontAwesomeIcon
              icon={option.icon}
              size={iconSize}
              color={option.duotone.primary}
              secondaryColor={option.duotone.secondary}
              secondaryOpacity={1}
            />
          )}

          {locked && !isAdd && (
            <View style={styles.lockWash}>
              <FontAwesomeIcon
                icon={faLock}
                size={size === "lg" ? 32 : 20}
                color="#525252"
              />
            </View>
          )}
        </Animated.View>

        {selected && (
          <Animated.View
            entering={ZoomIn.duration(150)}
            style={styles.checkBadge}
            pointerEvents="none"
          >
            <FontAwesomeIcon icon={faCheck} size={14} color={COLORS.white} />
          </Animated.View>
        )}
      </View>

      <Text style={styles.tileLabel} numberOfLines={1}>
        {option.label}
      </Text>
    </Pressable>
  );
};

// ─── Carousel (one layer's options, horizontal scroll) ──────────────────────

type TileCarouselProps = {
  layer: SceneLayer;
  selected: readonly string[];
  locked: readonly string[];
  disabled: boolean;
  size: "lg" | "sm";
  onToggle: (optionKey: string) => void;
  onLockedTap?: (optionKey: string) => void;
};

const TileCarousel = ({
  layer,
  selected,
  locked,
  disabled,
  size,
  onToggle,
  onLockedTap,
}: TileCarouselProps) => {
  const lockedSet = useMemo(() => new Set(locked), [locked]);
  const selectedSet = useMemo(() => new Set(selected), [selected]);

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.carousel}
      accessibilityRole="list"
    >
      {layer.options.map((option) => {
        const isLocked = lockedSet.has(option.key);
        return (
          <SceneTile
            key={option.key}
            option={option}
            selected={selectedSet.has(option.key)}
            locked={isLocked}
            disabled={disabled}
            size={size}
            onToggle={() =>
              isLocked ? onLockedTap?.(option.key) : onToggle(option.key)
            }
          />
        );
      })}
    </ScrollView>
  );
};

// ─── Action buttons ──────────────────────────────────────────────────────────

const PrimaryAction = ({
  icon,
  label,
  onPress,
  enabled,
  blocked = false,
  large = false,
  disabled,
}: {
  icon: IconDefinition;
  label: string;
  onPress: () => void;
  enabled: boolean;
  blocked?: boolean;
  large?: boolean;
  disabled: boolean;
}) => {
  // Blocked stays tappable; only truly-disabled steps block the press.
  const pressable = blocked ? !disabled : enabled && !disabled;
  const inviting = enabled || blocked;
  const dim = useAnimatedStyle(() => ({ opacity: withTiming(1) }));

  const handlePress = async () => {
    if (!pressable) return;
    await tapLight();
    onPress();
  };

  return (
    <Animated.View style={dim}>
      <Pressable
        onPress={handlePress}
        disabled={!pressable}
        accessibilityRole="button"
        accessibilityLabel={label}
        style={[
          styles.actionCircle,
          large ? styles.actionLarge : styles.actionDefault,
          inviting ? styles.actionFilled : styles.actionMuted,
        ]}
      >
        <FontAwesomeIcon
          icon={icon}
          size={large ? 22 : 18}
          color={inviting ? COLORS.white : "#A89F99"}
        />
      </Pressable>
    </Animated.View>
  );
};

const SecondaryAction = ({
  icon,
  label,
  onPress,
  disabled,
}: {
  icon: IconDefinition;
  label: string;
  onPress: () => void;
  disabled: boolean;
}) => {
  const handlePress = async () => {
    if (disabled) return;
    await tapLight();
    onPress();
  };
  return (
    <Pressable
      onPress={handlePress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={[styles.actionCircle, styles.actionDefault, styles.actionGhost]}
    >
      <FontAwesomeIcon icon={icon} size={18} color={COLORS.textPrimary} />
    </Pressable>
  );
};

// ─── SceneBuilder (wizard) ───────────────────────────────────────────────────

const SceneBuilder = ({
  layers,
  selection,
  onSelectionChange,
  onSurpriseMe,
  onCreate,
  createBlocked = false,
  onCreateBlockedTap,
  lockedKeys,
  onLockedTap,
  disabled = false,
  labels = {},
}: SceneBuilderProps) => {
  const subjectLayer = layers[0];
  const locationLayer = layers[1];
  const extraLayers = useMemo(() => layers.slice(2), [layers]);

  // Split subject options into the kid's saved-character "friends" row and the
  // preset subjects. Empty friends → the subject step renders one carousel.
  const friendOptions = useMemo(
    () => (subjectLayer?.options ?? []).filter((o) => o.group === "friends"),
    [subjectLayer],
  );
  const presetOptions = useMemo(
    () => (subjectLayer?.options ?? []).filter((o) => o.group !== "friends"),
    [subjectLayer],
  );
  const hasExtras = extraLayers.length > 0;
  const [step, setStep] = useState(0);

  const toggleOption = (layer: SceneLayer, optionKey: string) => {
    if (disabled) return;
    const current = selection[layer.id] ?? [];
    const isSelected = current.includes(optionKey);

    let nextForLayer: string[];
    if (layer.kind === "single") {
      nextForLayer = isSelected ? [] : [optionKey];
    } else if (isSelected) {
      nextForLayer = current.filter((k) => k !== optionKey);
    } else {
      const cap = layer.maxSelections ?? Infinity;
      nextForLayer =
        current.length >= cap
          ? [...current.slice(1), optionKey]
          : [...current, optionKey];
    }
    onSelectionChange({ ...selection, [layer.id]: nextForLayer });
  };

  const subjectChosen = (selection[subjectLayer?.id ?? ""] ?? []).length > 0;
  const locationChosen = (selection[locationLayer?.id ?? ""] ?? []).length > 0;
  const canCreate = subjectChosen && locationChosen;

  const handleCreatePress = () =>
    createBlocked ? onCreateBlockedTap?.() : onCreate?.();

  return (
    <View
      style={styles.container}
      accessibilityRole="none"
      accessibilityLabel={labels.ariaLabel ?? "Build your picture"}
    >
      {/* Surprise me — kid-prominent dice, icon-only (3-8yo don't read). */}
      {onSurpriseMe && (
        <View style={styles.diceRow}>
          <Pressable
            onPress={async () => {
              if (disabled) return;
              await tapLight();
              onSurpriseMe();
            }}
            disabled={disabled}
            accessibilityRole="button"
            accessibilityLabel={labels.surpriseMe ?? "Surprise me!"}
            style={[styles.actionCircle, styles.diceButton]}
          >
            <FontAwesomeIcon icon={faDice} size={22} color={COLORS.white} />
          </Pressable>
        </View>
      )}

      {/* Step 0 — Who? (required). When the subject layer carries friend
          options (the kid's saved characters), they render in their own "Your
          friends" row above the presets — both write to the same selection, so
          the maxSelections cap is shared. */}
      {step === 0 && subjectLayer && (
        <View style={styles.step}>
          <Text style={styles.title}>{subjectLayer.title}</Text>
          {friendOptions.length > 0 ? (
            <>
              {labels.friendsTitle ? (
                <Text style={styles.groupLabel}>{labels.friendsTitle}</Text>
              ) : null}
              <TileCarousel
                layer={{ ...subjectLayer, options: friendOptions }}
                selected={selection[subjectLayer.id] ?? []}
                locked={lockedKeys?.[subjectLayer.id] ?? []}
                disabled={disabled}
                size="lg"
                onToggle={(k) => toggleOption(subjectLayer, k)}
                onLockedTap={
                  onLockedTap
                    ? (k) => onLockedTap(subjectLayer.id, k)
                    : undefined
                }
              />
              {labels.subjectGroupTitle ? (
                <Text style={styles.groupLabel}>
                  {labels.subjectGroupTitle}
                </Text>
              ) : null}
              <TileCarousel
                layer={{ ...subjectLayer, options: presetOptions }}
                selected={selection[subjectLayer.id] ?? []}
                locked={lockedKeys?.[subjectLayer.id] ?? []}
                disabled={disabled}
                size="lg"
                onToggle={(k) => toggleOption(subjectLayer, k)}
              />
            </>
          ) : (
            <TileCarousel
              layer={subjectLayer}
              selected={selection[subjectLayer.id] ?? []}
              locked={lockedKeys?.[subjectLayer.id] ?? []}
              disabled={disabled}
              size="lg"
              onToggle={(k) => toggleOption(subjectLayer, k)}
              onLockedTap={
                onLockedTap ? (k) => onLockedTap(subjectLayer.id, k) : undefined
              }
            />
          )}
          <View style={styles.navRowEnd}>
            <PrimaryAction
              icon={faArrowRight}
              label={labels.next ?? "Next"}
              onPress={() => setStep(1)}
              enabled={subjectChosen}
              disabled={disabled}
            />
          </View>
        </View>
      )}

      {/* Step 1 — Where? (required) */}
      {step === 1 && locationLayer && (
        <View style={styles.step}>
          <Text style={styles.title}>{locationLayer.title}</Text>
          <TileCarousel
            layer={locationLayer}
            selected={selection[locationLayer.id] ?? []}
            locked={lockedKeys?.[locationLayer.id] ?? []}
            disabled={disabled}
            size="lg"
            onToggle={(k) => toggleOption(locationLayer, k)}
          />
          <View style={styles.navRowBetween}>
            <SecondaryAction
              icon={faArrowLeft}
              label={labels.back ?? "Back"}
              onPress={() => setStep(0)}
              disabled={disabled}
            />
            {hasExtras ? (
              <PrimaryAction
                icon={faArrowRight}
                label={labels.next ?? "Next"}
                onPress={() => setStep(2)}
                enabled={locationChosen}
                disabled={disabled}
              />
            ) : (
              <PrimaryAction
                icon={faWandMagicSparkles}
                label={labels.create ?? "Create!"}
                onPress={handleCreatePress}
                enabled={canCreate}
                blocked={createBlocked}
                large
                disabled={disabled}
              />
            )}
          </View>
        </View>
      )}

      {/* Step 2 — Make it special (OPTIONAL) */}
      {step === 2 && hasExtras && (
        <View style={styles.step}>
          <Text style={styles.title}>
            {labels.extrasTitle ?? "Make it special"}
          </Text>
          {extraLayers.map((layer) => (
            <View key={layer.id} style={styles.extraSection}>
              <Text style={styles.subTitle}>{layer.title}</Text>
              <TileCarousel
                layer={layer}
                selected={selection[layer.id] ?? []}
                locked={lockedKeys?.[layer.id] ?? []}
                disabled={disabled}
                size="sm"
                onToggle={(k) => toggleOption(layer, k)}
              />
            </View>
          ))}
          <View style={styles.navRowBetween}>
            <SecondaryAction
              icon={faArrowLeft}
              label={labels.back ?? "Back"}
              onPress={() => setStep(1)}
              disabled={disabled}
            />
            <PrimaryAction
              icon={faWandMagicSparkles}
              label={labels.create ?? "Create!"}
              onPress={handleCreatePress}
              enabled={canCreate}
              blocked={createBlocked}
              large
              disabled={disabled}
            />
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: 20,
    width: "100%",
  },
  diceRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  diceButton: {
    width: 44,
    height: 44,
    backgroundColor: COLORS.crayonOrange,
  },
  step: {
    gap: 16,
  },
  title: {
    fontFamily: FONTS.bold,
    fontSize: 24,
    color: COLORS.textPrimary,
    textAlign: "center",
  },
  // Sub-heading above a tile group in the subject step (Your friends / presets).
  groupLabel: {
    fontFamily: FONTS.semiBold,
    fontSize: 14,
    color: COLORS.textSecondary,
    paddingHorizontal: 4,
    marginBottom: -6,
  },
  subTitle: {
    fontFamily: FONTS.bold,
    fontSize: 16,
    color: COLORS.textPrimary,
    textAlign: "center",
  },
  extraSection: {
    gap: 8,
  },
  carousel: {
    gap: 12,
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  // ── tile ──
  tileWrapper: {
    alignItems: "center",
    gap: 8,
  },
  tileFace: {
    alignItems: "center",
    justifyContent: "center",
    // Circular disc with a chunky white "sticker" ring (borderRadius +
    // background colour are set inline per option/size). Soft lift on every
    // disc so they read as stickers, not flat circles.
    borderWidth: 4,
    borderColor: COLORS.white,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
  tileFaceDefault: {
    // Unselected character/preset disc: hide tileFace's white sticker ring +
    // elevation. On iOS those read as a subtle lift; on Android the white
    // `borderWidth: 4` is a hard opaque halo and `elevation` adds a heavy
    // circular drop-shadow iOS never shows. Keep borderWidth at the base 4px and
    // only make the COLOUR transparent — a transparent border draws nothing but
    // preserves the content box, so toggling selection (→ orange-coloured 4px
    // border) doesn't re-lay-out the <Image> and re-fire its cross-fade (which
    // caused a select/deselect flash when this was borderWidth: 0). The selected
    // state re-adds its own orange ring + halo.
    borderColor: "transparent",
    shadowOpacity: 0,
    elevation: 0,
  },
  tileFaceSelected: {
    // Bold orange ring + a warmer halo when picked.
    borderColor: COLORS.crayonOrange,
    shadowColor: "#FF8A3D",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 18,
    elevation: 8,
  },
  tileFaceAdd: {
    // The add tile strips ALL of tileFace's sticker chrome and draws only the
    // SVG DashedRing + the "+" icon. Every one of these properties produces an
    // octagon on Android for a large-radius disc:
    //   • borderWidth/borderColor (white sticker ring) → polygonized dashed/solid
    //     border
    //   • backgroundColor (set transparent inline) + overflow:'hidden' → clipped
    //     octagonal fill, and clips the round SVG ring's outer edge
    //   • elevation / shadow* → Android draws the drop-shadow from a polygonized
    //     outline, i.e. an octagonal shadow
    // SVG strokeDasharray renders a true circle on both platforms, so the ring
    // is the only visual and there's nothing left to polygonize.
    borderWidth: 0,
    borderColor: "transparent",
    overflow: "visible",
    shadowOpacity: 0,
    elevation: 0,
  },
  tileFaceDisabled: {
    opacity: 0.6,
  },
  thumbnail: {
    width: "100%",
    height: "100%",
  },
  lockWash: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(229,229,229,0.8)",
  },
  checkBadge: {
    position: "absolute",
    right: -8,
    top: -8,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.crayonOrange,
    borderWidth: 2,
    borderColor: COLORS.white,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 4,
  },
  tileLabel: {
    maxWidth: TILE_LG + 8,
    fontFamily: FONTS.semiBold,
    fontSize: 13,
    color: COLORS.textPrimary,
    textAlign: "center",
  },
  // ── nav ──
  navRowEnd: {
    flexDirection: "row",
    justifyContent: "flex-end",
    paddingTop: 4,
  },
  navRowBetween: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 4,
  },
  actionCircle: {
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 999,
  },
  actionDefault: {
    width: 48,
    height: 48,
  },
  actionLarge: {
    width: 56,
    height: 56,
  },
  actionFilled: {
    backgroundColor: COLORS.crayonOrange,
  },
  actionMuted: {
    backgroundColor: COLORS.bgCreamDark,
  },
  actionGhost: {
    backgroundColor: "transparent",
  },
});

export default SceneBuilder;

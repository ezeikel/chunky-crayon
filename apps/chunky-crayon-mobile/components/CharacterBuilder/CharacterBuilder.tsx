import { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  TextInput,
  StyleSheet,
} from "react-native";
import { FontAwesomeIcon } from "@fortawesome/react-native-fontawesome";
import {
  faArrowLeft,
  faArrowRight,
  faArrowRotateRight,
  faWandMagicSparkles,
} from "@fortawesome/pro-duotone-svg-icons";
import { faCheck } from "@fortawesome/pro-solid-svg-icons";
import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import Animated, {
  useAnimatedStyle,
  withSpring,
  ZoomIn,
} from "react-native-reanimated";
import {
  SPECIES_TILES,
  COLOR_TILES,
  TRAIT_TILES,
  VOICE_PERSONA_TILES,
  MAX_TRAITS,
  type SpeciesKey,
  type ColorKey,
  type TraitKey,
  type VoicePersonaKey,
  type DuotoneStyle,
} from "@/lib/characters/character-catalog";
import { generateCharacterName } from "@one-colored-pixel/coloring-core/characters";
import { useT } from "@/lib/i18n/useT";
import { tapLight } from "@/utils/haptics";
import { COLORS, FONTS } from "@/lib/design";

/**
 * CharacterBuilder — mobile RN port of web's CreateCharacterModal.
 *
 * A 3-8yo makes a reusable character by tapping through five steps:
 *   1 Species  — illustration/icon tiles (pick 1)
 *   2 Colour   — chunky brand swatches (pick 1)
 *   3 Traits   — icon tiles, multi-select up to MAX_TRAITS (optional)
 *   4 Name     — auto-generated name (editable) + Redo
 *   5 Voice    — persona tiles (optional; sets voicePersona only — custom
 *                voice generation is a later feature)
 *
 * Reuses the SceneBuilder visual family (tiles, carousel, circular nav
 * actions, check badge) so the two builders read as siblings. Controlled-
 * ish: owns its own wizard state, emits the final picks via onSubmit. The
 * host screen wraps it with the create mutation + close.
 *
 * Zero free-text required to finish (name auto-fills). Animations are
 * Reanimated. No "AI" copy, US/UK-neutral, tap targets ≥ 44pt.
 */

export type CharacterDraft = {
  name: string;
  species: SpeciesKey;
  color: ColorKey;
  traits: TraitKey[];
  voicePersona?: VoicePersonaKey;
};

type Props = {
  onSubmit: (draft: CharacterDraft) => void;
  /** True while the create request is in flight — disables nav + CTA. */
  submitting?: boolean;
};

type Step = "species" | "color" | "traits" | "name" | "voice";
const STEPS: readonly Step[] = ["species", "color", "traits", "name", "voice"];

const TILE = 96;

// ─── Tile (icon/thumbnail + label + check badge) ─────────────────────────────

type TileProps = {
  label: string;
  icon: IconDefinition;
  duotone: DuotoneStyle;
  selected: boolean;
  disabled: boolean;
  onPress: () => void;
};

const Tile = ({
  label,
  icon,
  duotone,
  selected,
  disabled,
  onPress,
}: TileProps) => {
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: withSpring(selected ? 1.05 : 1) }],
  }));
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={label}
      style={styles.tileWrapper}
    >
      <View style={{ width: TILE, height: TILE }}>
        <Animated.View
          style={[
            styles.tileFace,
            selected ? styles.tileFaceSelected : styles.tileFaceDefault,
            disabled && styles.tileFaceDisabled,
            animatedStyle,
          ]}
        >
          <FontAwesomeIcon
            icon={icon}
            size={48}
            color={duotone.primary}
            secondaryColor={duotone.secondary}
            secondaryOpacity={1}
          />
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
        {label}
      </Text>
    </Pressable>
  );
};

// ─── Circular nav actions (mirror SceneBuilder) ──────────────────────────────

const NavAction = ({
  icon,
  label,
  onPress,
  enabled,
  disabled,
  variant,
  large = false,
}: {
  icon: IconDefinition;
  label: string;
  onPress: () => void;
  enabled: boolean;
  disabled: boolean;
  variant: "primary" | "ghost";
  large?: boolean;
}) => {
  const pressable = enabled && !disabled;
  const handlePress = async () => {
    if (!pressable) return;
    await tapLight();
    onPress();
  };
  return (
    <Pressable
      onPress={handlePress}
      disabled={!pressable}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={[
        styles.actionCircle,
        large ? styles.actionLarge : styles.actionDefault,
        variant === "primary"
          ? enabled
            ? styles.actionFilled
            : styles.actionMuted
          : styles.actionGhost,
      ]}
    >
      <FontAwesomeIcon
        icon={icon}
        size={large ? 22 : 18}
        color={
          variant === "ghost"
            ? COLORS.textPrimary
            : enabled
              ? COLORS.white
              : "#A89F99"
        }
      />
    </Pressable>
  );
};

const CharacterBuilder = ({ onSubmit, submitting = false }: Props) => {
  const t = useT("mobile.characterBuilder");
  const [step, setStep] = useState<Step>("species");
  const [species, setSpecies] = useState<SpeciesKey | null>(null);
  const [color, setColor] = useState<ColorKey | null>(null);
  const [traits, setTraits] = useState<TraitKey[]>([]);
  const [name, setName] = useState("");
  const [nameTouched, setNameTouched] = useState(false);
  const [voicePersona, setVoicePersona] = useState<VoicePersonaKey | null>(
    null,
  );

  const stepIndex = STEPS.indexOf(step);

  // Seed a generated name when entering the name step (unless the parent
  // already typed a custom one). species/traits are the intentional triggers.
  useEffect(() => {
    if (step !== "name" || !species || nameTouched) return;
    setName(generateCharacterName({ species, traits }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, species, traits]);

  const canAdvance = useMemo(() => {
    switch (step) {
      case "species":
        return species !== null;
      case "color":
        return color !== null;
      case "traits":
        return true;
      case "name":
        return name.trim().length > 0 && name.trim().length <= 24;
      case "voice":
        return true;
      default:
        return false;
    }
  }, [step, species, color, name]);

  const goNext = () => {
    const next = STEPS[stepIndex + 1];
    if (next) setStep(next);
  };
  const goBack = () => {
    const prev = STEPS[stepIndex - 1];
    if (prev) setStep(prev);
  };

  const toggleTrait = (key: TraitKey) => {
    setTraits((prev) => {
      if (prev.includes(key)) return prev.filter((k) => k !== key);
      if (prev.length >= MAX_TRAITS) return prev;
      return [...prev, key];
    });
  };

  const handleShuffleName = () => {
    if (!species) return;
    setName(generateCharacterName({ species, traits }));
    setNameTouched(false);
  };

  const handleSubmit = () => {
    if (!species || !color || !name.trim()) return;
    onSubmit({
      name: name.trim(),
      species,
      color,
      traits,
      voicePersona: voicePersona ?? undefined,
    });
  };

  const speciesIcon = species
    ? SPECIES_TILES.find((s) => s.key === species)
    : null;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t(`step.${step}`)}</Text>

      {/* Progress bar */}
      <View style={styles.progressTrack}>
        <View
          style={[
            styles.progressFill,
            { width: `${((stepIndex + 1) / STEPS.length) * 100}%` },
          ]}
        />
      </View>

      {/* ── Species ── */}
      {step === "species" && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.carousel}
        >
          {SPECIES_TILES.map((o) => (
            <Tile
              key={o.key}
              label={o.label}
              icon={o.icon}
              duotone={o.duotone}
              selected={species === o.key}
              disabled={submitting}
              onPress={() => setSpecies(o.key)}
            />
          ))}
        </ScrollView>
      )}

      {/* ── Colour ── */}
      {step === "color" && (
        <View style={styles.colorGrid}>
          {COLOR_TILES.map((c) => {
            const selected = color === c.key;
            return (
              <Pressable
                key={c.key}
                onPress={() => setColor(c.key)}
                disabled={submitting}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                accessibilityLabel={c.label}
                style={[
                  styles.colorTile,
                  selected ? styles.colorTileSelected : styles.colorTileDefault,
                ]}
              >
                <View style={[styles.swatch, { backgroundColor: c.swatch }]} />
                <Text style={styles.colorLabel}>{c.label}</Text>
              </Pressable>
            );
          })}
        </View>
      )}

      {/* ── Traits ── */}
      {step === "traits" && (
        <View style={styles.stepBody}>
          <Text style={styles.subTitle}>
            {t("pickUpTo", { count: MAX_TRAITS })}
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.carousel}
          >
            {TRAIT_TILES.map((o) => (
              <Tile
                key={o.key}
                label={o.label}
                icon={o.icon}
                duotone={o.duotone}
                selected={traits.includes(o.key)}
                disabled={submitting}
                onPress={() => toggleTrait(o.key)}
              />
            ))}
          </ScrollView>
        </View>
      )}

      {/* ── Name ── */}
      {step === "name" && (
        <View style={styles.nameStep}>
          <View style={styles.nameHero}>
            {speciesIcon && (
              <FontAwesomeIcon
                icon={speciesIcon.icon}
                size={72}
                color={speciesIcon.duotone.primary}
                secondaryColor={speciesIcon.duotone.secondary}
                secondaryOpacity={1}
              />
            )}
          </View>
          <TextInput
            value={name}
            onChangeText={(v) => {
              setName(v.slice(0, 24));
              setNameTouched(true);
            }}
            placeholder={t("namePlaceholder")}
            placeholderTextColor={COLORS.textMuted}
            accessibilityLabel={t("nameLabel")}
            editable={!submitting}
            style={styles.nameInput}
          />
          <Pressable
            onPress={handleShuffleName}
            disabled={submitting}
            accessibilityRole="button"
            accessibilityLabel={t("redo")}
            style={({ pressed }) => [
              styles.redoButton,
              pressed && styles.redoPressed,
            ]}
          >
            <FontAwesomeIcon
              icon={faArrowRotateRight}
              size={22}
              color={COLORS.white}
            />
            <Text style={styles.redoLabel}>{t("redo")}</Text>
          </Pressable>
        </View>
      )}

      {/* ── Voice ── */}
      {step === "voice" && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.carousel}
        >
          {VOICE_PERSONA_TILES.map((o) => (
            <Tile
              key={o.key}
              label={o.label}
              icon={o.icon}
              duotone={o.duotone}
              selected={voicePersona === o.key}
              disabled={submitting}
              onPress={() =>
                setVoicePersona((prev) => (prev === o.key ? null : o.key))
              }
            />
          ))}
        </ScrollView>
      )}

      {/* ── Footer nav ── */}
      <View style={styles.navRow}>
        {stepIndex > 0 ? (
          <NavAction
            icon={faArrowLeft}
            label={t("back")}
            onPress={goBack}
            enabled
            disabled={submitting}
            variant="ghost"
          />
        ) : (
          <View style={styles.navSpacer} />
        )}

        {step === "voice" ? (
          <NavAction
            icon={faWandMagicSparkles}
            label={t("makeFriend")}
            onPress={handleSubmit}
            enabled={canAdvance}
            disabled={submitting}
            variant="primary"
            large
          />
        ) : (
          <NavAction
            icon={faArrowRight}
            label={t("next")}
            onPress={goNext}
            enabled={canAdvance}
            disabled={submitting}
            variant="primary"
          />
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: 20,
    width: "100%",
  },
  title: {
    fontFamily: FONTS.bold,
    fontSize: 24,
    color: COLORS.textPrimary,
    textAlign: "center",
  },
  subTitle: {
    fontFamily: FONTS.bold,
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: "center",
  },
  progressTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.bgCreamDark,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 4,
    backgroundColor: COLORS.crayonOrange,
  },
  stepBody: {
    gap: 12,
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
    width: TILE,
    height: TILE,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 20,
    borderWidth: 1,
    overflow: "hidden",
    backgroundColor: COLORS.white,
  },
  tileFaceDefault: {
    borderColor: COLORS.bgCreamDark,
  },
  tileFaceSelected: {
    borderColor: "transparent",
    shadowColor: "#FF8A3D",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 18,
    elevation: 8,
  },
  tileFaceDisabled: {
    opacity: 0.6,
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
    maxWidth: TILE + 8,
    fontFamily: FONTS.semiBold,
    fontSize: 13,
    color: COLORS.textPrimary,
    textAlign: "center",
  },
  // ── colour ──
  colorGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 12,
  },
  colorTile: {
    width: 96,
    height: 96,
    borderRadius: 20,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  colorTileDefault: {
    borderColor: COLORS.bgCreamDark,
  },
  colorTileSelected: {
    borderColor: COLORS.crayonOrange,
    borderWidth: 4,
    transform: [{ scale: 1.05 }],
  },
  swatch: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  colorLabel: {
    fontFamily: FONTS.semiBold,
    fontSize: 13,
    color: COLORS.textPrimary,
  },
  // ── name ──
  nameStep: {
    alignItems: "center",
    gap: 20,
    paddingVertical: 4,
  },
  nameHero: {
    width: 144,
    height: 144,
    borderRadius: 28,
    backgroundColor: COLORS.bgCream,
    alignItems: "center",
    justifyContent: "center",
  },
  nameInput: {
    width: "100%",
    maxWidth: 280,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: COLORS.bgCreamDark,
    backgroundColor: COLORS.white,
    paddingHorizontal: 16,
    paddingVertical: 12,
    textAlign: "center",
    fontFamily: FONTS.bold,
    fontSize: 28,
    color: COLORS.textPrimary,
  },
  redoButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    minHeight: 52,
    paddingHorizontal: 24,
    borderRadius: 999,
    backgroundColor: COLORS.crayonOrange,
  },
  redoPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.97 }],
  },
  redoLabel: {
    fontFamily: FONTS.bold,
    fontSize: 18,
    color: COLORS.white,
  },
  // ── nav ──
  navRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 4,
  },
  navSpacer: {
    width: 48,
    height: 48,
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
    borderWidth: 2,
    borderColor: COLORS.bgCreamDark,
  },
});

export default CharacterBuilder;

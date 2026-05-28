import { useCallback, useMemo, useRef } from "react";
import { View, Text, Pressable, ScrollView, StyleSheet } from "react-native";
import BottomSheet, { BottomSheetScrollView } from "@gorhom/bottom-sheet";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { FontAwesomeIcon } from "@fortawesome/react-native-fontawesome";
import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import {
  faPencil,
  faPaintbrush,
  faFillDrip,
  faSparkles,
  faStar,
  faRainbow,
  faBrush,
  faArrowRotateLeft,
  faArrowRotateRight,
  faCircle,
  faHeart,
  faTableCellsLarge,
  faBorderAll,
  faGripVertical,
  faEraser,
} from "@fortawesome/pro-duotone-svg-icons";
import { LinearGradient } from "expo-linear-gradient";
import { COLORS, CRAYON } from "@/lib/design";
import {
  useCanvasStore,
  Tool,
  BrushType,
  FillType,
  PatternType,
  MagicMode,
} from "@/stores/canvasStore";
import { PALETTE_COLORS } from "@/constants/Colors";
import { PATTERN_INFO } from "@/utils/patternUtils";
import BrushSizeSelector from "@/components/BrushSizeSelector/BrushSizeSelector";
import {
  tapLight,
  tapMedium,
  notifyWarning,
  selectionChanged,
} from "@/utils/haptics";

type ToolConfig = {
  id: string;
  tool: Tool;
  brushType?: BrushType;
  magicMode?: MagicMode;
  label: string;
  shortLabel?: string;
  icon: IconDefinition;
  isMagic?: boolean;
};

// Kids tool set, matching web's ToolSelector KIDS_TOOL_IDS:
// fill, crayon, marker, rainbow, eraser, sticker, magic-auto. Web removed
// glow/neon/sparkle/glitter (confusing UX) and gates magic-reveal +
// pencil out of the kids set — so we drop them here too. The brush-type
// rendering for the removed tools still exists in the canvas if needed.
const tools: ToolConfig[] = [
  {
    id: "crayon",
    tool: "brush",
    brushType: "crayon",
    label: "Crayon",
    icon: faPencil,
  },
  {
    id: "marker",
    tool: "brush",
    brushType: "marker",
    label: "Marker",
    icon: faPaintbrush,
  },
  {
    id: "rainbow",
    tool: "brush",
    brushType: "rainbow",
    label: "Rainbow",
    icon: faRainbow,
  },
  { id: "fill", tool: "fill", label: "Fill", icon: faFillDrip },
  { id: "eraser", tool: "eraser", label: "Eraser", icon: faEraser },
  { id: "sticker", tool: "sticker", label: "Sticker", icon: faStar },
  {
    id: "magic-auto",
    tool: "magic",
    magicMode: "auto",
    label: "Auto Color",
    shortLabel: "Auto",
    icon: faBrush,
    isMagic: true,
  },
];

const fillTypes: { type: FillType; label: string; icon: IconDefinition }[] = [
  { type: "solid", label: "Solid", icon: faCircle },
  { type: "pattern", label: "Pattern", icon: faTableCellsLarge },
];

const patternTypes: {
  type: PatternType;
  label: string;
  icon: IconDefinition;
}[] = [
  { type: "dots", label: PATTERN_INFO.dots.label, icon: faCircle },
  { type: "stripes", label: PATTERN_INFO.stripes.label, icon: faGripVertical },
  { type: "hearts", label: PATTERN_INFO.hearts.label, icon: faHeart },
  { type: "stars", label: PATTERN_INFO.stars.label, icon: faStar },
  { type: "zigzag", label: PATTERN_INFO.zigzag.label, icon: faBorderAll },
  { type: "confetti", label: PATTERN_INFO.confetti.label, icon: faSparkles },
];

const ToolButton = ({
  icon,
  label,
  isActive,
  onPress,
  disabled,
  small,
}: {
  icon: IconDefinition;
  label?: string;
  isActive?: boolean;
  onPress: () => void;
  disabled?: boolean;
  small?: boolean;
}) => (
  <Pressable
    onPress={onPress}
    disabled={disabled}
    style={[
      styles.toolButton,
      small && styles.toolButtonSmall,
      isActive && styles.toolButtonActive,
      disabled && styles.toolButtonDisabled,
    ]}
  >
    <FontAwesomeIcon
      icon={icon}
      size={small ? 16 : 18}
      color={
        isActive ? "#FFFFFF" : disabled ? COLORS.textMuted : COLORS.textPrimary
      }
      secondaryColor={isActive ? "rgba(255,255,255,0.85)" : COLORS.crayonPeach}
      secondaryOpacity={1}
    />
    {label && (
      <Text
        style={[
          styles.toolButtonLabel,
          isActive && styles.toolButtonLabelActive,
        ]}
        numberOfLines={1}
      >
        {label}
      </Text>
    )}
  </Pressable>
);

const SectionTitle = ({ title }: { title: string }) => (
  <Text style={styles.sectionTitle}>{title}</Text>
);

const MobileColoringToolbar = () => {
  const insets = useSafeAreaInsets();
  const bottomSheetRef = useRef<BottomSheet>(null);

  // Snap points: collapsed (tools + colors visible), expanded (all options)
  const snapPoints = useMemo(() => {
    const collapsedHeight = 140 + insets.bottom;
    const expandedHeight = 380 + insets.bottom;
    return [collapsedHeight, expandedHeight];
  }, [insets.bottom]);

  const {
    selectedTool,
    selectedColor,
    brushType,
    fillType,
    selectedPattern,
    magicMode,
    setTool,
    setColor,
    setBrushType,
    setFillType,
    setPattern,
    setMagicMode,
    undo,
    redo,
    canUndo,
    canRedo,
  } = useCanvasStore();

  const handleToolSelect = (config: ToolConfig) => {
    tapLight();
    setTool(config.tool);
    if (config.brushType) {
      setBrushType(config.brushType);
    }
    if (config.magicMode) {
      setMagicMode(config.magicMode);
    }
  };

  const isToolActive = (config: ToolConfig) => {
    if (config.tool === "magic") {
      return selectedTool === "magic" && magicMode === config.magicMode;
    }
    if (config.tool === "brush" && config.brushType) {
      return selectedTool === "brush" && brushType === config.brushType;
    }
    return selectedTool === config.tool;
  };

  const handleSheetChanges = useCallback((index: number) => {
    // Optional: handle sheet position changes
  }, []);

  return (
    <BottomSheet
      ref={bottomSheetRef}
      index={0}
      snapPoints={snapPoints}
      onChange={handleSheetChanges}
      backgroundStyle={styles.sheetBackground}
      handleIndicatorStyle={styles.handleIndicator}
      enablePanDownToClose={false}
    >
      <BottomSheetScrollView
        contentContainerStyle={[
          styles.contentContainer,
          { paddingBottom: insets.bottom + 8 },
        ]}
      >
        {/* Main Tools Row */}
        <View style={styles.section}>
          <SectionTitle title="Tools" />
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.horizontalScroll}
          >
            {tools.map((config) => {
              const active = isToolActive(config);

              // Magic tools: purple→pink gradient face + a sparkles badge
              // poking out the corner (web ToolSelector). Active = full
              // gradient + white icon; inactive = soft 12%-tint gradient +
              // magic-from icon.
              if (config.isMagic) {
                return (
                  <Pressable
                    key={config.id}
                    onPress={() => handleToolSelect(config)}
                    style={styles.magicWrap}
                  >
                    <LinearGradient
                      colors={
                        active
                          ? [CRAYON.purple.base, CRAYON.pink.base]
                          : [`${CRAYON.purple.base}1F`, `${CRAYON.pink.base}1F`]
                      }
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.magicButton}
                    >
                      <FontAwesomeIcon
                        icon={config.icon}
                        size={20}
                        color={active ? "#FFFFFF" : CRAYON.purple.base}
                        secondaryColor={
                          active ? "rgba(255,255,255,0.85)" : CRAYON.pink.base
                        }
                        secondaryOpacity={1}
                      />
                    </LinearGradient>
                    <View style={styles.magicBadge} pointerEvents="none">
                      <FontAwesomeIcon
                        icon={faSparkles}
                        size={11}
                        color={active ? "#FFFFFF" : CRAYON.purple.base}
                        secondaryColor={CRAYON.pink.base}
                        secondaryOpacity={1}
                      />
                    </View>
                  </Pressable>
                );
              }

              return (
                <Pressable
                  key={config.id}
                  onPress={() => handleToolSelect(config)}
                  style={[
                    styles.mainToolButton,
                    active
                      ? styles.mainToolButtonActive
                      : styles.mainToolButtonIdle,
                  ]}
                >
                  <FontAwesomeIcon
                    icon={config.icon}
                    size={22}
                    color={active ? "#FFFFFF" : COLORS.textPrimary}
                    secondaryColor={
                      active ? "rgba(255,255,255,0.85)" : COLORS.crayonPeach
                    }
                    secondaryOpacity={1}
                  />
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        {/* Colors Row */}
        <View style={styles.section}>
          <SectionTitle title="Colors" />
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.horizontalScroll}
          >
            {PALETTE_COLORS.map((color) => {
              const isSelected = selectedColor === color;
              return (
                <Pressable
                  key={color}
                  onPress={() => {
                    selectionChanged();
                    setColor(color);
                  }}
                  style={[
                    styles.swatchWrap,
                    isSelected && styles.swatchWrapSelected,
                  ]}
                >
                  <View
                    style={[
                      { backgroundColor: color },
                      isSelected
                        ? styles.colorSwatchSelected
                        : styles.colorSwatch,
                    ]}
                  />
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        {/* Brush Size (when brush tool is selected) */}
        {selectedTool === "brush" && (
          <View style={styles.section}>
            <SectionTitle title="Brush Size" />
            <BrushSizeSelector />
          </View>
        )}

        {/* Fill Types (when fill tool is selected) */}
        {selectedTool === "fill" && (
          <>
            <View style={styles.section}>
              <SectionTitle title="Fill Type" />
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.horizontalScroll}
              >
                {fillTypes.map(({ type, label, icon }) => (
                  <ToolButton
                    key={type}
                    icon={icon}
                    label={label}
                    isActive={fillType === type}
                    onPress={() => {
                      tapLight();
                      setFillType(type);
                    }}
                    small
                  />
                ))}
              </ScrollView>
            </View>

            {/* Pattern Types (when pattern fill is selected) */}
            {fillType === "pattern" && (
              <View style={styles.section}>
                <SectionTitle title="Pattern" />
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.horizontalScroll}
                >
                  {patternTypes.map(({ type, label, icon }) => (
                    <ToolButton
                      key={type}
                      icon={icon}
                      label={label}
                      isActive={selectedPattern === type}
                      onPress={() => {
                        tapLight();
                        setPattern(type);
                      }}
                      small
                    />
                  ))}
                </ScrollView>
              </View>
            )}
          </>
        )}

        {/* Undo/Redo */}
        <View style={styles.section}>
          <SectionTitle title="History" />
          <View style={styles.undoRedoRow}>
            <ToolButton
              icon={faArrowRotateLeft}
              label="Undo"
              disabled={!canUndo()}
              onPress={() => {
                if (canUndo()) {
                  tapMedium();
                  undo();
                } else {
                  notifyWarning();
                }
              }}
              small
            />
            <ToolButton
              icon={faArrowRotateRight}
              label="Redo"
              disabled={!canRedo()}
              onPress={() => {
                if (canRedo()) {
                  tapMedium();
                  redo();
                } else {
                  notifyWarning();
                }
              }}
              small
            />
          </View>
        </View>
      </BottomSheetScrollView>
    </BottomSheet>
  );
};

const styles = StyleSheet.create({
  sheetBackground: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 10,
  },
  handleIndicator: {
    backgroundColor: "#D1D5DB",
    width: 40,
    height: 4,
  },
  contentContainer: {
    paddingHorizontal: 16,
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    color: COLORS.textMuted,
    marginBottom: 8,
    fontFamily: "RooneySans-Bold",
  },
  horizontalScroll: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
  },
  // Small labelled tool tile (fill-type / pattern / undo-redo rows). White
  // cream-bordered tile, orange when active — matches web's tool tiles.
  toolButton: {
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: COLORS.bgCreamDark,
    backgroundColor: COLORS.white,
    minWidth: 56,
  },
  toolButtonSmall: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    minWidth: 48,
  },
  toolButtonActive: {
    backgroundColor: COLORS.crayonOrange,
    borderColor: COLORS.crayonOrange,
  },
  toolButtonDisabled: {
    opacity: 0.5,
  },
  toolButtonLabel: {
    fontSize: 10,
    fontFamily: "RooneySans-Regular",
    color: COLORS.textPrimary,
    marginTop: 2,
  },
  toolButtonLabelActive: {
    color: "#FFFFFF",
    fontFamily: "RooneySans-Bold",
  },
  // Main tool tile (the Tools row). 48² rounded-coloring-card, white face
  // + cream border; orange fill + soft accent glow when active.
  mainToolButton: {
    width: 48,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 20,
    borderWidth: 2,
  },
  mainToolButtonIdle: {
    backgroundColor: COLORS.white,
    borderColor: COLORS.bgCreamDark,
  },
  mainToolButtonActive: {
    backgroundColor: COLORS.crayonOrange,
    borderColor: COLORS.crayonOrange,
    shadowColor: COLORS.crayonOrange,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 14,
    elevation: 6,
  },
  // Magic tool — gradient face + corner sparkles badge.
  magicWrap: {
    width: 48,
    height: 48,
  },
  magicButton: {
    width: 48,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 20,
  },
  magicBadge: {
    position: "absolute",
    top: -6,
    right: -6,
    width: 20,
    height: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  // Swatch + selected-halo, mirroring ColorPalette: the orange ring +
  // offset live on the wrapper; the selected swatch keeps a white inner
  // border so the colour reads as lifted inside the ring.
  swatchWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  swatchWrapSelected: {
    borderWidth: 2,
    borderColor: COLORS.crayonOrange,
    padding: 2,
  },
  colorSwatch: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 2,
    borderColor: COLORS.bgCreamDark,
  },
  colorSwatchSelected: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: COLORS.white,
  },
  undoRedoRow: {
    flexDirection: "row",
    gap: 12,
  },
});

export default MobileColoringToolbar;

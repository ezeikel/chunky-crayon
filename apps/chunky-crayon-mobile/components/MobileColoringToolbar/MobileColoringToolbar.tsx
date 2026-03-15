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
  faSun,
  faBoltLightning,
  faBrush,
  faArrowRotateLeft,
  faArrowRotateRight,
  faCircle,
  faHeart,
  faTableCellsLarge,
  faBorderAll,
  faGripVertical,
  faEraser,
} from "@fortawesome/pro-solid-svg-icons";
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

// All tools in a single row (matching web's ToolSelector pattern)
const tools: ToolConfig[] = [
  // Brush-based tools
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
    id: "pencil",
    tool: "brush",
    brushType: "pencil",
    label: "Pencil",
    icon: faPencil,
  },
  {
    id: "glitter",
    tool: "brush",
    brushType: "glitter",
    label: "Glitter",
    icon: faSparkles,
  },
  {
    id: "rainbow",
    tool: "brush",
    brushType: "rainbow",
    label: "Rainbow",
    icon: faRainbow,
  },
  {
    id: "glow",
    tool: "brush",
    brushType: "glow",
    label: "Glow",
    icon: faSun,
  },
  {
    id: "neon",
    tool: "brush",
    brushType: "neon",
    label: "Neon",
    icon: faBoltLightning,
  },
  // Non-brush tools
  { id: "fill", tool: "fill", label: "Fill", icon: faFillDrip },
  { id: "eraser", tool: "eraser", label: "Eraser", icon: faEraser },
  { id: "sticker", tool: "sticker", label: "Sticker", icon: faStar },
  // Magic tools
  {
    id: "magic-suggest",
    tool: "magic",
    magicMode: "suggest",
    label: "Magic",
    shortLabel: "Magic",
    icon: faBrush,
    isMagic: true,
  },
  {
    id: "magic-auto",
    tool: "magic",
    magicMode: "auto",
    label: "Auto Color",
    shortLabel: "Auto",
    icon: faFillDrip,
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
      color={isActive ? "#FFFFFF" : disabled ? "#9CA3AF" : "#4B5563"}
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
            {tools.map((config) => (
              <Pressable
                key={config.id}
                onPress={() => handleToolSelect(config)}
                style={[
                  styles.mainToolButton,
                  config.isMagic && styles.mainToolButtonMagic,
                  isToolActive(config) && styles.mainToolButtonActive,
                ]}
              >
                <FontAwesomeIcon
                  icon={config.icon}
                  size={config.isMagic ? 16 : 20}
                  color={isToolActive(config) ? "#FFFFFF" : "#4B5563"}
                />
                {config.isMagic && config.shortLabel && (
                  <Text
                    style={[
                      styles.magicLabel,
                      isToolActive(config) && styles.magicLabelActive,
                    ]}
                  >
                    {config.shortLabel}
                  </Text>
                )}
              </Pressable>
            ))}
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
            {PALETTE_COLORS.map((color) => (
              <Pressable
                key={color}
                onPress={() => {
                  selectionChanged();
                  setColor(color);
                }}
              >
                <View
                  style={[
                    styles.colorSwatch,
                    { backgroundColor: color },
                    selectedColor === color && styles.colorSwatchActive,
                  ]}
                />
              </Pressable>
            ))}
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
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    color: "#9CA3AF",
    marginBottom: 8,
    fontFamily: "RooneySans-Bold",
  },
  horizontalScroll: {
    flexDirection: "row",
    gap: 8,
  },
  toolButton: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: "#F3F4F6",
    minWidth: 56,
  },
  toolButtonSmall: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    minWidth: 48,
  },
  toolButtonActive: {
    backgroundColor: "#E46444",
  },
  toolButtonDisabled: {
    backgroundColor: "#E5E7EB",
    opacity: 0.5,
  },
  toolButtonLabel: {
    fontSize: 10,
    fontFamily: "RooneySans-Regular",
    color: "#4B5563",
    marginTop: 2,
  },
  toolButtonLabelActive: {
    color: "#FFFFFF",
    fontWeight: "bold",
  },
  mainToolButton: {
    width: 48,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    backgroundColor: "#F3F4F6",
  },
  mainToolButtonMagic: {
    width: 56,
    gap: 2,
  },
  mainToolButtonActive: {
    backgroundColor: "#E46444",
  },
  magicLabel: {
    fontSize: 8,
    fontWeight: "bold",
    textTransform: "uppercase",
    color: "#4B5563",
  },
  magicLabelActive: {
    color: "#FFFFFF",
  },
  colorSwatch: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: "#E5E7EB",
  },
  colorSwatchActive: {
    borderWidth: 3,
    borderColor: "#374151",
  },
  undoRedoRow: {
    flexDirection: "row",
    gap: 12,
  },
});

export default MobileColoringToolbar;

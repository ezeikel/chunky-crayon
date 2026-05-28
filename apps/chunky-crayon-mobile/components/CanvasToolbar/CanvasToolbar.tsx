import { Pressable, View, Text, ScrollView, StyleSheet } from "react-native";
import { FontAwesomeIcon } from "@fortawesome/react-native-fontawesome";
import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import {
  faPencil,
  faPaintbrush,
  faFillDrip,
  faSparkles,
  faWandSparkles,
  faStar,
  faRainbow,
  faBrush,
  faArrowRotateLeft,
  faArrowRotateRight,
  faCircle,
  faHeart,
  faDog,
  faLeaf,
  faAppleWhole,
  faFaceSmile,
  faCloudSun,
  faTableCellsLarge,
  faBorderAll,
  faGripVertical,
} from "@fortawesome/pro-duotone-svg-icons";
import { COLORS } from "@/lib/design";
import {
  useCanvasStore,
  Tool,
  BrushType,
  FillType,
  PatternType,
  StickerCategory,
  MagicMode,
  STICKER_CATEGORIES,
} from "@/stores/canvasStore";
import { perfect } from "@/styles";
import { tapLight, tapMedium, notifyWarning } from "@/utils/haptics";
import { PATTERN_INFO } from "@/utils/patternUtils";

type CanvasToolbarProps = {
  style?: Record<string, unknown>;
};

const ToolButton = ({
  label,
  icon,
  isActive,
  onPress,
  disabled,
}: {
  label: string;
  icon: IconDefinition;
  isActive?: boolean;
  onPress: () => void;
  disabled?: boolean;
}) => (
  <Pressable
    onPress={onPress}
    disabled={disabled}
    style={[
      styles.button,
      isActive ? styles.buttonActive : styles.buttonIdle,
      disabled && styles.buttonDisabled,
    ]}
  >
    <FontAwesomeIcon
      icon={icon}
      size={20}
      color={
        isActive ? "#FFFFFF" : disabled ? COLORS.textMuted : COLORS.textPrimary
      }
      secondaryColor={isActive ? "rgba(255,255,255,0.85)" : COLORS.crayonPeach}
      secondaryOpacity={1}
    />
    <Text
      style={[
        styles.buttonLabel,
        isActive ? styles.buttonLabelActive : styles.buttonLabelInactive,
      ]}
    >
      {label}
    </Text>
  </Pressable>
);

const CanvasToolbar = ({ style }: CanvasToolbarProps) => {
  const {
    selectedTool,
    brushType,
    fillType,
    selectedPattern,
    selectedSticker,
    stickerCategory,
    magicMode,
    setTool,
    setBrushType,
    setFillType,
    setPattern,
    setSticker,
    setStickerCategory,
    setMagicMode,
    undo,
    redo,
    canUndo,
    canRedo,
    clearHistory,
  } = useCanvasStore();

  const tools: { tool: Tool; label: string; icon: IconDefinition }[] = [
    { tool: "brush", label: "Draw", icon: faPencil },
    { tool: "fill", label: "Fill", icon: faFillDrip },
    { tool: "sticker", label: "Sticker", icon: faStar },
    { tool: "magic", label: "Magic", icon: faWandSparkles },
  ];

  const magicModes: { mode: MagicMode; label: string; icon: IconDefinition }[] =
    [
      { mode: "suggest", label: "Magic", icon: faBrush },
      { mode: "auto", label: "Auto", icon: faFillDrip },
    ];

  const stickerCategoryInfo: {
    category: StickerCategory;
    label: string;
    icon: IconDefinition;
  }[] = [
    { category: "animals", label: "Animals", icon: faDog },
    { category: "nature", label: "Nature", icon: faLeaf },
    { category: "food", label: "Food", icon: faAppleWhole },
    { category: "faces", label: "Faces", icon: faFaceSmile },
    { category: "objects", label: "Objects", icon: faStar },
    { category: "weather", label: "Weather", icon: faCloudSun },
  ];

  // Kids brush set — web removed glow/neon/glitter/pencil (confusing UX).
  const brushTypes: { type: BrushType; label: string; icon: IconDefinition }[] =
    [
      { type: "crayon", label: "Crayon", icon: faPencil },
      { type: "marker", label: "Marker", icon: faPaintbrush },
      { type: "rainbow", label: "Rainbow", icon: faRainbow },
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
    {
      type: "stripes",
      label: PATTERN_INFO.stripes.label,
      icon: faGripVertical,
    },
    { type: "hearts", label: PATTERN_INFO.hearts.label, icon: faHeart },
    { type: "stars", label: PATTERN_INFO.stars.label, icon: faStar },
    { type: "zigzag", label: PATTERN_INFO.zigzag.label, icon: faBorderAll },
    { type: "confetti", label: PATTERN_INFO.confetti.label, icon: faSparkles },
  ];

  return (
    <View
      className="rounded-lg bg-white p-3"
      style={[style, perfect.boxShadow]}
    >
      {/* Tool Selection Row */}
      <View className="flex-row justify-between mb-3">
        <View className="flex-row gap-2">
          {tools.map(({ tool, label, icon }) => (
            <ToolButton
              key={tool}
              label={label}
              icon={icon}
              isActive={selectedTool === tool}
              onPress={() => {
                tapLight();
                setTool(tool);
              }}
            />
          ))}
        </View>

        {/* Undo/Redo */}
        <View className="flex-row gap-2">
          <ToolButton
            label="Undo"
            icon={faArrowRotateLeft}
            onPress={() => {
              if (canUndo()) {
                tapMedium();
                undo();
              } else {
                notifyWarning();
              }
            }}
            disabled={!canUndo()}
          />
          <ToolButton
            label="Redo"
            icon={faArrowRotateRight}
            onPress={() => {
              if (canRedo()) {
                tapMedium();
                redo();
              } else {
                notifyWarning();
              }
            }}
            disabled={!canRedo()}
          />
        </View>
      </View>

      {/* Brush Type Selection (only show when brush tool is selected) */}
      {selectedTool === "brush" && (
        <View className="flex-row gap-2 pt-2 border-t border-[#F4EEE6]">
          {brushTypes.map(({ type, label, icon }) => (
            <ToolButton
              key={type}
              label={label}
              icon={icon}
              isActive={brushType === type}
              onPress={() => {
                tapLight();
                setBrushType(type);
              }}
            />
          ))}
        </View>
      )}

      {/* Fill Type Selection (only show when fill tool is selected) */}
      {selectedTool === "fill" && (
        <>
          <View className="flex-row gap-2 pt-2 border-t border-[#F4EEE6]">
            {fillTypes.map(({ type, label, icon }) => (
              <ToolButton
                key={type}
                label={label}
                icon={icon}
                isActive={fillType === type}
                onPress={() => {
                  tapLight();
                  setFillType(type);
                }}
              />
            ))}
          </View>

          {/* Pattern Selection (only show when pattern fill is selected) */}
          {fillType === "pattern" && (
            <View className="flex-row flex-wrap gap-2 pt-2 border-t border-[#F4EEE6] mt-2">
              {patternTypes.map(({ type, label, icon }) => (
                <ToolButton
                  key={type}
                  label={label}
                  icon={icon}
                  isActive={selectedPattern === type}
                  onPress={() => {
                    tapLight();
                    setPattern(type);
                  }}
                />
              ))}
            </View>
          )}
        </>
      )}

      {/* Sticker Selection (only show when sticker tool is selected) */}
      {selectedTool === "sticker" && (
        <>
          {/* Category Selection */}
          <View className="flex-row gap-2 pt-2 border-t border-[#F4EEE6]">
            {stickerCategoryInfo.map(({ category, label, icon }) => (
              <ToolButton
                key={category}
                label={label}
                icon={icon}
                isActive={stickerCategory === category}
                onPress={() => {
                  tapLight();
                  setStickerCategory(category);
                  // Auto-select first sticker in category
                  setSticker(STICKER_CATEGORIES[category][0]);
                }}
              />
            ))}
          </View>

          {/* Sticker Grid */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            className="pt-2 border-t border-[#F4EEE6] mt-2"
          >
            <View className="flex-row gap-2">
              {STICKER_CATEGORIES[stickerCategory].map((sticker, index) => (
                <Pressable
                  key={`${stickerCategory}-${index}`}
                  onPress={() => {
                    tapLight();
                    setSticker(sticker);
                  }}
                  style={[
                    styles.stickerTile,
                    selectedSticker === sticker
                      ? styles.buttonActive
                      : styles.buttonIdle,
                  ]}
                >
                  <Text style={styles.stickerEmoji}>{sticker}</Text>
                </Pressable>
              ))}
            </View>
          </ScrollView>
        </>
      )}

      {/* Magic Mode Selection (only show when magic tool is selected) */}
      {selectedTool === "magic" && (
        <View className="flex-row gap-2 pt-2 border-t border-[#F4EEE6]">
          {magicModes.map(({ mode, label, icon }) => (
            <ToolButton
              key={mode}
              label={label}
              icon={icon}
              isActive={magicMode === mode}
              onPress={() => {
                tapLight();
                setMagicMode(mode);
              }}
            />
          ))}
          <View className="flex-1 items-end justify-center">
            <Text style={styles.hintText}>
              {magicMode === "suggest"
                ? "Tap to see color hints"
                : "Tap to color entire image"}
            </Text>
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  // White cream-bordered tool tile, orange-fill when active — matches
  // web's ToolSelector + the rest of the mobile canvas chrome.
  button: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 2,
    minWidth: 56,
  },
  buttonIdle: {
    backgroundColor: COLORS.white,
    borderColor: COLORS.bgCreamDark,
  },
  buttonActive: {
    backgroundColor: COLORS.crayonOrange,
    borderColor: COLORS.crayonOrange,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonLabel: {
    fontSize: 12,
    marginTop: 2,
    fontFamily: "RooneySans-Regular",
  },
  buttonLabelActive: {
    color: "#FFF",
    fontFamily: "RooneySans-Bold",
  },
  buttonLabelInactive: {
    color: COLORS.textPrimary,
  },
  stickerTile: {
    alignItems: "center",
    justifyContent: "center",
    width: 48,
    height: 48,
    borderRadius: 16,
    borderWidth: 2,
  },
  stickerEmoji: {
    fontSize: 24,
  },
  hintText: {
    fontSize: 12,
    color: COLORS.textMuted,
    fontFamily: "RooneySans-Regular",
  },
});

export default CanvasToolbar;

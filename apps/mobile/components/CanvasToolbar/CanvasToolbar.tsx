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
  faSun,
  faBoltLightning,
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
} from "@fortawesome/pro-solid-svg-icons";
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
    className={`items-center justify-center px-3 py-2 rounded-lg min-w-14 ${
      isActive
        ? "bg-[#E46444]"
        : disabled
          ? "bg-gray-200 opacity-50"
          : "bg-gray-100"
    }`}
  >
    <FontAwesomeIcon
      icon={icon}
      size={20}
      color={isActive ? "#FFFFFF" : disabled ? "#9CA3AF" : "#4B5563"}
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

  const brushTypes: { type: BrushType; label: string; icon: IconDefinition }[] =
    [
      { type: "crayon", label: "Crayon", icon: faPencil },
      { type: "marker", label: "Marker", icon: faPaintbrush },
      { type: "pencil", label: "Pencil", icon: faPencil },
      { type: "rainbow", label: "Rainbow", icon: faRainbow },
      { type: "glow", label: "Glow", icon: faSun },
      { type: "neon", label: "Neon", icon: faBoltLightning },
      { type: "glitter", label: "Glitter", icon: faSparkles },
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
        <View className="flex-row gap-2 pt-2 border-t border-gray-200">
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
          <View className="flex-row gap-2 pt-2 border-t border-gray-200">
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
            <View className="flex-row flex-wrap gap-2 pt-2 border-t border-gray-200 mt-2">
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
          <View className="flex-row gap-2 pt-2 border-t border-gray-200">
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
            className="pt-2 border-t border-gray-200 mt-2"
          >
            <View className="flex-row gap-2">
              {STICKER_CATEGORIES[stickerCategory].map((sticker, index) => (
                <Pressable
                  key={`${stickerCategory}-${index}`}
                  onPress={() => {
                    tapLight();
                    setSticker(sticker);
                  }}
                  className={`items-center justify-center w-12 h-12 rounded-lg ${
                    selectedSticker === sticker ? "bg-[#E46444]" : "bg-gray-100"
                  }`}
                >
                  <Text className="text-2xl">{sticker}</Text>
                </Pressable>
              ))}
            </View>
          </ScrollView>
        </>
      )}

      {/* Magic Mode Selection (only show when magic tool is selected) */}
      {selectedTool === "magic" && (
        <View className="flex-row gap-2 pt-2 border-t border-gray-200">
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
  buttonLabel: {
    fontSize: 12,
    marginTop: 2,
    fontFamily: "RooneySans-Regular",
  },
  buttonLabelActive: {
    color: "#FFF",
    fontWeight: "bold",
  },
  buttonLabelInactive: {
    color: "#4B5563",
  },
  hintText: {
    fontSize: 12,
    color: "#6B7280",
    fontFamily: "RooneySans-Regular",
  },
});

export default CanvasToolbar;

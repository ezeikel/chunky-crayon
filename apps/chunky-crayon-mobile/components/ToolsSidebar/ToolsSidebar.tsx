import { useCallback } from "react";
import { View, Text, Pressable, ScrollView, StyleSheet } from "react-native";
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
  faEraser,
  faToolbox,
  faRuler,
  faClockRotateLeft,
  faMagnifyingGlassPlus,
  faMagnifyingGlassMinus,
  faExpand,
} from "@fortawesome/pro-solid-svg-icons";
import {
  useCanvasStore,
  Tool,
  BrushType,
  MagicMode,
} from "@/stores/canvasStore";
import { tapLight, tapMedium, notifyWarning } from "@/utils/haptics";
import { BRUSH_SIZES } from "@/constants/Colors";

type ToolConfig = {
  id: string;
  tool: Tool;
  brushType?: BrushType;
  magicMode?: MagicMode;
  label: string;
  icon: IconDefinition;
  isMagic?: boolean;
};

// Regular tools shown as 4-column grid (matching web's DesktopToolsSidebar)
const regularTools: ToolConfig[] = [
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
  { id: "glow", tool: "brush", brushType: "glow", label: "Glow", icon: faSun },
  {
    id: "neon",
    tool: "brush",
    brushType: "neon",
    label: "Neon",
    icon: faBoltLightning,
  },
  { id: "fill", tool: "fill", label: "Fill", icon: faFillDrip },
  { id: "eraser", tool: "eraser", label: "Eraser", icon: faEraser },
  { id: "sticker", tool: "sticker", label: "Sticker", icon: faStar },
];

// Magic tools shown with labels (matching web's featured magic tools)
const magicTools: ToolConfig[] = [
  {
    id: "magic-suggest",
    tool: "magic",
    magicMode: "suggest",
    label: "Magic Brush",
    icon: faBrush,
    isMagic: true,
  },
  {
    id: "magic-auto",
    tool: "magic",
    magicMode: "auto",
    label: "Auto Color",
    icon: faFillDrip,
    isMagic: true,
  },
];

// Brush sizes (matching web)
const brushSizes: { label: string; value: number; radius: number }[] = [
  { label: "S", value: BRUSH_SIZES.small, radius: BRUSH_SIZES.small },
  { label: "M", value: BRUSH_SIZES.medium, radius: BRUSH_SIZES.medium },
  { label: "L", value: BRUSH_SIZES.large, radius: BRUSH_SIZES.large },
  {
    label: "XL",
    value: BRUSH_SIZES.extraLarge,
    radius: BRUSH_SIZES.extraLarge,
  },
];

type ToolsSidebarProps = {
  /** Width of the sidebar */
  width: number;
  /** Zoom handlers from parent */
  onZoomIn?: () => void;
  onZoomOut?: () => void;
  onResetZoom?: () => void;
  /** Current zoom level (1 = 100%) */
  zoom?: number;
  minZoom?: number;
  maxZoom?: number;
};

/**
 * Right sidebar tools panel for landscape layouts.
 * Matches web's DesktopToolsSidebar with sections:
 * - Tools (4-column grid)
 * - Magic Tools (featured with labels)
 * - Brush Size
 * - Undo/Redo
 * - Zoom Controls
 */
const ToolsSidebar = ({
  width,
  onZoomIn,
  onZoomOut,
  onResetZoom,
  zoom = 1,
  minZoom = 0.5,
  maxZoom = 3,
}: ToolsSidebarProps) => {
  const insets = useSafeAreaInsets();

  const {
    selectedTool,
    brushType,
    brushSize,
    magicMode,
    selectedColor,
    setTool,
    setBrushType,
    setBrushSize,
    setMagicMode,
    undo,
    redo,
    canUndo,
    canRedo,
  } = useCanvasStore();

  const handleToolSelect = useCallback(
    (config: ToolConfig) => {
      tapLight();
      setTool(config.tool);
      if (config.brushType) {
        setBrushType(config.brushType);
      }
      if (config.magicMode) {
        setMagicMode(config.magicMode);
      }
    },
    [setTool, setBrushType, setMagicMode],
  );

  const isToolActive = useCallback(
    (config: ToolConfig) => {
      if (config.tool === "magic") {
        return selectedTool === "magic" && magicMode === config.magicMode;
      }
      if (config.tool === "brush" && config.brushType) {
        return selectedTool === "brush" && brushType === config.brushType;
      }
      return selectedTool === config.tool;
    },
    [selectedTool, brushType, magicMode],
  );

  const handleUndo = () => {
    if (canUndo()) {
      tapMedium();
      undo();
    } else {
      notifyWarning();
    }
  };

  const handleRedo = () => {
    if (canRedo()) {
      tapMedium();
      redo();
    } else {
      notifyWarning();
    }
  };

  // Calculate button size based on width (4-column grid with gaps)
  const paddingHorizontal = 12;
  const gap = 6;
  const availableWidth = width - paddingHorizontal * 2 - insets.right;
  const buttonSize = Math.floor((availableWidth - gap * 3) / 4);
  const clampedButtonSize = Math.max(32, Math.min(buttonSize, 48));

  return (
    <View
      style={[
        styles.container,
        {
          width,
          paddingRight: insets.right + paddingHorizontal,
          paddingLeft: paddingHorizontal,
          paddingTop: insets.top + 12,
          paddingBottom: insets.bottom + 12,
        },
      ]}
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Tools Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <FontAwesomeIcon icon={faToolbox} size={16} color="#E46444" />
            <Text style={styles.sectionTitle}>Tools</Text>
          </View>

          {/* Regular Tool Grid - 4 columns */}
          <View style={[styles.toolGrid, { gap }]}>
            {regularTools.map((config) => {
              const isActive = isToolActive(config);
              return (
                <Pressable
                  key={config.id}
                  onPress={() => handleToolSelect(config)}
                  style={[
                    styles.toolButton,
                    {
                      width: clampedButtonSize,
                      height: clampedButtonSize,
                    },
                    isActive && styles.toolButtonActive,
                  ]}
                  accessibilityLabel={config.label}
                >
                  <FontAwesomeIcon
                    icon={config.icon}
                    size={clampedButtonSize * 0.45}
                    color={isActive ? "#FFFFFF" : "#4B5563"}
                  />
                </Pressable>
              );
            })}
          </View>

          {/* Magic Tools - Full width with labels */}
          <View style={[styles.magicToolsContainer, { gap: 6 }]}>
            {magicTools.map((config) => {
              const isActive = isToolActive(config);
              return (
                <Pressable
                  key={config.id}
                  onPress={() => handleToolSelect(config)}
                  style={[
                    styles.magicToolButton,
                    isActive && styles.magicToolButtonActive,
                  ]}
                  accessibilityLabel={config.label}
                >
                  <FontAwesomeIcon
                    icon={config.icon}
                    size={16}
                    color={isActive ? "#FFFFFF" : "#8E24AA"}
                  />
                  <Text
                    style={[
                      styles.magicToolLabel,
                      isActive && styles.magicToolLabelActive,
                    ]}
                  >
                    {config.label}
                  </Text>
                  <Text style={[styles.magicEmoji, isActive && { opacity: 1 }]}>
                    ✨
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Divider */}
        <View style={styles.divider} />

        {/* Brush Size Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <FontAwesomeIcon icon={faRuler} size={14} color="#E46444" />
            <Text style={styles.sectionTitle}>Size</Text>
          </View>

          <View style={[styles.sizeRow, { gap }]}>
            {brushSizes.map((size) => {
              const isSelected = brushSize === size.value;
              const displayColor =
                selectedTool === "eraser" ? "#9E9E9E" : selectedColor;
              const dotSize = Math.min(size.radius * 1.5, 24);

              return (
                <Pressable
                  key={size.label}
                  onPress={() => {
                    tapLight();
                    setBrushSize(size.value);
                  }}
                  style={[
                    styles.sizeButton,
                    {
                      width: clampedButtonSize,
                      height: clampedButtonSize,
                    },
                    isSelected && styles.sizeButtonActive,
                  ]}
                  accessibilityLabel={size.label}
                >
                  <View
                    style={[
                      styles.sizeDot,
                      {
                        width: dotSize,
                        height: dotSize,
                        borderRadius: dotSize / 2,
                        backgroundColor: displayColor,
                      },
                    ]}
                  />
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Divider */}
        <View style={styles.divider} />

        {/* Undo/Redo Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <FontAwesomeIcon
              icon={faClockRotateLeft}
              size={14}
              color="#E46444"
            />
            <Text style={styles.sectionTitle}>History</Text>
          </View>

          <View style={[styles.historyRow, { gap }]}>
            <Pressable
              onPress={handleUndo}
              disabled={!canUndo()}
              style={[
                styles.historyButton,
                { width: clampedButtonSize, height: clampedButtonSize },
                !canUndo() && styles.historyButtonDisabled,
              ]}
              accessibilityLabel="Undo"
            >
              <FontAwesomeIcon
                icon={faArrowRotateLeft}
                size={16}
                color={canUndo() ? "#4B5563" : "#9CA3AF"}
              />
            </Pressable>
            <Pressable
              onPress={handleRedo}
              disabled={!canRedo()}
              style={[
                styles.historyButton,
                { width: clampedButtonSize, height: clampedButtonSize },
                !canRedo() && styles.historyButtonDisabled,
              ]}
              accessibilityLabel="Redo"
            >
              <FontAwesomeIcon
                icon={faArrowRotateRight}
                size={16}
                color={canRedo() ? "#4B5563" : "#9CA3AF"}
              />
            </Pressable>
          </View>
        </View>

        {/* Divider */}
        <View style={styles.divider} />

        {/* Zoom Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <FontAwesomeIcon
              icon={faMagnifyingGlassPlus}
              size={14}
              color="#E46444"
            />
            <Text style={styles.sectionTitle}>Zoom</Text>
          </View>

          <View style={[styles.zoomRow, { gap }]}>
            <Pressable
              onPress={() => {
                tapLight();
                onZoomOut?.();
              }}
              disabled={zoom <= minZoom}
              style={[
                styles.zoomButton,
                { width: clampedButtonSize - 4, height: clampedButtonSize - 4 },
                zoom <= minZoom && styles.zoomButtonDisabled,
              ]}
              accessibilityLabel="Zoom Out"
            >
              <FontAwesomeIcon
                icon={faMagnifyingGlassMinus}
                size={14}
                color={zoom <= minZoom ? "#9CA3AF" : "#4B5563"}
              />
            </Pressable>
            <Pressable
              onPress={() => {
                tapLight();
                onZoomIn?.();
              }}
              disabled={zoom >= maxZoom}
              style={[
                styles.zoomButton,
                { width: clampedButtonSize - 4, height: clampedButtonSize - 4 },
                zoom >= maxZoom && styles.zoomButtonDisabled,
              ]}
              accessibilityLabel="Zoom In"
            >
              <FontAwesomeIcon
                icon={faMagnifyingGlassPlus}
                size={14}
                color={zoom >= maxZoom ? "#9CA3AF" : "#4B5563"}
              />
            </Pressable>
            <Pressable
              onPress={() => {
                tapLight();
                onResetZoom?.();
              }}
              style={[
                styles.zoomButton,
                { width: clampedButtonSize - 4, height: clampedButtonSize - 4 },
              ]}
              accessibilityLabel="Reset Zoom"
            >
              <FontAwesomeIcon icon={faExpand} size={14} color="#4B5563" />
            </Pressable>
          </View>

          {/* Zoom percentage */}
          <Text style={styles.zoomPercentage}>{Math.round(zoom * 100)}%</Text>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#FFFFFF",
    borderLeftWidth: 1,
    borderLeftColor: "#E5E7EB",
    shadowColor: "#000",
    shadowOffset: { width: -2, height: 0 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  scrollContent: {
    gap: 12,
  },
  section: {
    gap: 8,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "bold",
    fontFamily: "TondoTrial-Bold",
    color: "#374151",
  },
  divider: {
    height: 1,
    backgroundColor: "#E5E7EB",
    marginVertical: 4,
  },
  toolGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  toolButton: {
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
    backgroundColor: "#F3F4F6",
  },
  toolButtonActive: {
    backgroundColor: "#E46444",
  },
  magicToolsContainer: {
    marginTop: 6,
  },
  magicToolButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: "rgba(142, 36, 170, 0.1)",
  },
  magicToolButtonActive: {
    // React Native doesn't support linear-gradient, use solid color
    backgroundColor: "#8E24AA",
  },
  magicToolLabel: {
    flex: 1,
    fontSize: 12,
    fontWeight: "bold",
    color: "#8E24AA",
  },
  magicToolLabelActive: {
    color: "#FFFFFF",
  },
  magicEmoji: {
    fontSize: 12,
    opacity: 0.7,
  },
  sizeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  sizeButton: {
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
    backgroundColor: "#F3F4F6",
  },
  sizeButtonActive: {
    backgroundColor: "#E5E7EB",
    borderWidth: 2,
    borderColor: "#9CA3AF",
  },
  sizeDot: {
    // Dynamic size set inline
  },
  historyRow: {
    flexDirection: "row",
    justifyContent: "center",
  },
  historyButton: {
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
    backgroundColor: "#F3F4F6",
  },
  historyButtonDisabled: {
    opacity: 0.5,
  },
  zoomRow: {
    flexDirection: "row",
    justifyContent: "center",
    flexWrap: "wrap",
  },
  zoomButton: {
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    backgroundColor: "#F3F4F6",
  },
  zoomButtonDisabled: {
    opacity: 0.5,
  },
  zoomPercentage: {
    textAlign: "center",
    fontSize: 11,
    color: "#6B7280",
    marginTop: 4,
  },
});

export default ToolsSidebar;

import { useCallback } from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
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
  faEraser,
  faToolbox,
  faRuler,
  faClockRotateLeft,
  faMagnifyingGlassPlus,
  faMagnifyingGlassMinus,
  faExpand,
} from "@fortawesome/pro-duotone-svg-icons";
import { LinearGradient } from "expo-linear-gradient";
import {
  useCanvasStore,
  Tool,
  BrushType,
  MagicMode,
} from "@/stores/canvasStore";
import { tapLight, tapMedium, notifyWarning } from "@/utils/haptics";
import { BRUSH_SIZES } from "@/constants/Colors";
import { COLORS, CRAYON } from "@/lib/design";

type ToolConfig = {
  id: string;
  tool: Tool;
  brushType?: BrushType;
  magicMode?: MagicMode;
  label: string;
  icon: IconDefinition;
  isMagic?: boolean;
};

// Kids regular tools (matching web's ToolSelector KIDS_TOOL_IDS — minus
// the magic-auto which lives in the featured magic row below). Web removed
// glow/neon/glitter (confusing UX), so they're dropped here too.
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
    id: "rainbow",
    tool: "brush",
    brushType: "rainbow",
    label: "Rainbow",
    icon: faRainbow,
  },
  { id: "fill", tool: "fill", label: "Fill", icon: faFillDrip },
  { id: "eraser", tool: "eraser", label: "Eraser", icon: faEraser },
  { id: "sticker", tool: "sticker", label: "Sticker", icon: faStar },
];

// Featured magic tools (web shows these with labels + the magic gradient).
const magicTools: ToolConfig[] = [
  {
    id: "magic-auto",
    tool: "magic",
    magicMode: "auto",
    label: "Auto Color",
    icon: faBrush,
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
    magicReady,
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
      // Magic tools need the region store; ignore taps until ready.
      if (config.isMagic && !magicReady) return;
      tapLight();
      setTool(config.tool);
      if (config.brushType) {
        setBrushType(config.brushType);
      }
      if (config.magicMode) {
        setMagicMode(config.magicMode);
      }
    },
    [setTool, setBrushType, setMagicMode, magicReady],
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
            <FontAwesomeIcon
              icon={faToolbox}
              size={16}
              color={COLORS.crayonOrange}
              secondaryColor={COLORS.crayonPeach}
              secondaryOpacity={1}
            />
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
                    isActive ? styles.toolButtonActive : styles.toolButtonIdle,
                  ]}
                  accessibilityLabel={config.label}
                >
                  <FontAwesomeIcon
                    icon={config.icon}
                    size={clampedButtonSize * 0.45}
                    color={isActive ? "#FFFFFF" : COLORS.textPrimary}
                    secondaryColor={
                      isActive ? "rgba(255,255,255,0.85)" : COLORS.crayonPeach
                    }
                    secondaryOpacity={1}
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
                  disabled={!magicReady}
                  accessibilityLabel={
                    magicReady
                      ? config.label
                      : `${config.label} (getting ready)`
                  }
                  accessibilityState={{ disabled: !magicReady }}
                  style={!magicReady && styles.magicToolDisabled}
                >
                  <LinearGradient
                    colors={
                      isActive
                        ? [CRAYON.purple.base, CRAYON.pink.base]
                        : [`${CRAYON.purple.base}1F`, `${CRAYON.pink.base}1F`]
                    }
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.magicToolButton}
                  >
                    {magicReady ? (
                      <FontAwesomeIcon
                        icon={config.icon}
                        size={16}
                        color={isActive ? "#FFFFFF" : CRAYON.purple.base}
                        secondaryColor={
                          isActive ? "rgba(255,255,255,0.85)" : CRAYON.pink.base
                        }
                        secondaryOpacity={1}
                      />
                    ) : (
                      <ActivityIndicator
                        size="small"
                        color={CRAYON.purple.base}
                      />
                    )}
                    <Text
                      style={[
                        styles.magicToolLabel,
                        isActive && styles.magicToolLabelActive,
                      ]}
                    >
                      {magicReady ? config.label : "Getting ready…"}
                    </Text>
                    {magicReady && (
                      <FontAwesomeIcon
                        icon={faSparkles}
                        size={13}
                        color={isActive ? "#FFFFFF" : CRAYON.purple.base}
                        secondaryColor={CRAYON.pink.base}
                        secondaryOpacity={1}
                      />
                    )}
                  </LinearGradient>
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
            <FontAwesomeIcon
              icon={faRuler}
              size={14}
              color={COLORS.crayonOrange}
              secondaryColor={COLORS.crayonPeach}
              secondaryOpacity={1}
            />
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
              color={COLORS.crayonOrange}
              secondaryColor={COLORS.crayonPeach}
              secondaryOpacity={1}
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
                color={canUndo() ? COLORS.textPrimary : COLORS.textMuted}
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
                color={canRedo() ? COLORS.textPrimary : COLORS.textMuted}
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
              color={COLORS.crayonOrange}
              secondaryColor={COLORS.crayonPeach}
              secondaryOpacity={1}
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
                color={zoom <= minZoom ? COLORS.textMuted : COLORS.textPrimary}
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
                color={zoom >= maxZoom ? COLORS.textMuted : COLORS.textPrimary}
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
              <FontAwesomeIcon
                icon={faExpand}
                size={14}
                color={COLORS.textPrimary}
              />
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
    backgroundColor: COLORS.white,
    borderLeftWidth: 2,
    borderLeftColor: COLORS.bgCreamDark,
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
    fontFamily: "TondoTrial-Bold",
    color: COLORS.textPrimary,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.bgCreamDark,
    marginVertical: 4,
  },
  toolGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  toolButton: {
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 16,
    borderWidth: 2,
  },
  toolButtonIdle: {
    backgroundColor: COLORS.white,
    borderColor: COLORS.bgCreamDark,
  },
  toolButtonActive: {
    backgroundColor: COLORS.crayonOrange,
    borderColor: COLORS.crayonOrange,
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
    borderRadius: 16,
  },
  magicToolDisabled: {
    opacity: 0.6,
  },
  magicToolLabel: {
    flex: 1,
    fontSize: 12,
    fontFamily: "TondoTrial-Bold",
    color: CRAYON.purple.dark,
  },
  magicToolLabelActive: {
    color: "#FFFFFF",
  },
  sizeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  sizeButton: {
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 16,
    borderWidth: 2,
    borderColor: COLORS.bgCreamDark,
    backgroundColor: COLORS.white,
  },
  sizeButtonActive: {
    backgroundColor: COLORS.crayonOrange,
    borderColor: COLORS.crayonOrange,
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
    borderRadius: 16,
    borderWidth: 2,
    borderColor: COLORS.bgCreamDark,
    backgroundColor: COLORS.white,
  },
  historyButtonDisabled: {
    opacity: 0.5,
  },
  zoomRow: {
    flexDirection: "row",
    justifyContent: "center",
    flexWrap: "wrap",
    gap: 6,
  },
  zoomButton: {
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    borderWidth: 2,
    borderColor: COLORS.bgCreamDark,
    backgroundColor: COLORS.white,
  },
  zoomButtonDisabled: {
    opacity: 0.5,
  },
  zoomPercentage: {
    textAlign: "center",
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 4,
  },
});

export default ToolsSidebar;

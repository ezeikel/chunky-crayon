import { useCallback, useState } from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
  Animated,
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
  faSun,
  faBoltLightning,
  faBrush,
  faArrowRotateLeft,
  faArrowRotateRight,
  faChevronLeft,
  faChevronRight,
  faEraser,
} from "@fortawesome/pro-solid-svg-icons";
import {
  useCanvasStore,
  Tool,
  BrushType,
  MagicMode,
} from "@/stores/canvasStore";
import { useFeatureStore } from "@/stores/featureStore";
import { tapLight, tapMedium, notifyWarning } from "@/utils/haptics";
import { TOOLBAR } from "@/constants/Sizes";

type ToolConfig = {
  id: string;
  tool: Tool;
  brushType?: BrushType;
  magicMode?: MagicMode;
  label: string;
  icon: IconDefinition;
  isMagic?: boolean;
};

// Same tools as bottom toolbar
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
  {
    id: "magic-suggest",
    tool: "magic",
    magicMode: "suggest",
    label: "Magic",
    icon: faBrush,
    isMagic: true,
  },
  {
    id: "magic-auto",
    tool: "magic",
    magicMode: "auto",
    label: "Auto",
    icon: faFillDrip,
    isMagic: true,
  },
];

type SideToolbarProps = {
  /** Whether the toolbar can be collapsed (phone landscape) */
  collapsible?: boolean;
  /** Touch target size for buttons */
  buttonSize?: number;
};

const SideToolbar = ({
  collapsible = false,
  buttonSize = 48,
}: SideToolbarProps) => {
  const insets = useSafeAreaInsets();
  const { sideToolbarExpanded, toggleSideToolbar } = useFeatureStore();

  const {
    selectedTool,
    brushType,
    magicMode,
    setTool,
    setBrushType,
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

  const isExpanded = !collapsible || sideToolbarExpanded;
  const width = isExpanded ? TOOLBAR.sideWidth : TOOLBAR.sideCollapsed;

  return (
    <View
      style={[
        styles.container,
        {
          width,
          paddingTop: insets.top + 8,
          paddingBottom: insets.bottom + 8,
          paddingLeft: insets.left + 8,
        },
      ]}
    >
      {/* Collapse/Expand Toggle (only for collapsible mode) */}
      {collapsible && (
        <Pressable
          onPress={() => {
            tapLight();
            toggleSideToolbar();
          }}
          style={styles.toggleButton}
        >
          <FontAwesomeIcon
            icon={isExpanded ? faChevronLeft : faChevronRight}
            size={16}
            color="#6B7280"
          />
        </Pressable>
      )}

      {/* Tools */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {tools.map((config) => (
          <Pressable
            key={config.id}
            onPress={() => handleToolSelect(config)}
            style={[
              styles.toolButton,
              {
                width: isExpanded ? buttonSize : buttonSize - 8,
                height: isExpanded ? buttonSize : buttonSize - 8,
              },
              isToolActive(config) && styles.toolButtonActive,
            ]}
          >
            <FontAwesomeIcon
              icon={config.icon}
              size={isExpanded ? 20 : 16}
              color={isToolActive(config) ? "#FFFFFF" : "#4B5563"}
            />
            {isExpanded && (
              <Text
                style={[
                  styles.toolLabel,
                  isToolActive(config) && styles.toolLabelActive,
                ]}
                numberOfLines={1}
              >
                {config.label}
              </Text>
            )}
          </Pressable>
        ))}
      </ScrollView>

      {/* Undo/Redo at bottom */}
      <View style={styles.historySection}>
        <Pressable
          onPress={() => {
            if (canUndo()) {
              tapMedium();
              undo();
            } else {
              notifyWarning();
            }
          }}
          disabled={!canUndo()}
          style={[
            styles.historyButton,
            {
              width: isExpanded ? buttonSize : buttonSize - 8,
              height: isExpanded ? buttonSize : buttonSize - 8,
            },
            !canUndo() && styles.historyButtonDisabled,
          ]}
        >
          <FontAwesomeIcon
            icon={faArrowRotateLeft}
            size={isExpanded ? 18 : 14}
            color={canUndo() ? "#4B5563" : "#9CA3AF"}
          />
        </Pressable>
        <Pressable
          onPress={() => {
            if (canRedo()) {
              tapMedium();
              redo();
            } else {
              notifyWarning();
            }
          }}
          disabled={!canRedo()}
          style={[
            styles.historyButton,
            {
              width: isExpanded ? buttonSize : buttonSize - 8,
              height: isExpanded ? buttonSize : buttonSize - 8,
            },
            !canRedo() && styles.historyButtonDisabled,
          ]}
        >
          <FontAwesomeIcon
            icon={faArrowRotateRight}
            size={isExpanded ? 18 : 14}
            color={canRedo() ? "#4B5563" : "#9CA3AF"}
          />
        </Pressable>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#FFFFFF",
    borderRightWidth: 1,
    borderRightColor: "#E5E7EB",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 2, height: 0 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  toggleButton: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    backgroundColor: "#F3F4F6",
    marginBottom: 12,
  },
  scrollContent: {
    alignItems: "center",
    gap: 8,
    paddingVertical: 8,
  },
  toolButton: {
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    backgroundColor: "#F3F4F6",
    gap: 2,
  },
  toolButtonActive: {
    backgroundColor: "#E46444",
  },
  toolLabel: {
    fontSize: 8,
    fontFamily: "RooneySans-Regular",
    color: "#4B5563",
    textAlign: "center",
  },
  toolLabelActive: {
    color: "#FFFFFF",
    fontWeight: "bold",
  },
  historySection: {
    flexDirection: "column",
    gap: 8,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
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
});

export default SideToolbar;

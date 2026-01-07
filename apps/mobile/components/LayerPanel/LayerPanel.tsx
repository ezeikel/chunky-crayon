import { View, Text, Pressable, StyleSheet } from "react-native";
import { FontAwesomeIcon } from "@fortawesome/react-native-fontawesome";
import {
  faEye,
  faEyeSlash,
  faPlus,
  faTrash,
} from "@fortawesome/pro-solid-svg-icons";
import { useCanvasStore, MAX_LAYERS, LAYER_COLORS } from "@/stores/canvasStore";
import { tapLight, notifyWarning } from "@/utils/haptics";

/**
 * LayerPanel - Simple layer management for kids
 *
 * Shows up to 3 layers with:
 * - Visibility toggle (eye icon)
 * - Selection (tap to select)
 * - Add/Remove buttons
 */
const LayerPanel = () => {
  const {
    layers,
    activeLayerId,
    addLayer,
    removeLayer,
    setActiveLayer,
    toggleLayerVisibility,
  } = useCanvasStore();

  const handleAddLayer = () => {
    if (layers.length >= MAX_LAYERS) {
      notifyWarning();
      return;
    }
    tapLight();
    addLayer();
  };

  const handleRemoveLayer = (layerId: string) => {
    if (layers.length <= 1) {
      notifyWarning();
      return;
    }
    tapLight();
    removeLayer(layerId);
  };

  const handleSelectLayer = (layerId: string) => {
    tapLight();
    setActiveLayer(layerId);
  };

  const handleToggleVisibility = (layerId: string) => {
    tapLight();
    toggleLayerVisibility(layerId);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Layers</Text>
        <Pressable
          onPress={handleAddLayer}
          style={[
            styles.addButton,
            layers.length >= MAX_LAYERS && styles.addButtonDisabled,
          ]}
          disabled={layers.length >= MAX_LAYERS}
        >
          <FontAwesomeIcon
            icon={faPlus}
            size={14}
            color={layers.length >= MAX_LAYERS ? "#9CA3AF" : "#4B5563"}
          />
        </Pressable>
      </View>

      <View style={styles.layerList}>
        {/* Render layers in reverse order (top layer first) */}
        {[...layers].reverse().map((layer, reverseIndex) => {
          const originalIndex = layers.length - 1 - reverseIndex;
          const isActive = layer.id === activeLayerId;
          const layerColor = LAYER_COLORS[originalIndex % LAYER_COLORS.length];

          return (
            <Pressable
              key={layer.id}
              onPress={() => handleSelectLayer(layer.id)}
              style={[
                styles.layerItem,
                isActive && styles.layerItemActive,
                { borderLeftColor: layerColor },
              ]}
            >
              {/* Visibility toggle */}
              <Pressable
                onPress={() => handleToggleVisibility(layer.id)}
                style={styles.visibilityButton}
              >
                <FontAwesomeIcon
                  icon={layer.visible ? faEye : faEyeSlash}
                  size={14}
                  color={layer.visible ? "#4B5563" : "#9CA3AF"}
                />
              </Pressable>

              {/* Layer name */}
              <Text
                style={[
                  styles.layerName,
                  isActive && styles.layerNameActive,
                  !layer.visible && styles.layerNameHidden,
                ]}
                numberOfLines={1}
              >
                {layer.name}
              </Text>

              {/* Delete button (only show if more than 1 layer) */}
              {layers.length > 1 && (
                <Pressable
                  onPress={() => handleRemoveLayer(layer.id)}
                  style={styles.deleteButton}
                >
                  <FontAwesomeIcon icon={faTrash} size={12} color="#EF4444" />
                </Pressable>
              )}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    padding: 8,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  title: {
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    color: "#9CA3AF",
    fontFamily: "RooneySans-Bold",
  },
  addButton: {
    width: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 6,
    backgroundColor: "#E5E7EB",
  },
  addButtonDisabled: {
    opacity: 0.5,
  },
  layerList: {
    gap: 4,
  },
  layerItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: 8,
    backgroundColor: "#FFFFFF",
    borderLeftWidth: 3,
    borderLeftColor: "#E46444",
  },
  layerItemActive: {
    backgroundColor: "#FEF3C7",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  visibilityButton: {
    width: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 4,
  },
  layerName: {
    flex: 1,
    fontSize: 13,
    fontFamily: "RooneySans-Regular",
    color: "#374151",
  },
  layerNameActive: {
    fontFamily: "RooneySans-Bold",
    color: "#1F2937",
  },
  layerNameHidden: {
    color: "#9CA3AF",
    fontStyle: "italic",
  },
  deleteButton: {
    width: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
    opacity: 0.6,
  },
});

export default LayerPanel;

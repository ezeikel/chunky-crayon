import { useRef } from "react";
import { View, Pressable, StyleSheet } from "react-native";
import { FontAwesomeIcon } from "@fortawesome/react-native-fontawesome";
import {
  faMagnifyingGlassPlus,
  faMagnifyingGlassMinus,
  faHand,
  faHouse,
} from "@fortawesome/pro-solid-svg-icons";
import { useCanvasStore, Tool } from "@/stores/canvasStore";
import { tapLight, tapMedium } from "@/utils/haptics";

const MIN_ZOOM = 1;
const MAX_ZOOM = 4;
const ZOOM_STEP = 0.5;

type ZoomControlsProps = {
  style?: Record<string, unknown>;
};

/**
 * Kid-friendly zoom controls for mobile coloring canvas.
 * Provides zoom in/out, pan mode toggle, and reset view.
 *
 * Features:
 * - Large touch targets (44pt+) for young children
 * - Pan tool appears only when zoomed in (hand icon for moving around)
 * - Reset button appears only when zoomed in
 * - Visual zoom level indicator
 * - Coral color scheme (#E46444)
 */
const ZoomControls = ({ style }: ZoomControlsProps) => {
  const { scale, setScale, resetTransform, selectedTool, setTool } =
    useCanvasStore();

  // Remember the previous tool to switch back to when pan is deselected
  const previousToolRef = useRef<Tool>("brush");

  // Check if we're zoomed in
  const isZoomed = scale > MIN_ZOOM;
  const canZoomIn = scale < MAX_ZOOM;
  const canZoomOut = scale > MIN_ZOOM;
  const isPanActive = selectedTool === "pan";

  const handleZoomIn = () => {
    if (canZoomIn) {
      tapLight();
      const newScale = Math.min(MAX_ZOOM, scale + ZOOM_STEP);
      setScale(newScale);
    }
  };

  const handleZoomOut = () => {
    if (canZoomOut) {
      tapLight();
      const newScale = Math.max(MIN_ZOOM, scale - ZOOM_STEP);
      setScale(newScale);
    }
  };

  const handleResetView = () => {
    if (isZoomed) {
      tapMedium();
      resetTransform();
      // Switch back to brush if in pan mode
      if (selectedTool === "pan") {
        setTool(previousToolRef.current);
      }
    }
  };

  const handlePanToggle = () => {
    tapLight();
    if (isPanActive) {
      // Switch back to previous tool
      setTool(previousToolRef.current);
    } else {
      // Save current tool and switch to pan
      previousToolRef.current = selectedTool;
      setTool("pan");
    }
  };

  // Calculate which zoom dots are filled (1x = 0, 4x = 6 dots)
  const zoomLevel = Math.round((scale - MIN_ZOOM) / ZOOM_STEP);
  const totalDots = Math.round((MAX_ZOOM - MIN_ZOOM) / ZOOM_STEP);

  return (
    <View style={[styles.container, isZoomed && styles.containerZoomed, style]}>
      {/* Zoom out button */}
      <Pressable
        onPress={handleZoomOut}
        disabled={!canZoomOut}
        style={[styles.button, !canZoomOut && styles.buttonDisabled]}
      >
        <FontAwesomeIcon
          icon={faMagnifyingGlassMinus}
          size={18}
          color={canZoomOut ? "#E46444" : "#D1D5DB"}
        />
      </Pressable>

      {/* Zoom indicator dots */}
      <View style={styles.dotsContainer}>
        {Array.from({ length: totalDots }).map((_, index) => (
          <View
            key={index}
            style={[
              styles.dot,
              index < zoomLevel && styles.dotActive,
              // Extra scale for the most recently filled dot
              index === zoomLevel - 1 && styles.dotPop,
            ]}
          />
        ))}
      </View>

      {/* Zoom in button */}
      <Pressable
        onPress={handleZoomIn}
        disabled={!canZoomIn}
        style={[styles.button, !canZoomIn && styles.buttonDisabled]}
      >
        <FontAwesomeIcon
          icon={faMagnifyingGlassPlus}
          size={18}
          color={canZoomIn ? "#E46444" : "#D1D5DB"}
        />
      </Pressable>

      {/* Pan/Move Tool - only show when zoomed */}
      {isZoomed && (
        <Pressable
          onPress={handlePanToggle}
          style={[styles.button, isPanActive && styles.buttonActive]}
        >
          <FontAwesomeIcon
            icon={faHand}
            size={18}
            color={isPanActive ? "#FFFFFF" : "#E46444"}
          />
        </Pressable>
      )}

      {/* Reset view button - only shown when zoomed */}
      {isZoomed && (
        <Pressable onPress={handleResetView} style={styles.resetButton}>
          <FontAwesomeIcon icon={faHouse} size={16} color="#E46444" />
        </Pressable>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    height: 40,
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    paddingHorizontal: 8,
    borderRadius: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  containerZoomed: {
    // Subtle orange ring when zoomed to indicate active state
    borderWidth: 2,
    borderColor: "rgba(228, 100, 68, 0.3)",
  },
  button: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 18,
    backgroundColor: "#FFF5F3",
  },
  buttonDisabled: {
    backgroundColor: "#F3F4F6",
    opacity: 0.6,
  },
  buttonActive: {
    backgroundColor: "#E46444",
  },
  resetButton: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 18,
    backgroundColor: "rgba(228, 100, 68, 0.1)",
  },
  dotsContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 4,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#E5E7EB",
  },
  dotActive: {
    backgroundColor: "#E46444",
    transform: [{ scale: 1.25 }],
  },
  dotPop: {
    transform: [{ scale: 1.4 }],
  },
});

export default ZoomControls;

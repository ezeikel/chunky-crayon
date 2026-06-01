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
import { COLORS } from "@/lib/design";

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
          size={20}
          color={canZoomOut ? COLORS.textMuted : "#D1D5DB"}
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
          size={20}
          color={canZoomIn ? COLORS.textMuted : "#D1D5DB"}
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
            color={isPanActive ? "#FFFFFF" : COLORS.textMuted}
          />
        </Pressable>
      )}

      {/* Reset view button - only shown when zoomed (accent-tinted, web parity) */}
      {isZoomed && (
        <Pressable onPress={handleResetView} style={styles.resetButton}>
          <FontAwesomeIcon icon={faHouse} size={18} color={ACCENT} />
        </Pressable>
      )}
    </View>
  );
};

// Styled to match web's ZoomControls (packages/coloring-ui/src/ZoomControls.tsx):
//  - pill: white, 2px bgCreamDark border, rounded-coloring-card (24), gap 8;
//    accent ring when zoomed.
//  - zoom out/in buttons: white, 2px bgCreamDark border, muted-gray icon.
//  - reset: accent-tinted (accent/10 bg, accent/40 border, accent icon).
//  - pan: accent when active, else white/muted.
const ACCENT = "#E46444";
const ACCENT_TINT = "rgba(228, 100, 68, 0.1)";
const ACCENT_BORDER = "rgba(228, 100, 68, 0.4)";

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 8,
    backgroundColor: COLORS.white,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: COLORS.bgCreamDark,
  },
  containerZoomed: {
    // Accent ring when zoomed (web: ring-2 ring-coloring-accent/30).
    borderColor: ACCENT_BORDER,
  },
  button: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 24,
    borderWidth: 2,
    borderColor: COLORS.bgCreamDark,
    backgroundColor: COLORS.white,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonActive: {
    backgroundColor: ACCENT,
    borderColor: "transparent",
  },
  resetButton: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 24,
    borderWidth: 2,
    borderColor: ACCENT_BORDER,
    backgroundColor: ACCENT_TINT,
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
    backgroundColor: ACCENT,
    transform: [{ scale: 1.25 }],
  },
  dotPop: {
    transform: [{ scale: 1.4 }],
  },
});

export default ZoomControls;

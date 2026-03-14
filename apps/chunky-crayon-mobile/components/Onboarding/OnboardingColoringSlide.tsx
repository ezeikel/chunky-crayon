import {
  Dispatch,
  SetStateAction,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  useWindowDimensions,
} from "react-native";
import Animated, {
  FadeIn,
  FadeInUp,
  ZoomIn,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Asset } from "expo-asset";
import { FontAwesomeIcon } from "@fortawesome/react-native-fontawesome";
import {
  faWandMagicSparkles,
  faPaintbrush,
} from "@fortawesome/pro-solid-svg-icons";
import ImageCanvas from "@/components/ImageCanvas/ImageCanvas";
import MobileColoringToolbar from "@/components/MobileColoringToolbar/MobileColoringToolbar";
import Confetti from "@/components/Confetti/Confetti";
import { useCanvasStore, DrawingAction } from "@/stores/canvasStore";
import { deleteCanvasState } from "@/utils/canvasPersistence";
import { ONBOARDING_COLOR_MAP } from "@/constants/onboardingColorMap";
import { ONBOARDING_FILL_POINTS } from "@/constants/onboardingFillPoints";
import type { ColoringImage } from "@/types";

// eslint-disable-next-line @typescript-eslint/no-require-imports
const welcomeSvgAsset = require("@/assets/onboarding/welcome-coloring.svg");

type Phase = "CHOICE" | "AUTO_COLORING" | "MANUAL_COLORING" | "CELEBRATION";

// SVG dimensions are known to be 1024x1024 for the welcome image
const SVG_SIZE = 1024;

type OnboardingColoringSlideProps = {
  onComplete: () => void;
  onSkip: () => void;
  setScroll: Dispatch<SetStateAction<boolean>>;
  isActive?: boolean;
};

const OnboardingColoringSlide = ({
  onComplete,
  onSkip,
  setScroll,
  isActive = true,
}: OnboardingColoringSlideProps) => {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [svgUri, setSvgUri] = useState<string | null>(null);
  const [hasBeenActive, setHasBeenActive] = useState(isActive);
  const [phase, setPhase] = useState<Phase>("CHOICE");
  const advanceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { reset, setTool, setBrushType, setImageId, addAction } =
    useCanvasStore();

  useEffect(() => {
    if (isActive && !hasBeenActive) {
      setHasBeenActive(true);
    }
  }, [isActive, hasBeenActive]);

  // Resolve bundled SVG to a local file URI for Skia's useSVG
  useEffect(() => {
    const loadAsset = async () => {
      const asset = Asset.fromModule(welcomeSvgAsset);
      await asset.downloadAsync();
      if (asset.localUri) {
        setSvgUri(asset.localUri);
      }
    };
    loadAsset();
  }, []);

  // Initialize canvas store for onboarding — clear any stale saved state
  useEffect(() => {
    deleteCanvasState("onboarding-welcome");
    reset();
    setImageId("onboarding-welcome");
    setTool("brush");
    setBrushType("crayon");

    return () => {
      if (advanceTimerRef.current) {
        clearTimeout(advanceTimerRef.current);
      }
      deleteCanvasState("onboarding-welcome");
      reset();
    };
  }, [reset, setImageId, setTool, setBrushType]);

  // Lock scroll during non-choice phases
  useEffect(() => {
    if (phase === "CHOICE") {
      setScroll(true);
    } else {
      setScroll(false);
    }
  }, [phase, setScroll]);

  const enterCelebration = useCallback(() => {
    setPhase("CELEBRATION");
  }, []);

  const handleAutoColor = useCallback(() => {
    setPhase("AUTO_COLORING");

    // Build magic-fill action from hand-picked fill points targeting
    // specific regions (balloons, banner, mascot body, sky, ground, etc.)
    const fills = ONBOARDING_FILL_POINTS.map((pt) => ({
      x: pt.x,
      y: pt.y,
      color: pt.color,
    }));

    const action: DrawingAction = {
      type: "magic-fill",
      color: fills[0]?.color || "#FFFFFF",
      magicFills: fills,
      sourceWidth: SVG_SIZE,
      sourceHeight: SVG_SIZE,
    };
    addAction(action);

    // Wait for the fill layer to compute, then celebrate
    setTimeout(() => {
      enterCelebration();
    }, 1500);
  }, [addAction, enterCelebration]);

  const handleManualColor = useCallback(() => {
    setPhase("MANUAL_COLORING");
  }, []);

  const handleDone = useCallback(() => {
    enterCelebration();
  }, [enterCelebration]);

  const handleCelebrationTap = useCallback(() => {
    if (advanceTimerRef.current) {
      clearTimeout(advanceTimerRef.current);
    }
    onComplete();
  }, [onComplete]);

  // Compute canvas area
  const canvasAreaHeight = height * 0.45;
  const canvasAreaWidth = width - 64;
  const canvasArea = { width: canvasAreaWidth, height: canvasAreaHeight };

  // Build synthetic ColoringImage with colorMapJson for auto-fill
  const coloringImage: ColoringImage | null = useMemo(
    () =>
      svgUri
        ? {
            id: "onboarding-welcome",
            title: "Welcome Coloring",
            description: "Color Colo's welcome party!",
            alt: "Colo at a welcome party",
            svgUrl: svgUri,
            colorMapJson: JSON.stringify(ONBOARDING_COLOR_MAP),
            tags: [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          }
        : null,
    [svgUri],
  );

  const showCanvas = phase !== "CHOICE";
  const showToolbar = phase === "MANUAL_COLORING";

  if (!hasBeenActive) {
    return <View style={[styles.container, { width }]} />;
  }

  return (
    <View style={[styles.container, { width, paddingTop: insets.top + 12 }]}>
      {/* Skip button — visible on CHOICE and MANUAL_COLORING */}
      {(phase === "CHOICE" || phase === "MANUAL_COLORING") && (
        <Pressable style={styles.skipButton} onPress={onSkip}>
          <Text style={styles.skipButtonText}>Skip</Text>
        </Pressable>
      )}

      {/* Header text */}
      {phase === "CHOICE" && (
        <Animated.View entering={FadeIn.duration(400)} style={styles.header}>
          <Text style={styles.title}>Your Turn to Create!</Text>
          <Text style={styles.subtitle}>Color Colo's welcome party</Text>
        </Animated.View>
      )}
      {phase === "AUTO_COLORING" && (
        <Animated.View entering={FadeIn.duration(300)} style={styles.header}>
          <Text style={styles.title}>Watch the magic!</Text>
        </Animated.View>
      )}

      {/* Single persistent ImageCanvas — stays mounted across all phases */}
      <View
        style={[
          styles.canvasContainer,
          {
            height: canvasAreaHeight,
            marginTop: phase === "MANUAL_COLORING" ? 8 : 0,
          },
        ]}
      >
        {coloringImage && (
          <ImageCanvas
            coloringImage={coloringImage}
            setScroll={setScroll}
            canvasArea={canvasArea}
          />
        )}
      </View>

      {/* Phase-specific UI below the canvas */}
      {phase === "CHOICE" && (
        <Animated.View
          entering={FadeInUp.delay(300).duration(400)}
          style={styles.choiceRow}
        >
          <Pressable
            style={({ pressed }) => [
              styles.choiceButton,
              styles.autoButton,
              pressed && styles.choiceButtonPressed,
            ]}
            onPress={handleAutoColor}
          >
            <FontAwesomeIcon
              icon={faWandMagicSparkles}
              size={20}
              color="#FFFFFF"
            />
            <Text style={styles.choiceButtonText}>Auto Color</Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.choiceButton,
              styles.manualButton,
              pressed && styles.choiceButtonPressed,
            ]}
            onPress={handleManualColor}
          >
            <FontAwesomeIcon icon={faPaintbrush} size={20} color="#FFFFFF" />
            <Text style={styles.choiceButtonText}>Color It Myself</Text>
          </Pressable>
        </Animated.View>
      )}

      {phase === "MANUAL_COLORING" && (
        <Animated.View
          entering={FadeInUp.delay(400).duration(400)}
          style={styles.doneFloating}
        >
          <Pressable
            style={({ pressed }) => [
              styles.doneButton,
              pressed && styles.doneButtonPressed,
            ]}
            onPress={handleDone}
          >
            <Text style={styles.doneButtonText}>Done!</Text>
          </Pressable>
        </Animated.View>
      )}

      {phase === "CELEBRATION" && (
        <Pressable onPress={handleCelebrationTap}>
          <CelebrationText />
        </Pressable>
      )}

      {/* Full toolbar for manual coloring */}
      {showToolbar && <MobileColoringToolbar />}

      {/* Confetti overlay */}
      <Confetti visible={phase === "CELEBRATION"} />
    </View>
  );
};

/** "Amazing!" text with spring bounce */
const CelebrationText = () => {
  const scale = useSharedValue(0.5);

  useEffect(() => {
    scale.value = withSpring(1, { damping: 8, stiffness: 120 });
  }, [scale]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View
      entering={ZoomIn.duration(400)}
      style={[styles.celebrationContainer, animatedStyle]}
    >
      <Text style={styles.celebrationText}>Amazing!</Text>
      <Text style={styles.celebrationSubtext}>You're a natural artist</Text>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 16,
  },
  skipButton: {
    alignSelf: "flex-end",
    paddingVertical: 8,
    paddingHorizontal: 16,
    zIndex: 10,
  },
  skipButtonText: {
    fontFamily: "TondoTrial-Bold",
    fontSize: 16,
    color: "#9CA3AF",
  },
  header: {
    alignItems: "center",
  },
  title: {
    fontFamily: "TondoTrial-Bold",
    fontSize: 26,
    color: "#374151",
    textAlign: "center",
    marginBottom: 8,
  },
  subtitle: {
    fontFamily: "TondoTrial-Regular",
    fontSize: 16,
    color: "#6B7280",
    textAlign: "center",
    marginBottom: 16,
    paddingHorizontal: 16,
  },
  canvasContainer: {
    width: "100%",
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  // Choice buttons
  choiceRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 20,
    paddingHorizontal: 0,
  },
  choiceButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 16,
    borderRadius: 16,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  autoButton: {
    backgroundColor: "#8E24AA",
    shadowColor: "#8E24AA",
  },
  manualButton: {
    backgroundColor: "#E46444",
    shadowColor: "#E46444",
  },
  choiceButtonPressed: {
    transform: [{ scale: 0.97 }],
    opacity: 0.9,
  },
  choiceButtonText: {
    fontFamily: "TondoTrial-Bold",
    fontSize: 16,
    color: "#FFFFFF",
  },
  // Done button
  doneFloating: {
    marginTop: 12,
  },
  doneButton: {
    backgroundColor: "#E46444",
    paddingVertical: 14,
    paddingHorizontal: 40,
    borderRadius: 16,
    shadowColor: "#E46444",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  doneButtonPressed: {
    backgroundColor: "#D35A3A",
    transform: [{ scale: 0.97 }],
  },
  doneButtonText: {
    fontFamily: "TondoTrial-Bold",
    fontSize: 18,
    color: "#FFFFFF",
    textAlign: "center",
  },
  // Celebration
  celebrationContainer: {
    alignItems: "center",
    marginTop: 24,
  },
  celebrationText: {
    fontFamily: "TondoTrial-Bold",
    fontSize: 36,
    color: "#E46444",
    textAlign: "center",
  },
  celebrationSubtext: {
    fontFamily: "TondoTrial-Regular",
    fontSize: 18,
    color: "#6B7280",
    textAlign: "center",
    marginTop: 4,
  },
});

export default OnboardingColoringSlide;

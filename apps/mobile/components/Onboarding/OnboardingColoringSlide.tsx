import {
  Dispatch,
  SetStateAction,
  useCallback,
  useEffect,
  useState,
} from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  useWindowDimensions,
} from "react-native";
import Animated, { FadeIn, FadeInUp } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Asset } from "expo-asset";
import ImageCanvas from "@/components/ImageCanvas/ImageCanvas";
import ColorPalette from "@/components/ColorPalette/ColorPalette";
import { useCanvasStore } from "@/stores/canvasStore";
import type { ColoringImage } from "@/types";

// eslint-disable-next-line @typescript-eslint/no-require-imports
const welcomeSvgAsset = require("@/assets/onboarding/welcome-coloring.svg");

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
  const { reset, setTool, setBrushType, setImageId } = useCanvasStore();

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

  // Initialize canvas store for onboarding
  useEffect(() => {
    reset();
    setImageId("onboarding-welcome");
    setTool("brush");
    setBrushType("crayon");

    return () => {
      // Clean up canvas store when leaving the slide
      reset();
    };
  }, [reset, setImageId, setTool, setBrushType]);

  const handleDone = useCallback(() => {
    onComplete();
  }, [onComplete]);

  // Compute canvas area to fit within slide (~55% of height for canvas)
  const canvasAreaHeight = height * 0.45;
  const canvasAreaWidth = width - 64; // 32px padding each side
  const canvasArea = { width: canvasAreaWidth, height: canvasAreaHeight };

  // Build a synthetic ColoringImage object for ImageCanvas
  const coloringImage: ColoringImage | null = svgUri
    ? {
        id: "onboarding-welcome",
        title: "Welcome Coloring",
        description: "Color Colo's welcome party!",
        alt: "Colo at a welcome party",
        svgUrl: svgUri,
        tags: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
    : null;

  if (!hasBeenActive) {
    return <View style={[styles.container, { width }]} />;
  }

  return (
    <View style={[styles.container, { width, paddingTop: insets.top + 12 }]}>
      {/* Skip button */}
      <Pressable style={styles.skipButton} onPress={onSkip}>
        <Text style={styles.skipButtonText}>Skip</Text>
      </Pressable>

      <Animated.View entering={FadeIn.duration(400)} style={styles.content}>
        {/* Title */}
        <Text style={styles.title}>Your Turn to Create!</Text>
        <Text style={styles.subtitle}>
          Color Colo's welcome party — tap, draw, go wild!
        </Text>

        {/* Canvas Area */}
        <View style={[styles.canvasContainer, { height: canvasAreaHeight }]}>
          {coloringImage && (
            <ImageCanvas
              coloringImage={coloringImage}
              setScroll={setScroll}
              canvasArea={canvasArea}
            />
          )}
        </View>

        {/* Color Palette */}
        <Animated.View
          entering={FadeInUp.delay(300).duration(400)}
          style={styles.paletteContainer}
        >
          <ColorPalette />
        </Animated.View>

        {/* Done Button */}
        <Animated.View entering={FadeInUp.delay(500).duration(400)}>
          <Pressable
            style={({ pressed }) => [
              styles.doneButton,
              pressed && styles.doneButtonPressed,
            ]}
            onPress={handleDone}
          >
            <Text style={styles.doneButtonText}>That's amazing! →</Text>
          </Pressable>
        </Animated.View>
      </Animated.View>
    </View>
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
  },
  skipButtonText: {
    fontFamily: "TondoTrial-Bold",
    fontSize: 16,
    color: "#9CA3AF",
  },
  content: {
    flex: 1,
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
  },
  paletteContainer: {
    width: "100%",
    marginTop: 12,
  },
  doneButton: {
    backgroundColor: "#E46444",
    paddingVertical: 16,
    paddingHorizontal: 40,
    borderRadius: 16,
    marginTop: 16,
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
});

export default OnboardingColoringSlide;

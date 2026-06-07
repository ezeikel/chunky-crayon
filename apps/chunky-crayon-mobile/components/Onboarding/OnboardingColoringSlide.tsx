import {
  Dispatch,
  SetStateAction,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import Animated, {
  FadeIn,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  ZoomIn,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Asset } from "expo-asset";
import ImageCanvas from "@/components/ImageCanvas/ImageCanvas";
import Confetti from "@/components/Confetti/Confetti";
import SceneIconPicker from "./SceneIconPicker";
import SlimColoringTools from "./SlimColoringTools";
import OnboardingColoringSheet from "./OnboardingColoringSheet";
import { COLORS } from "@/lib/design";
import { useCanvasStore } from "@/stores/canvasStore";
import { FontAwesomeIcon } from "@fortawesome/react-native-fontawesome";
import { faCheck } from "@fortawesome/pro-duotone-svg-icons";
import { deleteCanvasState } from "@/utils/canvasPersistence";
import { useResponsiveLayout } from "@/hooks/useResponsiveLayout";
import {
  ONBOARDING_SCENES,
  type OnboardingScene,
} from "@/constants/onboardingScenes";
import type { ColoringImage } from "@/types";

type Phase = "COLORING" | "CELEBRATION";

const pickInitialScene = (): OnboardingScene =>
  ONBOARDING_SCENES[Math.floor(Math.random() * ONBOARDING_SCENES.length)];

type OnboardingColoringSlideProps = {
  onComplete: () => void;
  onSkip: () => void;
  setScroll: Dispatch<SetStateAction<boolean>>;
  isActive?: boolean;
};

/**
 * Onboarding's coloring slide — a slimmed-down version of the real coloring
 * experience, COMPOSED from the same real sub-components (ColorSwatchGrid,
 * BrushSizeRow, the magic ToolTile — see SlimColoringTools) so it matches the
 * app, without the heavy full toolbar (no 10-tool grid / stickers / zoom / undo).
 *
 *   - iPad / landscape: scene-icon rail │ framed canvas │ slim tools rail.
 *   - phone portrait: framed canvas + a slim bottom sheet (scene icons + tools).
 *
 * The scene-ICON picker (party / space / sea / jungle) lives OFF the canvas so
 * swipes never get eaten as strokes. The kid colors with the real swatches/brush
 * or taps Auto Color to fill the scene.
 */
const OnboardingColoringSlide = ({
  onComplete,
  onSkip,
  setScroll,
  isActive = true,
}: OnboardingColoringSlideProps) => {
  const insets = useSafeAreaInsets();
  const { coloringTier, deviceInfo } = useResponsiveLayout();
  const useSidebars = coloringTier === "three-column";
  const screenW = deviceInfo.screenWidth;
  const screenH = deviceInfo.screenHeight;

  const [scene, setScene] = useState<OnboardingScene>(pickInitialScene);
  const [svgUri, setSvgUri] = useState<string | null>(null);
  const [regionMapUri, setRegionMapUri] = useState<string | null>(null);
  const [hasBeenActive, setHasBeenActive] = useState(isActive);
  const [phase, setPhase] = useState<Phase>("COLORING");
  const advanceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { reset, setTool, setBrushType, setImageId, setPaletteVariant } =
    useCanvasStore();

  // Framed-canvas square — sized to MAXIMISE the available space, then the whole
  // group is centered. Sidebars (tablet/landscape) reserve a fixed rail width on
  // each side; the bottom sheet (phone) reserves vertical room. Cap large so a
  // big iPad gets a genuinely big canvas, not a small square in a sea of cream.
  // Both side rails are the SAME width (sized for the wider one — the tools rail
  // with its swatch grid) so the canvas sits dead-center between them. The whole
  // trio is centered both axes by the threeCol flexbox; sizes below are capped so
  // the row total stays comfortably INSIDE the screen (real margin on each edge).
  const RAIL_W = 150;
  const GAP = 32;
  const EDGE = 32; // outer breathing room on each side
  const cardSize = useMemo(() => {
    if (useSidebars) {
      // Reserved horizontally: 2 rails + 2 gaps + 2 outer edges + the container's
      // own 16px padding each side (32 total) + horizontal safe-area insets
      // (the home indicator's left/right insets in landscape). Omitting the last
      // two over-estimates the usable width, so the trio computes wider than the
      // real content box and clips the right rail against the screen edge.
      const reserved =
        RAIL_W * 2 + GAP * 2 + EDGE * 2 + 32 + insets.left + insets.right;
      const horizontalRoom = screenW - reserved;
      const verticalRoom = screenH - 140; // header + a little vertical margin
      // No fixed cap — fill whichever axis is tighter so a big iPad gets a big
      // canvas (square is bounded by the smaller of the two rooms anyway).
      return Math.min(horizontalRoom, verticalRoom);
    }
    // Phone: full width minus margins; height leaves room for the bottom sheet.
    return Math.min(screenW - 40, screenH * 0.52, 460);
  }, [useSidebars, screenW, screenH, insets.left, insets.right]);
  const canvasInner = cardSize - 24;

  useEffect(() => {
    if (isActive && !hasBeenActive) setHasBeenActive(true);
  }, [isActive, hasBeenActive]);

  useEffect(() => {
    let cancelled = false;
    setSvgUri(null);
    setRegionMapUri(null);
    (async () => {
      // Resolve BOTH the SVG and the gzipped region map to local file:// URIs
      // (useRegionStore fetches the region map by URL — file:// works in RN).
      const [svgAsset, mapAsset] = [
        Asset.fromModule(scene.svg),
        Asset.fromModule(scene.regionMap),
      ];
      await Promise.all([svgAsset.downloadAsync(), mapAsset.downloadAsync()]);
      if (cancelled) return;
      if (svgAsset.localUri) setSvgUri(svgAsset.localUri);
      if (mapAsset.localUri) setRegionMapUri(mapAsset.localUri);
    })();
    return () => {
      cancelled = true;
    };
  }, [scene]);

  useEffect(() => {
    deleteCanvasState(scene.id);
    reset();
    setImageId(scene.id);
    setTool("brush");
    setBrushType("crayon");
    // The scenes ship a single realistic region palette — Auto Color uses it.
    setPaletteVariant("realistic");
    setPhase("COLORING");
    return () => {
      if (advanceTimerRef.current) clearTimeout(advanceTimerRef.current);
      deleteCanvasState(scene.id);
      reset();
    };
  }, [scene, reset, setImageId, setTool, setBrushType, setPaletteVariant]);

  // Lock the OUTER onboarding pager only while THIS slide is the active page, so
  // the canvas drawing gesture doesn't fight the pager. When it's not active
  // (incl. adjacent off-screen pre-render), leave the pager swipeable — otherwise
  // mounting this slide would silently freeze the whole carousel. Re-enable on
  // unmount as a safety net.
  useEffect(() => {
    setScroll(!isActive);
    return () => setScroll(true);
  }, [setScroll, isActive]);

  const handleSelectScene = useCallback(
    (next: OnboardingScene) => {
      if (next.id === scene.id) return;
      setScene(next);
    },
    [scene.id],
  );

  // The kid taps the Done check when finished → a quick celebration → advance.
  // (The carousel hides its own Next button on this slide, so the slide owns the
  // way forward.)
  const handleDone = useCallback(() => {
    setPhase("CELEBRATION");
    advanceTimerRef.current = setTimeout(() => onComplete(), 1800);
  }, [onComplete]);

  const handleCelebrationTap = useCallback(() => {
    if (advanceTimerRef.current) clearTimeout(advanceTimerRef.current);
    onComplete();
  }, [onComplete]);

  const coloringImage: ColoringImage | null = useMemo(
    () =>
      svgUri && regionMapUri
        ? {
            id: scene.id,
            title: `Welcome — ${scene.label}`,
            description: `Color Colo's ${scene.label.toLowerCase()} welcome scene!`,
            alt: `Colo in a ${scene.label.toLowerCase()} welcome scene`,
            svgUrl: svgUri,
            // Modern region store (Magic Brush + Auto Color, native machinery).
            regionMapUrl: regionMapUri,
            regionMapWidth: scene.regionData.regionMapWidth,
            regionMapHeight: scene.regionData.regionMapHeight,
            regionsJson: JSON.stringify(scene.regionData.regionsJson),
            tags: [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          }
        : null,
    [svgUri, regionMapUri, scene],
  );

  if (!hasBeenActive) {
    // Pin to the window width even before activation — this slide lives inside a
    // horizontal pagingEnabled ScrollView, where `flex: 1` collapses to content
    // width (the main axis is unbounded), so without an explicit width the page
    // is narrower than the viewport and the neighbouring slide bleeds in. screenW
    // comes from useWindowDimensions (via useResponsiveLayout), so it's reactive
    // to rotation.
    return <View style={[styles.container, { width: screenW }]} />;
  }

  // Framed canvas (paper card) — the real ImageCanvas in a white card with a
  // soft shadow + masking-tape strip (ported from web's EmbeddedColoringCanvas).
  const framedCanvas = (
    <View style={styles.cardOuter}>
      <View style={[styles.card, { width: cardSize, height: cardSize }]}>
        <View style={styles.cardInset}>
          {coloringImage && (
            <ImageCanvas
              coloringImage={coloringImage}
              setScroll={setScroll}
              canvasArea={{ width: canvasInner, height: canvasInner }}
            />
          )}
        </View>
      </View>
      {/* Masking-tape strip — rendered AFTER the card so natural paint order
          layers it on top of the card's top edge. NO zIndex: a high zIndex here
          escaped this view's stacking context and bled THROUGH the bottom sheet
          (the tape showed over the sheet's tools). Paint order keeps it local. */}
      <View style={styles.tape} pointerEvents="none" />
    </View>
  );

  const showChrome = phase === "COLORING";
  const picker = showChrome ? (
    <SceneIconPicker
      activeId={scene.id}
      onSelect={handleSelectScene}
      direction={useSidebars ? "column" : "row"}
    />
  ) : null;
  const tools = showChrome ? (
    <SlimColoringTools direction={useSidebars ? "column" : "row"} />
  ) : null;

  return (
    <View
      style={[styles.container, { width: screenW, paddingTop: insets.top + 8 }]}
    >
      {showChrome && (
        <Pressable
          style={[styles.skipButton, { top: insets.top + 4 }]}
          onPress={onSkip}
        >
          <Text style={styles.skipButtonText}>Skip</Text>
        </Pressable>
      )}

      <Animated.View entering={FadeIn.duration(400)} style={styles.header}>
        <Text style={styles.title}>Your Turn to Create!</Text>
        {showChrome && (
          <Text style={styles.subtitle}>Pick a scene and color Colo in</Text>
        )}
      </Animated.View>

      {useSidebars ? (
        // TABLET / LANDSCAPE: scene rail │ framed canvas │ slim tools rail.
        <View style={styles.threeCol}>
          <View style={styles.leftRail}>{picker}</View>
          <View style={styles.canvasCol}>{framedCanvas}</View>
          <View style={styles.rightRail}>{tools}</View>
        </View>
      ) : (
        // PHONE: framed canvas fills the area; a REAL draggable BottomSheet
        // (OnboardingColoringSheet, below as a sibling) docks over the bottom
        // with the same snap points as the live coloring sheet.
        <View style={styles.canvasColPhone}>{framedCanvas}</View>
      )}

      {/* Done — on iPad/landscape, a round orange-check FAB floating over the
          empty rail space (the phone tier puts the Done pill inside the sheet,
          so this never overlaps the tools). */}
      {showChrome && useSidebars && (
        <Pressable
          style={[styles.doneFab, { bottom: insets.bottom + 20 }]}
          onPress={handleDone}
          accessibilityRole="button"
          accessibilityLabel="Done"
        >
          <FontAwesomeIcon icon={faCheck} size={24} color="#FFFFFF" />
        </Pressable>
      )}

      {/* PHONE: the real draggable bottom sheet (MIN / PEEK / HALF / FULL
          detents, identical to MobileColoringToolbar). Rendered as a sibling so
          the native inline sheet docks to the bottom of the slide and overlays
          the canvas — drag it down for more canvas, exactly like the live
          coloring screen. */}
      {!useSidebars && showChrome && (
        <OnboardingColoringSheet>
          {/* Done — full-width pill at the TOP of the sheet body (right under the
              handle), so it's visible at EVERY detent (even PEEK). At the bottom
              it was only reachable once fully expanded. */}
          <Pressable
            style={styles.donePill}
            onPress={handleDone}
            accessibilityRole="button"
            accessibilityLabel="Done"
          >
            <FontAwesomeIcon icon={faCheck} size={18} color="#FFFFFF" />
            <Text style={styles.donePillText}>I&apos;m Done</Text>
          </Pressable>
          {picker}
          {tools}
        </OnboardingColoringSheet>
      )}

      {phase === "CELEBRATION" && (
        <Pressable
          style={styles.celebrationOverlay}
          onPress={handleCelebrationTap}
        >
          <CelebrationText />
        </Pressable>
      )}

      <Confetti isActive={phase === "CELEBRATION"} />
    </View>
  );
};

/** "Amazing!" celebration text with a spring bounce. */
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
      style={[styles.celebration, animatedStyle]}
    >
      <Text style={styles.celebrationText}>Amazing!</Text>
      <Text style={styles.celebrationSubtext}>
        You&apos;re a natural artist
      </Text>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 16,
  },
  skipButton: {
    position: "absolute",
    right: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
    zIndex: 20,
  },
  skipButtonText: {
    fontFamily: "TondoTrial-Bold",
    fontSize: 16,
    color: "#9CA3AF",
  },
  header: {
    alignItems: "center",
    marginBottom: 12,
  },
  title: {
    fontFamily: "TondoTrial-Bold",
    fontSize: 26,
    color: "#374151",
    textAlign: "center",
    marginBottom: 4,
  },
  subtitle: {
    fontFamily: "TondoTrial-Regular",
    fontSize: 16,
    color: "#6B7280",
    textAlign: "center",
  },
  // The three-column group fills the area and centers as a unit. Both rails are
  // the SAME fixed width so the canvas sits dead-center; the canvas column flexes
  // to take the middle space.
  threeCol: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 32, // = GAP in cardSize calc
    paddingHorizontal: 32, // = EDGE in cardSize calc
  },
  leftRail: {
    width: 150,
    alignItems: "center",
    justifyContent: "center",
  },
  rightRail: {
    width: 150,
    alignItems: "center",
    justifyContent: "center",
  },
  canvasCol: {
    alignItems: "center",
    justifyContent: "center",
  },
  // Phone: the canvas fills the area above the docked sheet. Bias the card
  // toward the TOP (not centered in the full screen) so it sits in the region
  // visible above the PEEK detent rather than hiding behind the sheet.
  canvasColPhone: {
    flex: 1,
    alignItems: "center",
    justifyContent: "flex-start",
    paddingTop: 8,
  },
  // Phone "I'm Done" CTA — full-width orange pill at the foot of the sheet body,
  // below the tools, so it never overlaps them (the round FAB is iPad-only now).
  donePill: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    alignSelf: "stretch",
    height: 52,
    borderRadius: 26,
    backgroundColor: COLORS.crayonOrange,
    shadowColor: COLORS.crayonOrange,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  donePillText: {
    fontFamily: "TondoTrial-Bold",
    fontSize: 18,
    color: "#FFFFFF",
  },
  cardOuter: {
    alignItems: "center",
    justifyContent: "center",
  },
  tape: {
    position: "absolute",
    top: -6,
    width: 96,
    height: 22,
    borderRadius: 2,
    transform: [{ rotate: "-3deg" }],
    backgroundColor: "rgba(250, 195, 66, 0.55)",
  },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 18,
    padding: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 6,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.04)",
  },
  cardInset: {
    flex: 1,
    borderRadius: 10,
    overflow: "hidden",
    backgroundColor: COLORS.bgCanvas,
    alignItems: "center",
    justifyContent: "center",
  },
  doneFab: {
    position: "absolute",
    right: 24,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: COLORS.crayonOrange,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 25,
    shadowColor: COLORS.crayonOrange,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },
  celebrationOverlay: {
    ...StyleSheet.absoluteFill,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 30,
  },
  celebration: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.85)",
    paddingHorizontal: 32,
    paddingVertical: 20,
    borderRadius: 24,
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

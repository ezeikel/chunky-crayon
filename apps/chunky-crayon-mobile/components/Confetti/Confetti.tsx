import { useEffect, useMemo, useRef, useState } from "react";
import { StyleSheet, useWindowDimensions, View } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  Easing,
} from "react-native-reanimated";
import { notifySuccess } from "@/utils/haptics";

/**
 * Confetti burst on save / sticker unlock / Colo evolution.
 *
 * Mobile port of web's
 * `apps/chunky-crayon-web/components/Confetti/Confetti.tsx`. Web
 * uses canvas-confetti (GPU-accelerated). Mobile uses reanimated
 * rectangles + circles — canvas-confetti doesn't work in RN, and a
 * Skia-based equivalent would compete with the actual coloring
 * canvas for resources. Reanimated on a pointer-events-none overlay
 * is the cleanest fit.
 *
 * The PATTERN matches web: two side bursts (school-pride angle pair
 * — low-left + low-right shooting up-and-in) followed by a centre
 * "money shot" 250ms later. Saturated CC crayon palette — NOT the
 * muted kid drawing palette — so the burst pops on cream paper.
 *
 * Re-fires when `isActive` flips false → true. Host owns when to
 * trigger; `onComplete` fires after `duration` (1500ms default, same
 * as web).
 */

// Saturated CC crayon palette. Mirrors web's CC_CRAYON_COLORS list
// verbatim. The kid PALETTE_COLORS (drawing palette) is too muted to
// pop on the cream background.
const CC_CRAYON_COLORS = [
  "#FF6B35", // crayon orange
  "#FFC638", // crayon yellow
  "#F95880", // crayon pink
  "#7CC576", // crayon green
  "#5DADE2", // crayon sky
  "#9B59B6", // crayon purple
  "#FF8C7C", // coral
  "#F5A623", // tangerine
];

const DEFAULT_DURATION = 1500;
const SIDE_PARTICLES = 45;
const CENTER_PARTICLES = 80;
const CENTER_DELAY_MS = 250;

type ConfettiPiece = {
  startX: number; // 0..1 of width
  startY: number; // 0..1 of height
  driftX: number; // horizontal travel in px
  peakY: number; // peak vertical offset in px (negative = up)
  delay: number; // ms before the piece starts animating
  duration: number; // total flight time, ms
  rotation: number; // final rotation, degrees
  color: string;
  size: number; // width in px
  isCircle: boolean;
};

type BurstSpec = {
  count: number;
  originX: number;
  originY: number;
  angle: number; // degrees: 0=right, 90=up, 180=left
  spread: number; // half-spread degrees
  velocity: number;
  scalar: number; // particle size multiplier
  duration: number;
  delayMs: number;
};

const generatePieces = (
  burst: BurstSpec,
  screenWidth: number,
  screenHeight: number,
): ConfettiPiece[] => {
  const angleRad = (burst.angle * Math.PI) / 180;
  const spreadRad = (burst.spread * Math.PI) / 180;

  return Array.from({ length: burst.count }, () => {
    // Triangular distribution within the spread cone — burst feels
    // concentrated rather than uniform.
    const angleOffset =
      ((Math.random() + Math.random()) / 2 - 0.5) * 2 * spreadRad;
    const launchAngle = angleRad + angleOffset;

    // Per-particle velocity variance so they don't arrive in a
    // single cluster.
    const speed = burst.velocity * (0.7 + Math.random() * 0.6);
    const driftX = Math.cos(launchAngle) * speed * (screenWidth / 200);
    const peakY = -Math.sin(launchAngle) * speed * (screenHeight / 200);

    return {
      startX: burst.originX,
      startY: burst.originY,
      driftX,
      peakY,
      delay: burst.delayMs + Math.random() * 80,
      duration: burst.duration * (0.9 + Math.random() * 0.3),
      rotation: (Math.random() - 0.5) * 720,
      color:
        CC_CRAYON_COLORS[Math.floor(Math.random() * CC_CRAYON_COLORS.length)],
      size: (5 + Math.random() * 6) * burst.scalar,
      isCircle: Math.random() > 0.5,
    };
  });
};

type ConfettiProps = {
  /** When true, fire the burst. Re-fires on false → true edge. */
  isActive: boolean;
  /** Called after `duration` ms — host can re-trigger any time after. */
  onComplete?: () => void;
  /** Total visible time before onComplete. Default 1500ms (web parity). */
  duration?: number;
};

const Confetti = ({
  isActive,
  onComplete,
  duration = DEFAULT_DURATION,
}: ConfettiProps) => {
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const hasFiredRef = useRef(false);
  // Bump a key whenever we re-fire — that's how reanimated picks up
  // the new piece array on subsequent isActive→true edges.
  const [fireId, setFireId] = useState(0);

  useEffect(() => {
    if (!isActive) {
      hasFiredRef.current = false;
      return undefined;
    }
    if (hasFiredRef.current) return undefined;
    hasFiredRef.current = true;
    notifySuccess();
    setFireId((id) => id + 1);

    const completeTimer = setTimeout(() => {
      onComplete?.();
    }, duration);

    return () => clearTimeout(completeTimer);
  }, [isActive, duration, onComplete]);

  // Two side bursts + one delayed centre. Mirrors web's
  // sideBurst(0.05, 60) + sideBurst(0.95, 120) + setTimeout(center, 250).
  const pieces = useMemo<ConfettiPiece[]>(() => {
    // fireId is the regenerate key — referencing it makes useMemo
    // recompute on each fire so the burst always has fresh randoms.
    void fireId;
    return [
      ...generatePieces(
        {
          count: SIDE_PARTICLES,
          originX: 0.05,
          originY: 0.7,
          angle: 60,
          spread: 35,
          velocity: 55,
          scalar: 1.2,
          duration: 1200,
          delayMs: 0,
        },
        screenWidth,
        screenHeight,
      ),
      ...generatePieces(
        {
          count: SIDE_PARTICLES,
          originX: 0.95,
          originY: 0.7,
          angle: 120,
          spread: 35,
          velocity: 55,
          scalar: 1.2,
          duration: 1200,
          delayMs: 0,
        },
        screenWidth,
        screenHeight,
      ),
      ...generatePieces(
        {
          count: CENTER_PARTICLES,
          originX: 0.5,
          originY: 0.8,
          angle: 90,
          spread: 55,
          velocity: 45,
          scalar: 1.4,
          duration: 1400,
          delayMs: CENTER_DELAY_MS,
        },
        screenWidth,
        screenHeight,
      ),
    ];
  }, [fireId, screenWidth, screenHeight]);

  if (!isActive && !hasFiredRef.current) return null;

  return (
    <View style={styles.overlay} pointerEvents="none">
      {pieces.map((piece, i) => (
        <ConfettiPieceView
          key={`${fireId}-${i}`}
          piece={piece}
          screenWidth={screenWidth}
          screenHeight={screenHeight}
        />
      ))}
    </View>
  );
};

const ConfettiPieceView = ({
  piece,
  screenWidth,
  screenHeight,
}: {
  piece: ConfettiPiece;
  screenWidth: number;
  screenHeight: number;
}) => {
  // progress goes 0 → 1 over the piece's flight; we derive position
  // from it + a gravity curve so the piece arcs up then falls.
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withDelay(
      piece.delay,
      withTiming(1, {
        duration: piece.duration,
        easing: Easing.linear,
      }),
    );
  }, [progress, piece.delay, piece.duration]);

  const animatedStyle = useAnimatedStyle(() => {
    const p = progress.value;
    // Drift goes linearly — pieces don't curve sideways during fall.
    const tx = piece.driftX * p;
    // Arc: peakY contribution peaks at p=0.5 (parabolic), zero at
    // p=0 and p=1. Then gravity adds a quadratic downward pull
    // after the apex.
    const arch = piece.peakY * (1 - Math.pow(2 * p - 1, 2));
    const gravity = 600 * p * p;
    const ty = arch + gravity;
    const rotate = piece.rotation * p;
    // Fade out the last quarter so pieces don't snap out.
    const opacity = p < 0.75 ? 1 : 1 - (p - 0.75) / 0.25;

    return {
      transform: [
        { translateX: tx },
        { translateY: ty },
        { rotate: `${rotate}deg` },
      ],
      opacity,
    };
  });

  return (
    <Animated.View
      style={[
        {
          position: "absolute",
          top: piece.startY * screenHeight,
          left: piece.startX * screenWidth,
          width: piece.size,
          height: piece.isCircle ? piece.size : piece.size * 1.5,
          borderRadius: piece.isCircle ? piece.size / 2 : 2,
          backgroundColor: piece.color,
        },
        animatedStyle,
      ]}
    />
  );
};

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFill,
    overflow: "hidden",
  },
});

export default Confetti;

import { useEffect, useMemo, useRef } from "react";
import { StyleSheet, useWindowDimensions, View } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  Easing,
} from "react-native-reanimated";
import { PALETTE_COLORS } from "@/constants/Colors";
import { notifySuccess } from "@/utils/haptics";

const PIECE_COUNT = 25;
const DURATION = 2500;

type ConfettiPiece = {
  x: number; // horizontal start position (0-1 fraction of width)
  delay: number; // stagger delay in ms
  color: string;
  rotation: number; // final rotation in degrees
  driftX: number; // horizontal drift in px
  size: number; // width of piece
  isCircle: boolean;
};

type ConfettiProps = {
  visible: boolean;
  onComplete?: () => void;
};

const Confetti = ({ visible, onComplete }: ConfettiProps) => {
  const { width: screenWidth } = useWindowDimensions();
  const hasTriggeredRef = useRef(false);

  // Generate random pieces once
  const pieces = useMemo<ConfettiPiece[]>(
    () =>
      Array.from({ length: PIECE_COUNT }, () => ({
        x: Math.random(),
        delay: Math.random() * 400,
        color:
          PALETTE_COLORS[Math.floor(Math.random() * PALETTE_COLORS.length)],
        rotation: (Math.random() - 0.5) * 720,
        driftX: (Math.random() - 0.5) * 120,
        size: 6 + Math.random() * 6,
        isCircle: Math.random() > 0.5,
      })),
    [],
  );

  useEffect(() => {
    if (visible && !hasTriggeredRef.current) {
      hasTriggeredRef.current = true;
      notifySuccess();

      if (onComplete) {
        const timer = setTimeout(onComplete, DURATION);
        return () => clearTimeout(timer);
      }
    }
  }, [visible, onComplete]);

  if (!visible) return null;

  return (
    <View style={styles.overlay} pointerEvents="none">
      {pieces.map((piece, i) => (
        <ConfettiPieceView key={i} piece={piece} screenWidth={screenWidth} />
      ))}
    </View>
  );
};

const ConfettiPieceView = ({
  piece,
  screenWidth,
}: {
  piece: ConfettiPiece;
  screenWidth: number;
}) => {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withDelay(
      piece.delay,
      withTiming(1, {
        duration: DURATION - piece.delay,
        easing: Easing.out(Easing.quad),
      }),
    );
  }, [progress, piece.delay]);

  const animatedStyle = useAnimatedStyle(() => {
    const p = progress.value;
    // Gravity: starts fast at top, accelerates downward
    const translateY = p * p * 800;
    const translateX = piece.driftX * p;
    const rotate = piece.rotation * p;
    const opacity = p < 0.8 ? 1 : 1 - (p - 0.8) / 0.2;

    return {
      transform: [{ translateX }, { translateY }, { rotate: `${rotate}deg` }],
      opacity,
    };
  });

  return (
    <Animated.View
      style={[
        {
          position: "absolute",
          top: -10,
          left: piece.x * screenWidth,
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
    ...StyleSheet.absoluteFillObject,
    overflow: "hidden",
  },
});

export default Confetti;

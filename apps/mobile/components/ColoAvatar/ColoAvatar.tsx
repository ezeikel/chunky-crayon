import { useState, useCallback, useEffect, useMemo } from "react";
import { View, Text, TouchableOpacity, Image, StyleSheet } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  withTiming,
  runOnJS,
} from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import Svg, { Circle } from "react-native-svg";
import * as Haptics from "expo-haptics";
import type { ColoStage, ColoState } from "@/lib/colo";
import { COLO_STAGES } from "@/lib/colo";
import {
  COLORS,
  COLO_STAGE_COLORS,
  SHADOWS,
  FONTS,
  RADIUS,
} from "@/lib/design";

type AvatarSize = "xs" | "sm" | "md" | "lg" | "xl";

type ParticleType = "heart" | "star" | "sparkle";

type Particle = {
  id: string;
  type: ParticleType;
  x: number;
  y: number;
};

type ColoAvatarProps = {
  /** Colo state from server */
  coloState?: ColoState | null;
  /** Or just provide the stage directly */
  stage?: ColoStage;
  /** Size of the avatar */
  size?: AvatarSize;
  /** Show progress to next stage */
  showProgress?: boolean;
  /** Enable tap reactions (animations, sounds, particles) */
  enableTapReactions?: boolean;
  /** Click handler */
  onPress?: () => void;
};

const SIZES: Record<AvatarSize, number> = {
  xs: 32,
  sm: 48,
  md: 64,
  lg: 96,
  xl: 128,
};

const WRAPPER_SIZES: Record<AvatarSize, number> = {
  xs: 40,
  sm: 56,
  md: 80,
  lg: 112,
  xl: 144,
};

const TEXT_SIZES: Record<AvatarSize, number> = {
  xs: 8,
  sm: 10,
  md: 12,
  lg: 14,
  xl: 16,
};

const EMOJI_SIZES: Record<AvatarSize, number> = {
  xs: 10,
  sm: 12,
  md: 14,
  lg: 16,
  xl: 20,
};

// Particle emojis for reactions
const PARTICLE_EMOJIS: Record<ParticleType, string> = {
  heart: "❤️",
  star: "⭐",
  sparkle: "✨",
};

const getRandomParticleType = (): ParticleType => {
  const types: ParticleType[] = ["heart", "star", "sparkle"];
  return types[Math.floor(Math.random() * types.length)];
};

const ColoAvatar = ({
  coloState,
  stage: stageProp,
  size = "md",
  showProgress = false,
  enableTapReactions = true,
  onPress,
}: ColoAvatarProps) => {
  const [particles, setParticles] = useState<Particle[]>([]);
  const [tapCount, setTapCount] = useState(0);

  // Animation values
  const scale = useSharedValue(1);
  const rotation = useSharedValue(0);

  // Determine stage from props
  const stage = coloState?.stage ?? stageProp ?? 1;
  const stageInfo = COLO_STAGES[stage];
  const stageColors = COLO_STAGE_COLORS[stage];

  // Check if SVG exists - for now use placeholder
  const showPlaceholder = true; // Will be false when we have actual images

  // Determine if we need the larger wrapper for progress ring
  const hasProgress = showProgress && coloState?.progressToNext;
  const avatarSize = SIZES[size];
  const wrapperSize = hasProgress ? WRAPPER_SIZES[size] : avatarSize;

  // Animated styles
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }, { rotate: `${rotation.value}deg` }],
  }));

  // Particle float animation
  const particleAnimatedStyle = useAnimatedStyle(() => ({
    opacity: withTiming(0, { duration: 800 }),
    transform: [{ translateY: withTiming(-40, { duration: 800 }) }],
  }));

  // Clean up particles after animation
  useEffect(() => {
    if (particles.length > 0) {
      const timer = setTimeout(() => {
        setParticles([]);
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [particles]);

  // Spawn floating particles
  const spawnParticles = useCallback(() => {
    const particleCount = Math.min(2 + Math.floor(tapCount / 3), 5);

    const newParticles: Particle[] = Array.from(
      { length: particleCount },
      (_, i) => ({
        id: `particle-${Date.now()}-${i}`,
        type: getRandomParticleType(),
        x: (Math.random() - 0.5) * 60,
        y: (Math.random() - 0.5) * 20,
      }),
    );

    setParticles(newParticles);
  }, [tapCount]);

  // Handle tap reaction
  const handleTapReaction = useCallback(async () => {
    if (!enableTapReactions) return;

    // Haptic feedback
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    // Trigger wiggle animation
    rotation.value = withSequence(
      withTiming(-5, { duration: 50 }),
      withTiming(5, { duration: 50 }),
      withTiming(-5, { duration: 50 }),
      withTiming(5, { duration: 50 }),
      withTiming(0, { duration: 50 }),
    );

    // Trigger bounce animation
    scale.value = withSequence(
      withSpring(1.15, { damping: 5, stiffness: 400 }),
      withSpring(1, { damping: 8, stiffness: 200 }),
    );

    // Spawn particles
    runOnJS(spawnParticles)();
    runOnJS(setTapCount)((prev: number) => prev + 1);
  }, [enableTapReactions, rotation, scale, spawnParticles]);

  // Combined press handler
  const handlePress = useCallback(() => {
    handleTapReaction();
    onPress?.();
  }, [handleTapReaction, onPress]);

  // Progress ring calculations
  const progressPercentage = coloState?.progressToNext?.percentage ?? 0;
  const ringRadius = wrapperSize / 2 - 4;
  const strokeDasharray = useMemo(() => {
    const circumference = 2 * Math.PI * ringRadius;
    const filled = (progressPercentage / 100) * circumference;
    return `${filled} ${circumference}`;
  }, [progressPercentage, ringRadius]);

  // Get stage emoji
  const getStageEmoji = () => {
    if (stage <= 2) return "🥚";
    if (stage <= 4) return "🐣";
    return "🌟";
  };

  return (
    <View
      style={[styles.container, { width: wrapperSize, height: wrapperSize }]}
    >
      {/* Floating reaction particles */}
      {particles.map((particle) => (
        <Animated.View
          key={particle.id}
          style={[
            styles.particle,
            {
              left: wrapperSize / 2 + particle.x,
              top: wrapperSize / 2 + particle.y,
            },
            particleAnimatedStyle,
          ]}
        >
          <Text style={styles.particleEmoji}>
            {PARTICLE_EMOJIS[particle.type]}
          </Text>
        </Animated.View>
      ))}

      {/* Main avatar container */}
      <TouchableOpacity
        onPress={handlePress}
        activeOpacity={0.9}
        accessibilityLabel={`${stageInfo.name} - ${stageInfo.description}`}
        accessibilityRole="button"
        style={styles.touchable}
      >
        <Animated.View
          style={[
            styles.avatarContainer,
            { width: avatarSize, height: avatarSize },
            SHADOWS.md,
            animatedStyle,
          ]}
        >
          {showPlaceholder ? (
            /* Placeholder gradient with stage indicator */
            <LinearGradient
              colors={[stageColors.from, stageColors.to]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.gradientContainer}
            >
              {/* Stage number */}
              <Text
                style={[styles.stageNumber, { fontSize: TEXT_SIZES[size] }]}
              >
                {stage}
              </Text>
              {/* Stage emoji */}
              <Text style={{ fontSize: EMOJI_SIZES[size] }}>
                {getStageEmoji()}
              </Text>
            </LinearGradient>
          ) : (
            /* Actual Colo image - will be used when we have images */
            <Image
              source={{ uri: stageInfo.imagePath }}
              style={styles.coloImage}
              resizeMode="cover"
            />
          )}

          {/* Shine effect overlay */}
          <View style={styles.shineOverlay} />
        </Animated.View>
      </TouchableOpacity>

      {/* Progress ring (optional) */}
      {hasProgress && (
        <View style={styles.progressRingContainer} pointerEvents="none">
          <Svg
            width={wrapperSize}
            height={wrapperSize}
            style={styles.progressRingSvg}
          >
            {/* Background track */}
            <Circle
              cx={wrapperSize / 2}
              cy={wrapperSize / 2}
              r={wrapperSize / 2 - 4}
              fill="none"
              stroke={COLORS.border}
              strokeWidth={4}
            />
            {/* Progress arc */}
            <Circle
              cx={wrapperSize / 2}
              cy={wrapperSize / 2}
              r={wrapperSize / 2 - 4}
              fill="none"
              stroke={COLORS.primary}
              strokeWidth={4}
              strokeLinecap="round"
              strokeDasharray={strokeDasharray}
            />
          </Svg>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
  },
  particle: {
    position: "absolute",
    zIndex: 20,
  },
  particleEmoji: {
    fontSize: 18,
  },
  touchable: {
    borderRadius: RADIUS.full,
  },
  avatarContainer: {
    borderRadius: RADIUS.full,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.bgCream,
  },
  gradientContainer: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  stageNumber: {
    color: COLORS.white,
    fontFamily: FONTS.bold,
    textShadowColor: "rgba(0,0,0,0.3)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  coloImage: {
    width: "100%",
    height: "100%",
  },
  shineOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: RADIUS.full,
    opacity: 0.3,
  },
  progressRingContainer: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
  },
  progressRingSvg: {
    transform: [{ rotate: "-90deg" }],
  },
});

export default ColoAvatar;

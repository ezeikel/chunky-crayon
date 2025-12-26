'use client';

import { useState, useCallback, useEffect, useId } from 'react';
import Image from 'next/image';
import cn from '@/utils/cn';
import type { ColoStage, ColoState } from '@/lib/colo';
import { COLO_STAGES } from '@/lib/colo';

/**
 * TODO: Future Lottie Integration
 * ================================
 * When Colo SVGs are redrawn with named layers, we can integrate Lottie for:
 * - Smooth eye blink animations
 * - Mouth movements when "speaking"
 * - Body wiggle/bounce with proper physics
 * - Stage-specific idle animations
 * - Accessory bounce (hat, scarf, etc.)
 *
 * Required:
 * 1. SVGs with named layers (eyes, mouth, body, accessories)
 * 2. After Effects compositions for each animation
 * 3. Lottie JSON exports
 * 4. lottie-react or @lottiefiles/react-lottie-player package
 *
 * Animation triggers:
 * - onTap: Play reaction animation (wiggle, blink, smile)
 * - idle: Subtle breathing/floating animation
 * - evolved: Celebration animation with sparkles
 */

type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

// Reaction types for tap interactions
type ReactionType = 'wiggle' | 'bounce' | 'squish' | 'happy-jump' | 'shake';

// Floating particle types
type ParticleType = 'heart' | 'star' | 'sparkle';

// Particle data structure
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
  /** Show stage name on hover/click */
  showTooltip?: boolean;
  /** Show progress to next stage */
  showProgress?: boolean;
  /** Enable tap reactions (animations, sounds, particles) */
  enableTapReactions?: boolean;
  /** Additional className */
  className?: string;
  /** Click handler */
  onClick?: () => void;
};

const sizeClasses: Record<AvatarSize, string> = {
  xs: 'w-8 h-8',
  sm: 'w-12 h-12',
  md: 'w-16 h-16',
  lg: 'w-24 h-24',
  xl: 'w-32 h-32',
};

// Wrapper sizes when progress ring is shown (slightly larger to accommodate ring)
const wrapperWithProgressClasses: Record<AvatarSize, string> = {
  xs: 'w-10 h-10',
  sm: 'w-14 h-14',
  md: 'w-20 h-20',
  lg: 'w-28 h-28',
  xl: 'w-36 h-36',
};

const textSizeClasses: Record<AvatarSize, string> = {
  xs: 'text-[8px]',
  sm: 'text-[10px]',
  md: 'text-xs',
  lg: 'text-sm',
  xl: 'text-base',
};

// Stage colors for placeholder gradient backgrounds
const stageColors: Record<ColoStage, { from: string; to: string }> = {
  1: { from: 'from-amber-200', to: 'to-amber-400' }, // Baby - warm yellow
  2: { from: 'from-emerald-200', to: 'to-emerald-400' }, // Little - green growth
  3: { from: 'from-sky-200', to: 'to-sky-400' }, // Growing - sky blue
  4: { from: 'from-pink-200', to: 'to-pink-400' }, // Happy - joyful pink
  5: { from: 'from-violet-200', to: 'to-violet-400' }, // Artist - creative violet
  6: { from: 'from-orange-300', to: 'to-amber-500' }, // Master - golden
};

// Particle emojis for reactions
const PARTICLE_EMOJIS: Record<ParticleType, string> = {
  heart: '❤️',
  star: '⭐',
  sparkle: '✨',
};

// Available reaction animations
const REACTION_ANIMATIONS: ReactionType[] = [
  'wiggle',
  'bounce',
  'squish',
  'happy-jump',
  'shake',
];

// Animation class mapping
const ANIMATION_CLASSES: Record<ReactionType, string> = {
  wiggle: 'animate-wiggle',
  bounce: 'animate-bounce-in',
  squish: 'animate-squish',
  'happy-jump': 'animate-happy-jump',
  shake: 'animate-shake',
};

/**
 * TODO: Stage-specific reactions
 * ==============================
 * Different stages could have different reaction styles:
 * - Stage 1 (Baby): Simple wiggle, fewer particles
 * - Stage 2-3: Standard reactions
 * - Stage 4-5 (Artist): More elaborate animations, more particles
 * - Stage 6 (Master): Special golden particles, unique animations
 */
const getRandomReaction = (): ReactionType => {
  return REACTION_ANIMATIONS[
    Math.floor(Math.random() * REACTION_ANIMATIONS.length)
  ];
};

const getRandomParticleType = (): ParticleType => {
  const types: ParticleType[] = ['heart', 'star', 'sparkle'];
  return types[Math.floor(Math.random() * types.length)];
};

const ColoAvatar = ({
  coloState,
  stage: stageProp,
  size = 'md',
  showTooltip = false,
  showProgress = false,
  enableTapReactions = true,
  className,
  onClick,
}: ColoAvatarProps) => {
  const uniqueId = useId();
  const [showTooltipState, setShowTooltipState] = useState(false);
  const [currentAnimation, setCurrentAnimation] = useState<ReactionType | null>(
    null,
  );
  const [particles, setParticles] = useState<Particle[]>([]);
  const [tapCount, setTapCount] = useState(0);

  // Determine stage from props
  const stage = coloState?.stage ?? stageProp ?? 1;
  const stageInfo = COLO_STAGES[stage];
  const colors = stageColors[stage];

  // Check if SVG exists - for now, only stage 1 uses the base colo.svg
  // Later we'll have stage-specific SVGs at /images/colo/stage-{n}.svg
  const imagePath = stage === 1 ? '/images/colo.svg' : stageInfo.imagePath;
  const [imageError, setImageError] = useState(false);

  // Use placeholder if image doesn't exist
  const showPlaceholder = imageError || stage !== 1;

  // Determine if we need the larger wrapper for progress ring
  const hasProgress = showProgress && coloState?.progressToNext;

  // Use div when no onClick to avoid nested button issues with dropdown triggers
  const AvatarWrapper = onClick || enableTapReactions ? 'button' : 'div';

  // Clear animation after it completes
  useEffect(() => {
    if (currentAnimation) {
      const timer = setTimeout(() => {
        setCurrentAnimation(null);
      }, 600); // Animation duration
      return () => clearTimeout(timer);
    }
  }, [currentAnimation]);

  // Clean up particles after animation
  useEffect(() => {
    if (particles.length > 0) {
      const timer = setTimeout(() => {
        setParticles([]);
      }, 800); // Particle animation duration
      return () => clearTimeout(timer);
    }
  }, [particles]);

  // Spawn floating particles
  const spawnParticles = useCallback(() => {
    // Number of particles based on tap count (more taps = more particles, up to 5)
    const particleCount = Math.min(2 + Math.floor(tapCount / 3), 5);

    const newParticles: Particle[] = Array.from(
      { length: particleCount },
      (_, i) => ({
        id: `${uniqueId}-particle-${Date.now()}-${i}`,
        type: getRandomParticleType(),
        // Random position around the avatar
        x: (Math.random() - 0.5) * 60,
        y: (Math.random() - 0.5) * 20,
      }),
    );

    setParticles(newParticles);
  }, [uniqueId, tapCount]);

  // Handle tap reaction
  const handleTapReaction = useCallback(() => {
    if (!enableTapReactions) return;

    // Trigger animation
    setCurrentAnimation(getRandomReaction());

    // Spawn particles
    spawnParticles();

    // Increment tap count for variety
    setTapCount((prev) => prev + 1);

    /**
     * TODO: Sound integration
     * =======================
     * The useSound hook requires ColoringContext which may not be available
     * in all places where ColoAvatar is used (e.g., account settings).
     *
     * Options:
     * 1. Make ColoringContext available app-wide
     * 2. Create a standalone sound utility that doesn't need context
     * 3. Only play sounds when context is available
     *
     * For now, sound is not integrated. When implementing:
     * - Use 'tap' or 'pop' sound for basic taps
     * - Use 'sparkle' for special reactions (every 5th tap)
     */
  }, [enableTapReactions, spawnParticles]);

  // Combined click handler
  const handleClick = useCallback(() => {
    handleTapReaction();
    onClick?.();
  }, [handleTapReaction, onClick]);

  return (
    <div
      className={cn(
        'relative inline-flex items-center justify-center',
        hasProgress ? wrapperWithProgressClasses[size] : undefined,
      )}
    >
      {/* Floating reaction particles */}
      {particles.map((particle) => (
        <span
          key={particle.id}
          className="absolute pointer-events-none text-lg animate-reaction-float z-20"
          style={{
            left: `calc(50% + ${particle.x}px)`,
            top: `calc(50% + ${particle.y}px)`,
          }}
        >
          {PARTICLE_EMOJIS[particle.type]}
        </span>
      ))}

      {/* Main avatar container - uses button only when interactive */}
      <AvatarWrapper
        {...(onClick || enableTapReactions ? { type: 'button' } : {})}
        className={cn(
          'relative rounded-full overflow-hidden transition-transform',
          (onClick || enableTapReactions) &&
            'focus:outline-none focus:ring-2 focus:ring-crayon-orange focus:ring-offset-2 cursor-pointer hover:scale-105',
          !(onClick || enableTapReactions) && 'cursor-default',
          sizeClasses[size],
          // Apply current animation
          currentAnimation && ANIMATION_CLASSES[currentAnimation],
          className,
        )}
        onClick={handleClick}
        onMouseEnter={() => showTooltip && setShowTooltipState(true)}
        onMouseLeave={() => showTooltip && setShowTooltipState(false)}
        aria-label={`${stageInfo.name} - ${stageInfo.description}${enableTapReactions ? ' - Tap me!' : ''}`}
      >
        {showPlaceholder ? (
          /* Placeholder gradient with stage indicator */
          <div
            className={cn(
              'w-full h-full flex flex-col items-center justify-center bg-gradient-to-br',
              colors.from,
              colors.to,
            )}
          >
            {/* Stage number */}
            <span
              className={cn(
                'font-tondo font-bold text-white drop-shadow-md',
                textSizeClasses[size],
              )}
            >
              {stage}
            </span>
            {/* Stage emoji based on evolution */}
            <span
              className={cn(
                'leading-none',
                size === 'xs'
                  ? 'text-[10px]'
                  : size === 'sm'
                    ? 'text-xs'
                    : 'text-sm',
              )}
            >
              {stage <= 2 ? '🥚' : stage <= 4 ? '🐣' : '🌟'}
            </span>
          </div>
        ) : (
          /* Actual Colo image */
          <Image
            src={imagePath}
            alt={stageInfo.name}
            fill
            className="object-cover"
            onError={() => setImageError(true)}
          />
        )}

        {/* Shine effect */}
        <div className="absolute inset-0 bg-gradient-to-br from-white/30 to-transparent pointer-events-none" />
      </AvatarWrapper>

      {/* Progress ring (optional) - fills the larger wrapper */}
      {hasProgress && (
        <svg
          className="absolute inset-0 w-full h-full -rotate-90 pointer-events-none"
          viewBox="0 0 100 100"
        >
          {/* Background track */}
          <circle
            cx="50"
            cy="50"
            r="46"
            fill="none"
            stroke="rgba(0,0,0,0.1)"
            strokeWidth="4"
          />
          {/* Progress arc */}
          <circle
            cx="50"
            cy="50"
            r="46"
            fill="none"
            stroke="currentColor"
            strokeWidth="4"
            strokeLinecap="round"
            strokeDasharray={`${289 * (coloState!.progressToNext!.percentage / 100)} 289`}
            className="text-crayon-orange transition-all duration-500"
          />
        </svg>
      )}

      {/* Tooltip */}
      {showTooltip && showTooltipState && (
        <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 z-10">
          <div className="bg-gray-900 text-white text-xs font-tondo rounded-lg px-3 py-2 whitespace-nowrap shadow-lg">
            <p className="font-bold">{stageInfo.name}</p>
            <p className="text-gray-300 text-[10px]">{stageInfo.description}</p>
            {coloState?.progressToNext && (
              <p className="text-crayon-orange text-[10px] mt-1">
                {coloState.progressToNext.current}/
                {coloState.progressToNext.required} artworks
              </p>
            )}
            {enableTapReactions && (
              <p className="text-crayon-yellow text-[10px] mt-1">Tap me! 🎨</p>
            )}
            {/* Tooltip arrow */}
            <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900" />
          </div>
        </div>
      )}
    </div>
  );
};

export default ColoAvatar;

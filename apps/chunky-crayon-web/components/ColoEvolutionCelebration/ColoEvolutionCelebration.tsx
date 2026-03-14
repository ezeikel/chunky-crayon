'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ColoAvatar } from '@/components/ColoAvatar';
import Confetti from '@/components/Confetti/Confetti';
import type { ColoStage, EvolutionResult } from '@/lib/colo';
import { COLO_STAGES, getAccessory } from '@/lib/colo';

type ColoEvolutionCelebrationProps = {
  /** Evolution result from server action */
  evolutionResult: EvolutionResult | null;
  /** Called when celebration is dismissed */
  onDismiss: () => void;
  /** Auto-dismiss after delay (ms) - 0 to disable */
  autoDismissDelay?: number;
};

// Kid-friendly celebration messages for each stage
const EVOLUTION_MESSAGES: Record<ColoStage, string[]> = {
  1: ['Welcome, little artist!', 'Your coloring journey begins!'],
  2: ['Look! Colo is growing!', "You're doing amazing!"],
  3: ['Wow! Colo is getting bigger!', 'Keep up the great work!'],
  4: ['Colo is so happy!', "You're a coloring superstar!"],
  5: ['Incredible! Artist Colo!', "You're a true artist now!"],
  6: ['AMAZING! Master Colo!', "You've mastered coloring!"],
};

const ColoEvolutionCelebration = ({
  evolutionResult,
  onDismiss,
  autoDismissDelay = 0,
}: ColoEvolutionCelebrationProps) => {
  const [showConfetti, setShowConfetti] = useState(false);
  const [currentAccessoryIndex, setCurrentAccessoryIndex] = useState(0);

  const isVisible =
    evolutionResult !== null &&
    (evolutionResult.evolved || evolutionResult.newAccessories.length > 0);

  const hasEvolved = evolutionResult?.evolved ?? false;
  const newStage = evolutionResult?.newStage ?? 1;
  const previousStage = evolutionResult?.previousStage ?? 1;
  const newAccessories = evolutionResult?.newAccessories ?? [];
  const stageInfo = COLO_STAGES[newStage];

  // Show confetti when celebration appears
  useEffect(() => {
    if (isVisible) {
      setShowConfetti(true);
    }
  }, [isVisible]);

  // Auto-dismiss after delay
  useEffect(() => {
    if (isVisible && autoDismissDelay > 0) {
      const timer = setTimeout(onDismiss, autoDismissDelay);
      return () => clearTimeout(timer);
    }
  }, [isVisible, autoDismissDelay, onDismiss]);

  // Cycle through new accessories
  useEffect(() => {
    if (newAccessories.length > 1) {
      const interval = setInterval(() => {
        setCurrentAccessoryIndex((prev) => (prev + 1) % newAccessories.length);
      }, 2000);
      return () => clearInterval(interval);
    }
  }, [newAccessories.length]);

  // Get random celebration message
  const getMessage = () => {
    const messages = EVOLUTION_MESSAGES[newStage];
    return messages[Math.floor(Math.random() * messages.length)];
  };

  return (
    <>
      {/* Confetti layer */}
      <Confetti
        isActive={showConfetti}
        onComplete={() => setShowConfetti(false)}
        duration={4000}
        pieceCount={100}
      />

      {/* Celebration modal */}
      <AnimatePresence>
        {isVisible && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
            onClick={onDismiss}
          >
            <motion.div
              initial={{ scale: 0.5, opacity: 0, y: 50 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.5, opacity: 0, y: 50 }}
              transition={{ type: 'spring', damping: 15, stiffness: 200 }}
              className="bg-white rounded-3xl shadow-2xl p-8 max-w-sm w-full text-center"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Evolution celebration */}
              {hasEvolved && (
                <>
                  {/* Stage transition animation */}
                  <div className="relative mb-6">
                    {/* Previous stage (fading out) */}
                    <motion.div
                      initial={{ opacity: 1, scale: 1 }}
                      animate={{ opacity: 0, scale: 0.5 }}
                      transition={{ delay: 0.5, duration: 0.5 }}
                      className="absolute inset-0 flex justify-center"
                    >
                      <ColoAvatar stage={previousStage} size="xl" />
                    </motion.div>

                    {/* New stage (growing in) */}
                    <motion.div
                      initial={{ opacity: 0, scale: 0 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.8, type: 'spring', damping: 10 }}
                      className="flex justify-center"
                    >
                      <ColoAvatar stage={newStage} size="xl" />
                    </motion.div>

                    {/* Sparkle effects */}
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: [0, 1, 0] }}
                      transition={{ delay: 0.7, duration: 1.5, repeat: 2 }}
                      className="absolute inset-0 flex items-center justify-center text-4xl"
                    >
                      <span className="absolute -top-4 left-1/4">✨</span>
                      <span className="absolute -top-2 right-1/4">🌟</span>
                      <span className="absolute -bottom-4 left-1/3">⭐</span>
                      <span className="absolute -bottom-2 right-1/3">✨</span>
                    </motion.div>
                  </div>

                  {/* Celebration text */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 1.2 }}
                  >
                    <h2 className="font-tondo font-bold text-2xl text-gradient-orange mb-2">
                      Colo Evolved!
                    </h2>
                    <p className="font-tondo text-lg text-text-primary mb-1">
                      {stageInfo.name}
                    </p>
                    <p className="font-tondo text-sm text-text-muted mb-4">
                      {getMessage()}
                    </p>
                  </motion.div>
                </>
              )}

              {/* Accessory unlocks (after evolution or standalone) */}
              {newAccessories.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: hasEvolved ? 2 : 0.5 }}
                  className={hasEvolved ? 'pt-4 border-t border-gray-100' : ''}
                >
                  <h3 className="font-tondo font-bold text-lg text-text-primary mb-3">
                    {newAccessories.length === 1
                      ? 'New Accessory Unlocked!'
                      : 'New Accessories Unlocked!'}
                  </h3>

                  {/* Accessory display */}
                  <AnimatePresence mode="wait">
                    {newAccessories.map((accessoryId, index) => {
                      if (
                        index !== currentAccessoryIndex &&
                        newAccessories.length > 1
                      )
                        return null;
                      const accessory = getAccessory(accessoryId);
                      if (!accessory) return null;

                      return (
                        <motion.div
                          key={accessoryId}
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.8 }}
                          className="flex flex-col items-center gap-2"
                        >
                          {/* Accessory icon placeholder */}
                          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-crayon-orange-light to-crayon-orange flex items-center justify-center text-2xl">
                            {/* Map accessory to emoji for placeholder */}
                            {accessoryId.includes('helmet') && '🪖'}
                            {accessoryId.includes('crown') && '👑'}
                            {accessoryId.includes('scarf') && '🧣'}
                            {accessoryId.includes('hat') && '🎩'}
                            {accessoryId.includes('beret') && '🎨'}
                            {accessoryId.includes('cape') && '🦸'}
                            {accessoryId.includes('glasses') && '✨'}
                            {accessoryId.includes('spikes') && '🦖'}
                            {accessoryId.includes('flower') && '🌸'}
                          </div>
                          <p className="font-tondo font-medium text-text-primary">
                            {accessory.name}
                          </p>
                          <p className="font-tondo text-xs text-text-muted">
                            {accessory.description}
                          </p>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>

                  {/* Pagination dots for multiple accessories */}
                  {newAccessories.length > 1 && (
                    <div className="flex justify-center gap-2 mt-4">
                      {newAccessories.map((_, index) => (
                        <button
                          key={index}
                          type="button"
                          className={`w-2 h-2 rounded-full transition-colors ${
                            index === currentAccessoryIndex
                              ? 'bg-crayon-orange'
                              : 'bg-gray-300'
                          }`}
                          onClick={() => setCurrentAccessoryIndex(index)}
                          aria-label={`Show accessory ${index + 1}`}
                        />
                      ))}
                    </div>
                  )}
                </motion.div>
              )}

              {/* Dismiss button */}
              <motion.button
                type="button"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: hasEvolved ? 2.5 : 1 }}
                className="mt-6 px-8 py-3 bg-gradient-to-r from-crayon-orange to-crayon-orange-light text-white font-tondo font-bold text-lg rounded-full shadow-lg hover:shadow-xl transition-shadow"
                onClick={onDismiss}
              >
                Awesome! 🎉
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default ColoEvolutionCelebration;

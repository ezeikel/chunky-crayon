'use client';

import { useEffect, useCallback, useRef } from 'react';
import { getSoundManager, SoundType } from '@/lib/audio';
import { useColoringContext } from '@/contexts/coloring';

/**
 * Hook for playing sounds in the coloring experience
 *
 * Usage:
 * const { playSound, initSounds } = useSound();
 *
 * // Initialize on first user interaction
 * <button onClick={() => { initSounds(); doSomething(); }}>
 *
 * // Play sounds
 * playSound('tap');
 * playSound('sparkle');
 */
export const useSound = () => {
  const { isMuted, setIsMuted } = useColoringContext();
  const isInitializedRef = useRef(false);

  // Sync mute state with sound manager
  useEffect(() => {
    const soundManager = getSoundManager();
    soundManager.setMuted(isMuted);
  }, [isMuted]);

  // Initialize sound manager on first call
  const initSounds = useCallback(async () => {
    if (isInitializedRef.current) return;

    const soundManager = getSoundManager();
    await soundManager.init();
    isInitializedRef.current = true;
  }, []);

  // Play a sound
  const playSound = useCallback((soundType: SoundType) => {
    const soundManager = getSoundManager();
    soundManager.play(soundType);
  }, []);

  // Stop a specific sound
  const stopSound = useCallback((soundType: SoundType) => {
    const soundManager = getSoundManager();
    soundManager.stop(soundType);
  }, []);

  // Stop all sounds
  const stopAllSounds = useCallback(() => {
    const soundManager = getSoundManager();
    soundManager.stopAll();
  }, []);

  // Toggle mute
  const toggleMute = useCallback(() => {
    setIsMuted((prev) => !prev);
  }, [setIsMuted]);

  return {
    playSound,
    stopSound,
    stopAllSounds,
    initSounds,
    isMuted,
    toggleMute,
  };
};

export default useSound;

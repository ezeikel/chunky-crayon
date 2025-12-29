'use client';

import { useEffect, useCallback, useRef } from 'react';
import { getSoundManager, SoundType } from '@/lib/audio';
import { useColoringContext } from '@/contexts/coloring';

/**
 * Hook for playing sounds in the coloring experience
 *
 * Usage:
 * const { playSound, initSounds, loadAmbient, playAmbient } = useSound();
 *
 * // Initialize on first user interaction
 * <button onClick={() => { initSounds(); doSomething(); }}>
 *
 * // Play sounds
 * playSound('tap');
 * playSound('sparkle');
 *
 * // Ambient sound (for coloring experience)
 * await loadAmbient('https://...ambient.mp3');
 * playAmbient(); // Loops in background
 * stopAmbient(); // Fades out
 */
export const useSound = () => {
  const { isMuted, setIsMuted } = useColoringContext();
  const isInitializedRef = useRef(false);

  // Sync mute state with sound manager
  useEffect(() => {
    console.log('[useSound] Syncing mute state:', { isMuted });
    const soundManager = getSoundManager();
    soundManager.setMuted(isMuted);
  }, [isMuted]);

  // Initialize sound manager on first call
  const initSounds = useCallback(async () => {
    console.log('[useSound] initSounds called', {
      isInitialized: isInitializedRef.current,
    });
    if (isInitializedRef.current) return;

    const soundManager = getSoundManager();
    await soundManager.init();
    isInitializedRef.current = true;
    console.log('[useSound] initSounds complete');
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

  // Load ambient sound from URL
  const loadAmbient = useCallback(async (url: string) => {
    console.log('[useSound] loadAmbient called', { url });
    const soundManager = getSoundManager();
    await soundManager.loadAmbient(url);
    console.log('[useSound] loadAmbient complete');
  }, []);

  // Play ambient sound (loops)
  const playAmbient = useCallback(() => {
    console.log('[useSound] playAmbient called');
    const soundManager = getSoundManager();
    soundManager.playAmbient();
  }, []);

  // Stop ambient sound (fades out)
  const stopAmbient = useCallback(() => {
    const soundManager = getSoundManager();
    soundManager.stopAmbient();
  }, []);

  // Check if ambient is playing
  const isAmbientPlaying = useCallback(() => {
    const soundManager = getSoundManager();
    return soundManager.getAmbientPlaying();
  }, []);

  // Set ambient volume
  const setAmbientVolume = useCallback((volume: number) => {
    const soundManager = getSoundManager();
    soundManager.setAmbientVolume(volume);
  }, []);

  return {
    // Sound effects
    playSound,
    stopSound,
    stopAllSounds,
    initSounds,
    // Mute control
    isMuted,
    toggleMute,
    // Ambient sound
    loadAmbient,
    playAmbient,
    stopAmbient,
    isAmbientPlaying,
    setAmbientVolume,
  };
};

export default useSound;

"use client";

import { useEffect, useCallback, useRef } from "react";
import { getSoundManager, SoundType, BrushSoundType } from "@/lib/audio";
import { useColoringContext } from "@/contexts/coloring";

/**
 * Hook for playing sounds in the coloring experience
 */
export const useSound = () => {
  const {
    isMuted,
    setIsMuted,
    isSfxMuted,
    setIsSfxMuted,
    isAmbientMuted,
    setIsAmbientMuted,
  } = useColoringContext();
  const isInitializedRef = useRef(false);

  // Sync master mute state with sound manager
  useEffect(() => {
    const soundManager = getSoundManager();
    soundManager.setMuted(isMuted);
  }, [isMuted]);

  // Sync SFX mute state with sound manager
  useEffect(() => {
    const soundManager = getSoundManager();
    soundManager.setSfxMuted(isSfxMuted);
  }, [isSfxMuted]);

  // Sync ambient mute state with sound manager
  useEffect(() => {
    const soundManager = getSoundManager();
    soundManager.setAmbientMuted(isAmbientMuted);
  }, [isAmbientMuted]);

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

  // Start continuous brush sound (loops while drawing)
  const startBrushLoop = useCallback((brushType: BrushSoundType) => {
    const soundManager = getSoundManager();
    soundManager.startBrushLoop(brushType);
  }, []);

  // Stop brush sound with fade out
  const stopBrushLoop = useCallback(() => {
    const soundManager = getSoundManager();
    soundManager.stopBrushLoop();
  }, []);

  // Check if brush loop is active
  const isBrushLoopActive = useCallback(() => {
    const soundManager = getSoundManager();
    return soundManager.isBrushLoopActive();
  }, []);

  // Toggle master mute
  const toggleMute = useCallback(() => {
    setIsMuted((prev) => !prev);
  }, [setIsMuted]);

  // Toggle SFX mute
  const toggleSfxMute = useCallback(() => {
    setIsSfxMuted((prev) => !prev);
  }, [setIsSfxMuted]);

  // Toggle ambient mute
  const toggleAmbientMute = useCallback(() => {
    setIsAmbientMuted((prev) => !prev);
  }, [setIsAmbientMuted]);

  // Load ambient sound from URL
  const loadAmbient = useCallback(async (url: string) => {
    const soundManager = getSoundManager();
    await soundManager.loadAmbient(url);
  }, []);

  // Play ambient sound (loops)
  const playAmbient = useCallback(() => {
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
    // Brush loop (continuous drawing sound)
    startBrushLoop,
    stopBrushLoop,
    isBrushLoopActive,
    // Master mute control
    isMuted,
    toggleMute,
    // SFX mute control (brush sounds, UI sounds)
    isSfxMuted,
    toggleSfxMute,
    // Ambient mute control
    isAmbientMuted,
    toggleAmbientMute,
    // Ambient sound
    loadAmbient,
    playAmbient,
    stopAmbient,
    isAmbientPlaying,
    setAmbientVolume,
  };
};

export default useSound;

/**
 * Sound effects utility for kid-friendly audio feedback
 * Uses expo-audio for playback
 */

import { createAudioPlayer, setAudioModeAsync } from "expo-audio";
import type { AudioPlayer } from "expo-audio";

// Sound effect types
type SoundEffect =
  | "pop"
  | "swoosh"
  | "sparkle"
  | "splash"
  | "click"
  | "success"
  | "undo";

// Cache for audio players
const playerCache: Map<string, AudioPlayer> = new Map();

// Sound URLs - these would be replaced with bundled assets in production
// For now, we'll use a silent approach and add actual sound files later
const SOUND_URLS: Record<SoundEffect, string | null> = {
  pop: null, // Will be replaced with bundled asset
  swoosh: null,
  sparkle: null,
  splash: null,
  click: null,
  success: null,
  undo: null,
};

// Flag to track if audio is initialized
let isAudioInitialized = false;

/**
 * Initialize audio settings for the app
 */
export const initAudio = async (): Promise<void> => {
  if (isAudioInitialized) return;

  try {
    await setAudioModeAsync({
      playsInSilentMode: false,
      shouldPlayInBackground: false,
    });
    isAudioInitialized = true;
  } catch (error) {
    console.warn("Failed to initialize audio:", error);
  }
};

/**
 * Play a sound effect
 * Falls back silently if sound cannot be played
 */
export const playSound = async (effect: SoundEffect): Promise<void> => {
  try {
    const url = SOUND_URLS[effect];
    if (!url) {
      // Sound not configured - fail silently
      return;
    }

    // Check cache first
    let player = playerCache.get(effect);

    if (!player) {
      // Create a new player for this sound
      player = createAudioPlayer(url);
      playerCache.set(effect, player);
    }

    // Play from beginning
    player.seekTo(0);
    player.play();
  } catch (error) {
    // Fail silently - sounds are nice-to-have
    console.warn(`Failed to play sound ${effect}:`, error);
  }
};

/**
 * Clean up all cached audio players
 * Call this when unmounting the main app component
 */
export const cleanupSounds = (): void => {
  for (const player of playerCache.values()) {
    try {
      player.remove();
    } catch {
      // Ignore cleanup errors
    }
  }
  playerCache.clear();
  isAudioInitialized = false;
};

// Convenience functions for common sound effects
export const playPop = () => playSound("pop");
export const playSwoosh = () => playSound("swoosh");
export const playSparkle = () => playSound("sparkle");
export const playSplash = () => playSound("splash");
export const playClick = () => playSound("click");
export const playSuccess = () => playSound("success");
export const playUndo = () => playSound("undo");

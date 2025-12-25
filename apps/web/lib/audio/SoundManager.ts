/**
 * SoundManager - Audio playback for kid-friendly UI sounds
 *
 * Handles preloading, playing, and managing audio for the coloring experience.
 * Uses the Web Audio API for low-latency playback.
 */

export type SoundType =
  | 'tap' // Button tap/click
  | 'pop' // Satisfying pop for selections
  | 'draw' // Crayon drawing sound
  | 'fill' // Fill bucket splash
  | 'undo' // Undo action
  | 'redo' // Redo action
  | 'save' // Save to gallery
  | 'sparkle' // Celebration/success
  | 'error'; // Error feedback

type SoundConfig = {
  src: string;
  volume: number;
  maxConcurrent?: number;
};

// Sound file configurations
// Note: Audio files should be placed in /public/audio/
const SOUND_CONFIG: Record<SoundType, SoundConfig> = {
  tap: { src: '/audio/tap.mp3', volume: 0.4 },
  pop: { src: '/audio/pop.mp3', volume: 0.5 },
  draw: { src: '/audio/draw.mp3', volume: 0.3, maxConcurrent: 1 },
  fill: { src: '/audio/fill.mp3', volume: 0.5 },
  undo: { src: '/audio/undo.mp3', volume: 0.4 },
  redo: { src: '/audio/redo.mp3', volume: 0.4 },
  save: { src: '/audio/save.mp3', volume: 0.6 },
  sparkle: { src: '/audio/sparkle.mp3', volume: 0.7 },
  error: { src: '/audio/error.mp3', volume: 0.4 },
};

class SoundManager {
  private audioContext: AudioContext | null = null;
  private audioBuffers: Map<SoundType, AudioBuffer> = new Map();
  private activeSources: Map<SoundType, AudioBufferSourceNode[]> = new Map();
  private isMuted: boolean = false;
  private isInitialized: boolean = false;
  private masterVolume: number = 1.0;

  constructor() {
    // Initialize on first user interaction
    if (typeof window !== 'undefined') {
      this.loadMutePreference();
    }
  }

  /**
   * Initialize the audio context and preload sounds
   * Must be called after a user interaction (click/touch)
   */
  async init(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Create AudioContext
      this.audioContext = new (window.AudioContext ||
        (window as typeof window & { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext)();

      // Resume context if suspended (required for iOS)
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }

      // Preload all sounds
      await this.preloadSounds();

      this.isInitialized = true;
    } catch (error) {
      console.warn('SoundManager: Failed to initialize audio context', error);
    }
  }

  /**
   * Preload all sound files
   */
  private async preloadSounds(): Promise<void> {
    if (!this.audioContext) return;

    const loadPromises = Object.entries(SOUND_CONFIG).map(
      async ([soundType, config]) => {
        try {
          const response = await fetch(config.src);
          if (!response.ok) {
            console.warn(`SoundManager: Sound file not found: ${config.src}`);
            return;
          }

          const arrayBuffer = await response.arrayBuffer();
          const audioBuffer =
            await this.audioContext!.decodeAudioData(arrayBuffer);
          this.audioBuffers.set(soundType as SoundType, audioBuffer);
        } catch (error) {
          console.warn(
            `SoundManager: Failed to load sound "${soundType}"`,
            error,
          );
        }
      },
    );

    await Promise.allSettled(loadPromises);
  }

  /**
   * Play a sound effect
   */
  play(soundType: SoundType): void {
    if (this.isMuted || !this.audioContext || !this.isInitialized) return;

    const buffer = this.audioBuffers.get(soundType);
    if (!buffer) return;

    const config = SOUND_CONFIG[soundType];

    // Check max concurrent sounds
    if (config.maxConcurrent) {
      const activeSources = this.activeSources.get(soundType) || [];
      if (activeSources.length >= config.maxConcurrent) {
        return; // Don't play if max concurrent reached
      }
    }

    try {
      // Create source and gain nodes
      const source = this.audioContext.createBufferSource();
      const gainNode = this.audioContext.createGain();

      source.buffer = buffer;
      gainNode.gain.value = config.volume * this.masterVolume;

      // Connect: source -> gain -> destination
      source.connect(gainNode);
      gainNode.connect(this.audioContext.destination);

      // Track active sources
      const activeSources = this.activeSources.get(soundType) || [];
      activeSources.push(source);
      this.activeSources.set(soundType, activeSources);

      // Clean up when done
      source.onended = () => {
        const sources = this.activeSources.get(soundType);
        if (sources) {
          const index = sources.indexOf(source);
          if (index > -1) {
            sources.splice(index, 1);
          }
        }
      };

      // Play immediately
      source.start(0);
    } catch (error) {
      console.warn(`SoundManager: Failed to play sound "${soundType}"`, error);
    }
  }

  /**
   * Stop all instances of a sound
   */
  stop(soundType: SoundType): void {
    const sources = this.activeSources.get(soundType);
    if (sources) {
      sources.forEach((source) => {
        try {
          source.stop();
        } catch {
          // Ignore errors from already stopped sources
        }
      });
      this.activeSources.set(soundType, []);
    }
  }

  /**
   * Stop all playing sounds
   */
  stopAll(): void {
    this.activeSources.forEach((sources, soundType) => {
      this.stop(soundType);
    });
  }

  /**
   * Set mute state
   */
  setMuted(muted: boolean): void {
    this.isMuted = muted;
    this.saveMutePreference();

    if (muted) {
      this.stopAll();
    }
  }

  /**
   * Get mute state
   */
  getMuted(): boolean {
    return this.isMuted;
  }

  /**
   * Toggle mute state
   */
  toggleMute(): boolean {
    this.setMuted(!this.isMuted);
    return this.isMuted;
  }

  /**
   * Set master volume (0.0 to 1.0)
   */
  setVolume(volume: number): void {
    this.masterVolume = Math.max(0, Math.min(1, volume));
  }

  /**
   * Load mute preference from localStorage
   */
  private loadMutePreference(): void {
    try {
      const saved = localStorage.getItem('chunky-crayon-muted');
      if (saved !== null) {
        this.isMuted = saved === 'true';
      }
    } catch {
      // localStorage might not be available
    }
  }

  /**
   * Save mute preference to localStorage
   */
  private saveMutePreference(): void {
    try {
      localStorage.setItem('chunky-crayon-muted', String(this.isMuted));
    } catch {
      // localStorage might not be available
    }
  }

  /**
   * Cleanup resources
   */
  dispose(): void {
    this.stopAll();
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
    this.audioBuffers.clear();
    this.activeSources.clear();
    this.isInitialized = false;
  }
}

// Singleton instance
let soundManagerInstance: SoundManager | null = null;

/**
 * Get the singleton SoundManager instance
 */
export const getSoundManager = (): SoundManager => {
  if (!soundManagerInstance) {
    soundManagerInstance = new SoundManager();
  }
  return soundManagerInstance;
};

export default SoundManager;

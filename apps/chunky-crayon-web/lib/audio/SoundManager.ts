/**
 * SoundManager - Audio playback for kid-friendly UI sounds
 *
 * Handles preloading, playing, and managing audio for the coloring experience.
 * Uses the Web Audio API for low-latency playback.
 */

export type SoundType =
  | 'tap' // Button tap/click
  | 'pop' // Satisfying pop for selections
  | 'draw' // Crayon drawing sound (legacy, used as fallback)
  | 'fill' // Fill bucket splash
  | 'undo' // Undo action
  | 'redo' // Redo action
  | 'save' // Save to gallery
  | 'sparkle' // Celebration/success
  | 'error'; // Error feedback

/**
 * Brush-specific sound types for continuous drawing feedback.
 * Each brush type can have its own unique looping sound.
 * See BRUSH_SOUNDS.md for ElevenLabs prompts to generate these sounds.
 */
export type BrushSoundType =
  | 'crayon' // Waxy, textured scratching sound
  | 'marker' // Smooth, squeaky felt-tip sound
  | 'eraser' // Soft rubbery erasing sound
  | 'glitter' // Sparkly, shimmery tinkling sound
  | 'sparkle' // Magical twinkling sound
  | 'rainbow' // Dreamy, whooshing colorful sound
  | 'glow' // Warm, humming radiant sound
  | 'neon' // Electric, buzzing vibrant sound
  | 'magic-reveal'; // Mystical unveiling sound

type SoundConfig = {
  src: string;
  volume: number;
  maxConcurrent?: number;
};

type BrushSoundConfig = {
  src: string;
  volume: number;
  // TODO: Add per-brush sound files. For now, all fallback to 'draw.mp3'
  // Once you generate sounds via ElevenLabs, update the src paths here.
  // See BRUSH_SOUNDS.md for generation prompts.
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

/**
 * Brush-specific looping sound configurations.
 * These sounds play continuously while drawing and stop when the stroke ends.
 *
 * TODO: Generate unique sounds for each brush type using ElevenLabs.
 * Currently all use 'draw.mp3' as fallback. See BRUSH_SOUNDS.md for prompts.
 */
const BRUSH_SOUND_CONFIG: Record<BrushSoundType, BrushSoundConfig> = {
  // Traditional drawing tools
  crayon: { src: '/audio/brush/crayon.mp3', volume: 0.25 },
  marker: { src: '/audio/brush/marker.mp3', volume: 0.25 },
  eraser: { src: '/audio/brush/eraser.mp3', volume: 0.2 },

  // Special effect brushes
  glitter: { src: '/audio/brush/glitter.mp3', volume: 0.3 },
  sparkle: { src: '/audio/brush/sparkle.mp3', volume: 0.3 },
  rainbow: { src: '/audio/brush/rainbow.mp3', volume: 0.25 },
  glow: { src: '/audio/brush/glow.mp3', volume: 0.25 },
  neon: { src: '/audio/brush/neon.mp3', volume: 0.3 },

  // Magic tools
  'magic-reveal': { src: '/audio/brush/magic-reveal.mp3', volume: 0.35 },
};

// Fallback sound when brush-specific sound is not available
const FALLBACK_BRUSH_SOUND = '/audio/draw.mp3';
const FALLBACK_BRUSH_VOLUME = 0.25;

class SoundManager {
  private audioContext: AudioContext | null = null;
  private audioBuffers: Map<SoundType, AudioBuffer> = new Map();
  private activeSources: Map<SoundType, AudioBufferSourceNode[]> = new Map();
  private isMuted: boolean = false;
  private isSfxMuted: boolean = false;
  private isAmbientMuted: boolean = false;
  private isInitialized: boolean = false;
  private masterVolume: number = 1.0;

  // Ambient sound state
  private ambientSource: AudioBufferSourceNode | null = null;
  private ambientGainNode: GainNode | null = null;
  private ambientBuffer: AudioBuffer | null = null;
  private ambientUrl: string | null = null;
  private isAmbientPlaying: boolean = false;
  private ambientVolume: number = 0.3; // Lower volume for background ambient

  // Brush loop sound state (for continuous drawing feedback)
  private brushLoopSource: AudioBufferSourceNode | null = null;
  private brushLoopGainNode: GainNode | null = null;
  private brushLoopBuffers: Map<BrushSoundType, AudioBuffer> = new Map();
  private fallbackBrushBuffer: AudioBuffer | null = null;
  private isBrushLoopPlaying: boolean = false;
  private currentBrushType: BrushSoundType | null = null;

  // Fade timing for responsiveness (in seconds)
  private static readonly BRUSH_FADE_IN = 0.08; // 80ms fade in
  private static readonly BRUSH_FADE_OUT = 0.12; // 120ms fade out

  constructor() {
    console.log('[SoundManager] Constructor called');
    // Initialize on first user interaction
    if (typeof window !== 'undefined') {
      this.loadMutePreference();
      console.log('[SoundManager] After loadMutePreference:', {
        isMuted: this.isMuted,
      });
    }
  }

  /**
   * Initialize the audio context and preload sounds
   * Must be called after a user interaction (click/touch)
   */
  async init(): Promise<void> {
    console.log('[SoundManager] init called', {
      isInitialized: this.isInitialized,
    });
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

      // Preload all sounds (UI sounds and brush loop sounds)
      await Promise.all([this.preloadSounds(), this.preloadBrushSounds()]);

      this.isInitialized = true;
      console.log('[SoundManager] init complete');
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
   * Preload brush-specific looping sounds
   * Falls back to the generic 'draw' sound if specific brush sounds don't exist
   */
  private async preloadBrushSounds(): Promise<void> {
    if (!this.audioContext) {
      console.log('[SoundManager] preloadBrushSounds: no audioContext');
      return;
    }

    console.log(
      '[SoundManager] preloadBrushSounds: loading fallback from',
      FALLBACK_BRUSH_SOUND,
    );

    // First, load the fallback sound
    try {
      const fallbackResponse = await fetch(FALLBACK_BRUSH_SOUND);
      console.log('[SoundManager] preloadBrushSounds: fallback response', {
        ok: fallbackResponse.ok,
        status: fallbackResponse.status,
      });
      if (fallbackResponse.ok) {
        const arrayBuffer = await fallbackResponse.arrayBuffer();
        this.fallbackBrushBuffer =
          await this.audioContext.decodeAudioData(arrayBuffer);
        console.log(
          '[SoundManager] preloadBrushSounds: fallback loaded successfully',
        );
      } else {
        console.warn('[SoundManager] preloadBrushSounds: fallback not found!');
      }
    } catch (error) {
      console.warn('SoundManager: Failed to load fallback brush sound', error);
    }

    // Then try to load each brush-specific sound (silently, these are optional)
    const loadPromises = Object.entries(BRUSH_SOUND_CONFIG).map(
      async ([brushType, config]) => {
        try {
          const response = await fetch(config.src);
          if (!response.ok) {
            // This is expected until brush sounds are generated
            // Will fall back to the default 'draw' sound
            return;
          }

          const arrayBuffer = await response.arrayBuffer();
          const audioBuffer =
            await this.audioContext!.decodeAudioData(arrayBuffer);
          this.brushLoopBuffers.set(brushType as BrushSoundType, audioBuffer);
          console.log(`[SoundManager] preloadBrushSounds: loaded ${brushType}`);
        } catch {
          // Silently fail - will use fallback sound
          // This is expected until per-brush sounds are generated
        }
      },
    );

    await Promise.allSettled(loadPromises);
    console.log('[SoundManager] preloadBrushSounds: complete', {
      hasFallback: !!this.fallbackBrushBuffer,
      loadedBrushTypes: Array.from(this.brushLoopBuffers.keys()),
    });
  }

  /**
   * Play a sound effect
   */
  play(soundType: SoundType): void {
    if (
      this.isMuted ||
      this.isSfxMuted ||
      !this.audioContext ||
      !this.isInitialized
    )
      return;

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
   * Start a looping brush sound for continuous drawing feedback.
   * Uses brush-specific sounds if available, falls back to generic 'draw' sound.
   * Quick fade-in for responsive feel.
   *
   * @param brushType - The type of brush being used
   */
  startBrushLoop(brushType: BrushSoundType): void {
    console.log('[SoundManager] startBrushLoop called', {
      brushType,
      isMuted: this.isMuted,
      isSfxMuted: this.isSfxMuted,
      hasAudioContext: !!this.audioContext,
      isInitialized: this.isInitialized,
      isBrushLoopPlaying: this.isBrushLoopPlaying,
      currentBrushType: this.currentBrushType,
      hasFallbackBuffer: !!this.fallbackBrushBuffer,
      hasBrushBuffer: this.brushLoopBuffers.has(brushType),
    });

    if (
      this.isMuted ||
      this.isSfxMuted ||
      !this.audioContext ||
      !this.isInitialized
    ) {
      console.log(
        '[SoundManager] startBrushLoop: early return (muted or not initialized)',
      );
      return;
    }

    // If already playing the same brush type, don't restart
    if (this.isBrushLoopPlaying && this.currentBrushType === brushType) {
      console.log(
        '[SoundManager] startBrushLoop: already playing same brush type',
      );
      return;
    }

    // If a different brush is playing, stop it first (instant stop for responsiveness)
    if (this.isBrushLoopPlaying) {
      console.log(
        '[SoundManager] startBrushLoop: stopping previous brush loop',
      );
      this.stopBrushLoopImmediate();
    }

    // Get the buffer for this brush type, or fall back to default
    // Try: specific brush -> fallback brush -> regular 'draw' sound
    const buffer =
      this.brushLoopBuffers.get(brushType) ||
      this.fallbackBrushBuffer ||
      this.audioBuffers.get('draw'); // Ultimate fallback to regular draw sound
    console.log('[SoundManager] startBrushLoop: buffer selection', {
      usingSpecific: this.brushLoopBuffers.has(brushType),
      usingFallback:
        !this.brushLoopBuffers.has(brushType) && !!this.fallbackBrushBuffer,
      usingDrawFallback:
        !this.brushLoopBuffers.has(brushType) &&
        !this.fallbackBrushBuffer &&
        !!this.audioBuffers.get('draw'),
      hasBuffer: !!buffer,
    });
    if (!buffer) {
      console.warn(
        `SoundManager: No brush sound available for "${brushType}" - no fallbacks available either`,
      );
      return;
    }

    // Get volume from config, or use fallback
    const config = BRUSH_SOUND_CONFIG[brushType];
    const volume = config ? config.volume : FALLBACK_BRUSH_VOLUME;

    try {
      // Create source node
      this.brushLoopSource = this.audioContext.createBufferSource();
      this.brushLoopSource.buffer = buffer;
      this.brushLoopSource.loop = true;

      // Create gain node for volume control and fades
      this.brushLoopGainNode = this.audioContext.createGain();
      this.brushLoopGainNode.gain.value = 0; // Start silent

      // Connect: source -> gain -> destination
      this.brushLoopSource.connect(this.brushLoopGainNode);
      this.brushLoopGainNode.connect(this.audioContext.destination);

      // Start playing
      this.brushLoopSource.start(0);
      this.isBrushLoopPlaying = true;
      this.currentBrushType = brushType;
      console.log('[SoundManager] startBrushLoop: started playing', {
        brushType,
        volume,
      });

      // Quick fade in for responsiveness
      this.brushLoopGainNode.gain.linearRampToValueAtTime(
        volume * this.masterVolume,
        this.audioContext.currentTime + SoundManager.BRUSH_FADE_IN,
      );

      // Handle when source ends (shouldn't happen with loop, but safety)
      this.brushLoopSource.onended = () => {
        this.isBrushLoopPlaying = false;
        this.brushLoopSource = null;
        this.brushLoopGainNode = null;
        this.currentBrushType = null;
      };
    } catch (error) {
      console.warn('SoundManager: Failed to start brush loop', error);
      this.isBrushLoopPlaying = false;
      this.currentBrushType = null;
    }
  }

  /**
   * Stop the brush loop sound with a quick fade out.
   * Use this when the user lifts their finger/mouse.
   */
  stopBrushLoop(): void {
    console.log('[SoundManager] stopBrushLoop called', {
      hasBrushLoopSource: !!this.brushLoopSource,
      hasBrushLoopGainNode: !!this.brushLoopGainNode,
      hasAudioContext: !!this.audioContext,
      isBrushLoopPlaying: this.isBrushLoopPlaying,
    });

    if (
      !this.brushLoopSource ||
      !this.brushLoopGainNode ||
      !this.audioContext
    ) {
      this.isBrushLoopPlaying = false;
      this.currentBrushType = null;
      return;
    }

    try {
      // Capture references before clearing - we need to stop THIS specific source
      const sourceToStop = this.brushLoopSource;
      const gainNode = this.brushLoopGainNode;

      // Clear state FIRST to prevent race conditions with rapid start/stop
      // This ensures a new startBrushLoop can create fresh nodes
      this.isBrushLoopPlaying = false;
      this.brushLoopSource = null;
      this.brushLoopGainNode = null;
      this.currentBrushType = null;

      // Remove onended handler to prevent it from clobbering new source state
      sourceToStop.onended = null;

      // Quick fade out for responsiveness
      gainNode.gain.linearRampToValueAtTime(
        0,
        this.audioContext.currentTime + SoundManager.BRUSH_FADE_OUT,
      );

      // Stop the source after fade out
      const fadeOutMs = SoundManager.BRUSH_FADE_OUT * 1000;
      setTimeout(() => {
        try {
          sourceToStop.stop();
        } catch {
          // Ignore errors from already stopped sources
        }
      }, fadeOutMs);

      console.log('[SoundManager] stopBrushLoop: fade scheduled');
    } catch (error) {
      console.warn('SoundManager: Failed to stop brush loop', error);
      this.isBrushLoopPlaying = false;
      this.currentBrushType = null;
    }
  }

  /**
   * Immediately stop the brush loop without fade (for instant brush switching)
   */
  private stopBrushLoopImmediate(): void {
    if (this.brushLoopSource) {
      try {
        this.brushLoopSource.stop();
      } catch {
        // Ignore errors from already stopped sources
      }
    }
    this.isBrushLoopPlaying = false;
    this.brushLoopSource = null;
    this.brushLoopGainNode = null;
    this.currentBrushType = null;
  }

  /**
   * Check if brush loop is currently playing
   */
  isBrushLoopActive(): boolean {
    return this.isBrushLoopPlaying;
  }

  /**
   * Set mute state
   */
  setMuted(muted: boolean): void {
    console.log('[SoundManager] setMuted called', {
      muted,
      wasMuted: this.isMuted,
    });
    const wasMuted = this.isMuted;
    this.isMuted = muted;
    this.saveMutePreference();

    if (muted) {
      this.stopAll();
      this.stopBrushLoop();
      this.stopAmbient();
    } else if (wasMuted && this.ambientBuffer) {
      // Resume ambient if it was loaded when muting
      this.playAmbient();
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
   * Set SFX mute state (brush sounds, UI sounds, etc.)
   */
  setSfxMuted(muted: boolean): void {
    console.log('[SoundManager] setSfxMuted called', {
      muted,
      wasMuted: this.isSfxMuted,
    });
    this.isSfxMuted = muted;
    this.saveMutePreference();

    if (muted) {
      this.stopAll();
      this.stopBrushLoop();
    }
  }

  /**
   * Get SFX mute state
   */
  getSfxMuted(): boolean {
    return this.isSfxMuted;
  }

  /**
   * Set ambient sound mute state
   */
  setAmbientMuted(muted: boolean): void {
    console.log('[SoundManager] setAmbientMuted called', {
      muted,
      wasMuted: this.isAmbientMuted,
    });
    const wasMuted = this.isAmbientMuted;
    this.isAmbientMuted = muted;
    this.saveMutePreference();

    if (muted) {
      this.stopAmbient();
    } else if (wasMuted && this.ambientBuffer && !this.isMuted) {
      // Resume ambient if it was loaded when unmuting
      this.playAmbient();
    }
  }

  /**
   * Get ambient mute state
   */
  getAmbientMuted(): boolean {
    return this.isAmbientMuted;
  }

  /**
   * Set master volume (0.0 to 1.0)
   */
  setVolume(volume: number): void {
    this.masterVolume = Math.max(0, Math.min(1, volume));
  }

  /**
   * Load mute preferences from localStorage
   */
  private loadMutePreference(): void {
    try {
      const savedMuted = localStorage.getItem('chunky-crayon-muted');
      if (savedMuted !== null) {
        this.isMuted = savedMuted === 'true';
      }

      const savedSfxMuted = localStorage.getItem('chunky-crayon-sfx-muted');
      if (savedSfxMuted !== null) {
        this.isSfxMuted = savedSfxMuted === 'true';
      }

      const savedAmbientMuted = localStorage.getItem(
        'chunky-crayon-ambient-muted',
      );
      if (savedAmbientMuted !== null) {
        this.isAmbientMuted = savedAmbientMuted === 'true';
      }
    } catch {
      // localStorage might not be available
    }
  }

  /**
   * Save mute preferences to localStorage
   */
  private saveMutePreference(): void {
    try {
      localStorage.setItem('chunky-crayon-muted', String(this.isMuted));
      localStorage.setItem('chunky-crayon-sfx-muted', String(this.isSfxMuted));
      localStorage.setItem(
        'chunky-crayon-ambient-muted',
        String(this.isAmbientMuted),
      );
    } catch {
      // localStorage might not be available
    }
  }

  /**
   * Load an ambient sound from a URL
   * Does not start playing automatically
   */
  async loadAmbient(url: string): Promise<void> {
    console.log('[SoundManager] loadAmbient called', {
      url,
      isInitialized: this.isInitialized,
      hasAudioContext: !!this.audioContext,
    });

    if (!this.audioContext || !this.isInitialized) {
      console.warn(
        '[SoundManager] loadAmbient: not initialized, returning early',
      );
      return;
    }

    // Skip if already loaded
    if (this.ambientUrl === url && this.ambientBuffer) {
      return;
    }

    try {
      const response = await fetch(url);
      if (!response.ok) {
        console.warn(`SoundManager: Failed to fetch ambient sound: ${url}`);
        return;
      }

      const arrayBuffer = await response.arrayBuffer();
      this.ambientBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
      this.ambientUrl = url;
      console.log(
        '[SoundManager] loadAmbient: successfully loaded and decoded audio',
      );
    } catch (error) {
      console.warn('SoundManager: Failed to load ambient sound', error);
    }
  }

  /**
   * Start playing the ambient sound in a loop
   * Fades in smoothly for a pleasant experience
   */
  playAmbient(): void {
    console.log('[SoundManager] playAmbient called', {
      isMuted: this.isMuted,
      isAmbientMuted: this.isAmbientMuted,
      hasAudioContext: !!this.audioContext,
      hasAmbientBuffer: !!this.ambientBuffer,
      isAmbientPlaying: this.isAmbientPlaying,
    });

    if (
      this.isMuted ||
      this.isAmbientMuted ||
      !this.audioContext ||
      !this.ambientBuffer
    ) {
      console.warn(
        '[SoundManager] playAmbient: conditions not met, returning early',
      );
      return;
    }

    // Already playing
    if (this.isAmbientPlaying) {
      return;
    }

    try {
      // Create source node
      this.ambientSource = this.audioContext.createBufferSource();
      this.ambientSource.buffer = this.ambientBuffer;
      this.ambientSource.loop = true; // Loop the ambient sound

      // Create gain node for volume control and fade
      this.ambientGainNode = this.audioContext.createGain();
      this.ambientGainNode.gain.value = 0; // Start silent

      // Connect: source -> gain -> destination
      this.ambientSource.connect(this.ambientGainNode);
      this.ambientGainNode.connect(this.audioContext.destination);

      // Start playing
      this.ambientSource.start(0);
      this.isAmbientPlaying = true;

      // Fade in over 1 second
      this.ambientGainNode.gain.linearRampToValueAtTime(
        this.ambientVolume * this.masterVolume,
        this.audioContext.currentTime + 1,
      );

      // Handle when source ends (shouldn't happen with loop, but safety)
      this.ambientSource.onended = () => {
        this.isAmbientPlaying = false;
        this.ambientSource = null;
        this.ambientGainNode = null;
      };
    } catch (error) {
      console.warn('SoundManager: Failed to play ambient sound', error);
      this.isAmbientPlaying = false;
    }
  }

  /**
   * Stop the ambient sound with a fade out
   */
  stopAmbient(): void {
    if (!this.ambientSource || !this.ambientGainNode || !this.audioContext) {
      this.isAmbientPlaying = false;
      return;
    }

    try {
      // Fade out over 0.5 seconds
      this.ambientGainNode.gain.linearRampToValueAtTime(
        0,
        this.audioContext.currentTime + 0.5,
      );

      // Stop the source after fade out
      const source = this.ambientSource;
      setTimeout(() => {
        try {
          source.stop();
        } catch {
          // Ignore errors from already stopped sources
        }
      }, 500);

      this.isAmbientPlaying = false;
      this.ambientSource = null;
      this.ambientGainNode = null;
    } catch (error) {
      console.warn('SoundManager: Failed to stop ambient sound', error);
      this.isAmbientPlaying = false;
    }
  }

  /**
   * Check if ambient sound is currently playing
   */
  getAmbientPlaying(): boolean {
    return this.isAmbientPlaying;
  }

  /**
   * Set ambient volume (0.0 to 1.0)
   */
  setAmbientVolume(volume: number): void {
    this.ambientVolume = Math.max(0, Math.min(1, volume));

    // Update current playing ambient if any
    if (this.ambientGainNode && this.audioContext && this.isAmbientPlaying) {
      this.ambientGainNode.gain.linearRampToValueAtTime(
        this.ambientVolume * this.masterVolume,
        this.audioContext.currentTime + 0.1,
      );
    }
  }

  /**
   * Cleanup resources
   */
  dispose(): void {
    this.stopAll();
    this.stopBrushLoop();
    this.stopAmbient();
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
    this.audioBuffers.clear();
    this.activeSources.clear();
    this.brushLoopBuffers.clear();
    this.fallbackBrushBuffer = null;
    this.ambientBuffer = null;
    this.ambientUrl = null;
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

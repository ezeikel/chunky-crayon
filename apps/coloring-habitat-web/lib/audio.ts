export type SoundType = string;
export type BrushSoundType = string;

/* eslint-disable @typescript-eslint/no-unused-vars */
const noop = (..._args: any[]) => {};
const noopAsync = async (..._args: any[]) => {};
const noopFalse = (..._args: any[]) => false;

const soundManager = {
  play: noop,
  stop: noop,
  setVolume: noop,
  setMuted: noop,
  setSfxMuted: noop,
  setAmbientMuted: noop,
  init: noopAsync,
  stopAll: noop,
  startBrushLoop: noop,
  stopBrushLoop: noop,
  isBrushLoopActive: noopFalse,
  loadAmbient: noopAsync,
  playAmbient: noop,
  stopAmbient: noop,
  getAmbientPlaying: noopFalse,
  setAmbientVolume: noop,
};

export const AudioManager = soundManager;
export function getSoundManager() {
  return soundManager;
}

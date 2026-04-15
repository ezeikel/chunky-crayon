"use client";

import { useEffect } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faVolumeHigh,
  faVolumeXmark,
  faMusic,
  faMusicSlash,
} from "@fortawesome/pro-solid-svg-icons";
import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import { useSound } from "./useSound";
import cn from "./cn";

type MuteToggleProps = {
  className?: string;
};

type AudioTileProps = {
  isOn: boolean;
  onToggle: () => void;
  iconOn: IconDefinition;
  iconOff: IconDefinition;
  ariaOn: string;
  ariaOff: string;
};

const AudioTile = ({
  isOn,
  onToggle,
  iconOn,
  iconOff,
  ariaOn,
  ariaOff,
}: AudioTileProps) => (
  <button
    type="button"
    onClick={onToggle}
    aria-label={isOn ? ariaOn : ariaOff}
    aria-pressed={isOn}
    title={isOn ? ariaOn : ariaOff}
    className={cn(
      "flex items-center justify-center size-12 rounded-coloring-card transition-all duration-coloring-base ease-coloring",
      "active:scale-95 focus:outline-none focus:ring-2 focus:ring-coloring-accent",
      isOn
        ? "bg-coloring-accent text-white"
        : "bg-white border border-paper-cream-dark text-coloring-muted hover:bg-paper-cream",
    )}
  >
    <FontAwesomeIcon icon={isOn ? iconOn : iconOff} size="lg" />
  </button>
);

/**
 * Two side-by-side icon tiles for SFX and ambient music.
 * SFX is on by default; music is off by default. Each toggles independently.
 */
const MuteToggle = ({ className }: MuteToggleProps) => {
  const {
    isSfxMuted,
    toggleSfxMute,
    isAmbientMuted,
    toggleAmbientMute,
    initSounds,
    playSound,
  } = useSound();

  // Initialize sounds on first interaction
  useEffect(() => {
    const handleFirstInteraction = () => {
      initSounds();
      document.removeEventListener("click", handleFirstInteraction);
      document.removeEventListener("touchstart", handleFirstInteraction);
    };

    document.addEventListener("click", handleFirstInteraction);
    document.addEventListener("touchstart", handleFirstInteraction);

    return () => {
      document.removeEventListener("click", handleFirstInteraction);
      document.removeEventListener("touchstart", handleFirstInteraction);
    };
  }, [initSounds]);

  const handleSfxToggle = () => {
    const wasOff = isSfxMuted;
    toggleSfxMute();
    if (wasOff) playSound("pop");
  };

  const handleMusicToggle = () => {
    toggleAmbientMute();
  };

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <AudioTile
        isOn={!isSfxMuted}
        onToggle={handleSfxToggle}
        iconOn={faVolumeHigh}
        iconOff={faVolumeXmark}
        ariaOn="Sound effects on"
        ariaOff="Sound effects off"
      />
      <AudioTile
        isOn={!isAmbientMuted}
        onToggle={handleMusicToggle}
        iconOn={faMusic}
        iconOff={faMusicSlash}
        ariaOn="Music on"
        ariaOff="Music off"
      />
    </div>
  );
};

export default MuteToggle;

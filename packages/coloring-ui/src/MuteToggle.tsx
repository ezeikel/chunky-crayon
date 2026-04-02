"use client";

import { useEffect } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faVolumeHigh, faVolumeXmark } from "@fortawesome/pro-solid-svg-icons";
import { motion } from "framer-motion";
import { useSound } from "./useSound";
import cn from "./cn";

type MuteToggleProps = {
  className?: string;
};

const MuteToggle = ({ className }: MuteToggleProps) => {
  const { isMuted, toggleMute, initSounds, playSound } = useSound();

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

  const handleToggle = () => {
    toggleMute();
    if (isMuted) {
      // Will be unmuted, so play a sound
      playSound("pop");
    }
  };

  return (
    <motion.button
      type="button"
      onClick={handleToggle}
      className={cn(
        "flex items-center justify-center w-12 h-12 rounded-full",
        "bg-coloring-surface border-2 border-coloring-surface-dark",
        "hover:bg-coloring-surface-dark active:scale-95",
        "transition-all duration-150",
        "shadow-sm hover:shadow-md",
        className,
      )}
      whileTap={{ scale: 0.9 }}
      aria-label={isMuted ? "Unmute sounds" : "Mute sounds"}
      title={isMuted ? "Turn sounds on" : "Turn sounds off"}
    >
      <FontAwesomeIcon
        icon={isMuted ? faVolumeXmark : faVolumeHigh}
        className={cn(
          "text-xl transition-colors",
          isMuted ? "text-coloring-muted" : "text-coloring-accent",
        )}
      />
    </motion.button>
  );
};

export default MuteToggle;

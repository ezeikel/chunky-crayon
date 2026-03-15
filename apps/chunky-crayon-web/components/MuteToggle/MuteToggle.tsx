'use client';

import { useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faVolumeHigh, faVolumeXmark } from '@fortawesome/pro-solid-svg-icons';
import { motion } from 'framer-motion';
import { useSound } from '@/hooks/useSound';
import cn from '@/utils/cn';

type MuteToggleProps = {
  className?: string;
};

const MuteToggle = ({ className }: MuteToggleProps) => {
  const { isMuted, toggleMute, initSounds, playSound } = useSound();

  // Initialize sounds on first interaction
  useEffect(() => {
    const handleFirstInteraction = () => {
      initSounds();
      document.removeEventListener('click', handleFirstInteraction);
      document.removeEventListener('touchstart', handleFirstInteraction);
    };

    document.addEventListener('click', handleFirstInteraction);
    document.addEventListener('touchstart', handleFirstInteraction);

    return () => {
      document.removeEventListener('click', handleFirstInteraction);
      document.removeEventListener('touchstart', handleFirstInteraction);
    };
  }, [initSounds]);

  const handleToggle = () => {
    toggleMute();
    if (isMuted) {
      // Will be unmuted, so play a sound
      playSound('pop');
    }
  };

  return (
    <motion.button
      type="button"
      onClick={handleToggle}
      className={cn(
        'flex items-center justify-center w-12 h-12 rounded-full',
        'bg-paper-cream border-2 border-paper-cream-dark',
        'hover:bg-paper-cream-dark active:scale-95',
        'transition-all duration-150',
        'shadow-sm hover:shadow-md',
        className,
      )}
      whileTap={{ scale: 0.9 }}
      aria-label={isMuted ? 'Unmute sounds' : 'Mute sounds'}
      title={isMuted ? 'Turn sounds on' : 'Turn sounds off'}
    >
      <FontAwesomeIcon
        icon={isMuted ? faVolumeXmark : faVolumeHigh}
        className={cn(
          'text-xl transition-colors',
          isMuted ? 'text-text-muted' : 'text-crayon-orange',
        )}
      />
    </motion.button>
  );
};

export default MuteToggle;

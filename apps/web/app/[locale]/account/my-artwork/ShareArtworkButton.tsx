'use client';

import { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faShare } from '@fortawesome/pro-solid-svg-icons';
import ShareArtworkModal from '@/components/ShareArtworkModal/ShareArtworkModal';

type ShareArtworkButtonProps = {
  artworkId: string;
  artworkTitle: string;
};

const ShareArtworkButton = ({
  artworkId,
  artworkTitle,
}: ShareArtworkButtonProps) => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setIsModalOpen(true)}
        className="flex items-center justify-center size-11 md:size-14 rounded-full bg-crayon-purple text-white shadow-lg hover:bg-crayon-purple-dark hover:scale-110 active:scale-95 transition-all duration-200"
        aria-label="Share artwork"
        title="Share with family"
      >
        <FontAwesomeIcon icon={faShare} className="text-sm md:text-base" />
      </button>

      <ShareArtworkModal
        artworkId={artworkId}
        artworkTitle={artworkTitle}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </>
  );
};

export default ShareArtworkButton;

"use client";

import { useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faShare } from "@fortawesome/free-solid-svg-icons";
import ShareArtworkModal from "@/components/ShareArtworkModal";

type ShareArtworkButtonProps = {
  artworkId: string;
  artworkTitle: string;
  artworkImageUrl: string;
};

const ShareArtworkButton = ({
  artworkId,
  artworkTitle,
  artworkImageUrl,
}: ShareArtworkButtonProps) => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setIsModalOpen(true)}
        className="flex items-center justify-center size-10 rounded-full bg-primary text-primary-foreground shadow-sm hover:bg-primary/90 transition-all"
        aria-label="Share artwork"
        title="Share artwork"
      >
        <FontAwesomeIcon icon={faShare} className="text-sm" />
      </button>

      <ShareArtworkModal
        artworkId={artworkId}
        artworkTitle={artworkTitle}
        artworkImageUrl={artworkImageUrl}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </>
  );
};

export default ShareArtworkButton;

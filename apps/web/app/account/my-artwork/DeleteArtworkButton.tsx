'use client';

import { useState, useTransition } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTrash, faSpinner } from '@fortawesome/pro-solid-svg-icons';
import { deleteSavedArtwork } from '@/app/actions/saved-artwork';

type DeleteArtworkButtonProps = {
  artworkId: string;
};

const DeleteArtworkButton = ({ artworkId }: DeleteArtworkButtonProps) => {
  const [isPending, startTransition] = useTransition();
  const [showConfirm, setShowConfirm] = useState(false);

  const handleDelete = () => {
    startTransition(async () => {
      await deleteSavedArtwork(artworkId);
      setShowConfirm(false);
    });
  };

  if (showConfirm) {
    return (
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={handleDelete}
          disabled={isPending}
          className="text-xs text-white bg-crayon-pink hover:bg-crayon-pink-dark px-2 py-1 rounded-full transition-colors disabled:opacity-50"
        >
          {isPending ? (
            <FontAwesomeIcon icon={faSpinner} className="animate-spin" />
          ) : (
            'Yes'
          )}
        </button>
        <button
          type="button"
          onClick={() => setShowConfirm(false)}
          disabled={isPending}
          className="text-xs text-text-secondary hover:text-text-primary transition-colors"
        >
          No
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setShowConfirm(true)}
      className="text-text-tertiary hover:text-crayon-pink transition-colors"
      aria-label="Delete artwork"
      title="Delete artwork"
    >
      <FontAwesomeIcon icon={faTrash} className="text-sm" />
    </button>
  );
};

export default DeleteArtworkButton;

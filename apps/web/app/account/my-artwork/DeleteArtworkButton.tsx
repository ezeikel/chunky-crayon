'use client';

import { useState, useTransition } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTrash, faSpinner } from '@fortawesome/pro-solid-svg-icons';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { deleteSavedArtwork } from '@/app/actions/saved-artwork';

type DeleteArtworkButtonProps = {
  artworkId: string;
};

const DeleteArtworkButton = ({ artworkId }: DeleteArtworkButtonProps) => {
  const [isPending, startTransition] = useTransition();
  const [isOpen, setIsOpen] = useState(false);

  const handleDelete = () => {
    startTransition(async () => {
      await deleteSavedArtwork(artworkId);
      setIsOpen(false);
    });
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="flex items-center justify-center size-11 md:size-14 rounded-full bg-crayon-pink text-white shadow-lg hover:bg-crayon-pink-dark hover:scale-110 active:scale-95 transition-all duration-200"
        aria-label="Delete artwork"
        title="Delete artwork"
      >
        <FontAwesomeIcon icon={faTrash} className="text-sm md:text-base" />
      </button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 rounded-full bg-crayon-pink-light/30 flex items-center justify-center">
                <FontAwesomeIcon
                  icon={faTrash}
                  className="text-2xl text-crayon-pink"
                />
              </div>
            </div>
            <DialogTitle className="text-center">Delete Artwork?</DialogTitle>
            <DialogDescription className="text-center font-tondo">
              Are you sure you want to delete this artwork? This can&apos;t be
              undone!
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-3 mt-6">
            <button
              type="button"
              onClick={handleDelete}
              disabled={isPending}
              className="w-full font-tondo font-bold text-white px-6 py-3 rounded-full bg-crayon-pink shadow-btn-primary hover:shadow-btn-primary-hover hover:scale-105 active:scale-95 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              {isPending ? (
                <FontAwesomeIcon icon={faSpinner} className="animate-spin" />
              ) : (
                'Yes, Delete'
              )}
            </button>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              disabled={isPending}
              className="w-full font-tondo font-bold text-text-secondary px-6 py-3 rounded-full border-2 border-paper-cream-dark hover:bg-paper-cream hover:scale-105 active:scale-95 transition-all duration-200 disabled:opacity-50"
            >
              No, Keep It
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default DeleteArtworkButton;

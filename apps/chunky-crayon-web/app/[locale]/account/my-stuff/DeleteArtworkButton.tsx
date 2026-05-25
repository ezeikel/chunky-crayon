'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTrash, faCheck } from '@fortawesome/pro-solid-svg-icons';
import { faSpinnerThird } from '@fortawesome/pro-duotone-svg-icons';
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
  /**
   * 'lg' (default) = chunky 44–56px pink ball, the original action-row
   * style. 'sm' = compact 32px chip designed to sit as a top-right
   * overlay on a thumbnail without dominating the picture.
   */
  size?: 'lg' | 'sm';
};

const DeleteArtworkButton = ({
  artworkId,
  size = 'lg',
}: DeleteArtworkButtonProps) => {
  const [isPending, startTransition] = useTransition();
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();

  // Close the modal and tell the user it's gone the moment they tap
  // Delete — the server roundtrip (DB delete + R2 cleanup + revalidate)
  // takes seconds, and forcing the kid to stare at a spinner is the UX
  // the user pushed back on. Refresh the page once the action resolves
  // so the grid actually re-renders without the card. Toast on error
  // and the modal re-opens via router refresh state.
  const handleDelete = () => {
    setIsOpen(false);
    toast.success('Picture removed');
    startTransition(async () => {
      const result = await deleteSavedArtwork(artworkId);
      if (!result.success) {
        toast.error(result.error ?? 'Could not remove picture');
        return;
      }
      router.refresh();
    });
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className={
          size === 'sm'
            ? 'flex items-center justify-center size-8 rounded-full bg-crayon-pink/90 backdrop-blur-sm text-white shadow-md hover:bg-crayon-pink hover:scale-110 active:scale-95 transition-all duration-200'
            : 'flex items-center justify-center size-11 md:size-14 rounded-full bg-crayon-pink text-white shadow-lg hover:bg-crayon-pink-dark hover:scale-110 active:scale-95 transition-all duration-200'
        }
        aria-label="Delete artwork"
        title="Delete artwork"
      >
        <FontAwesomeIcon
          icon={faTrash}
          className={size === 'sm' ? 'text-xs' : 'text-sm md:text-base'}
        />
      </button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-xs">
          <DialogHeader>
            <div className="mx-auto mb-2 flex size-16 items-center justify-center rounded-full bg-crayon-pink/15">
              <FontAwesomeIcon
                icon={faTrash}
                className="text-2xl text-crayon-pink"
              />
            </div>
            <DialogTitle className="text-center font-tondo text-xl">
              Are you sure?
            </DialogTitle>
            {/* Screen-reader description; visually hidden so the kid
                sees just the title + the two pill buttons. */}
            <DialogDescription className="sr-only">
              Permanently delete this saved picture.
            </DialogDescription>
          </DialogHeader>

          {/* Rounded-full pills, icon + text inline. Same vocabulary
              as PaywallModal / ParentalGate's action row. Side-by-side
              at this card width so neither button feels like a
              landing pad. */}
          <div className="mt-2 flex justify-center gap-3">
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              disabled={isPending}
              className="inline-flex items-center gap-2 rounded-full border-2 border-paper-cream-dark bg-white px-5 py-2.5 font-tondo font-bold text-text-primary transition-transform hover:scale-105 active:scale-95 disabled:opacity-50"
            >
              <FontAwesomeIcon icon={faCheck} className="text-crayon-green" />
              Keep
            </button>
            <button
              type="button"
              onClick={handleDelete}
              disabled={isPending}
              className="inline-flex items-center gap-2 rounded-full bg-crayon-pink px-5 py-2.5 font-tondo font-bold text-white shadow-btn-primary transition-transform hover:scale-105 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:scale-100"
            >
              {isPending ? (
                <FontAwesomeIcon
                  icon={faSpinnerThird}
                  className="animate-spin"
                />
              ) : (
                <FontAwesomeIcon icon={faTrash} />
              )}
              Delete
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default DeleteArtworkButton;

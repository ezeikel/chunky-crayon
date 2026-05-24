'use client';

import { useState, useTransition } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTrash, faCheck } from '@fortawesome/pro-solid-svg-icons';
import { faSpinnerThird, faHeart } from '@fortawesome/pro-duotone-svg-icons';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { deleteMyCreation } from '@/app/actions/coloring-image';

/**
 * Delete one of the kid's own ColoringImage rows from the "Your
 * pictures" grid on /account/my-stuff. Mirrors DeleteArtworkButton's
 * shape (32px pink chip overlay, chunky kid-friendly two-button
 * confirm dialog) so the two grids feel identical.
 *
 * Distinct from DeleteArtworkButton because it deletes a different
 * model (ColoringImage vs SavedArtwork) AND has to handle the
 * "this picture has a saved colored copy" guardrail — see the
 * has_saved_references branch on the server action. In that case we
 * surface a friendly toast pointing the parent at the saved grid.
 */

type DeleteCreationButtonProps = {
  coloringImageId: string;
};

const DeleteCreationButton = ({
  coloringImageId,
}: DeleteCreationButtonProps) => {
  const [isPending, startTransition] = useTransition();
  const [isOpen, setIsOpen] = useState(false);

  const handleDelete = () => {
    startTransition(async () => {
      const result = await deleteMyCreation(coloringImageId);
      setIsOpen(false);
      if (!result.success) {
        // has_saved_references is the common explanatory case — the
        // kid colored + saved this picture, and the saved version
        // depends on this row. Direct them to the saved grid.
        if (result.reason === 'has_saved_references') {
          toast.info(
            'This picture has a saved colored version. Delete that one first.',
            { icon: <FontAwesomeIcon icon={faHeart} /> },
          );
          return;
        }
        toast.error("Couldn't delete that picture. Try again?");
      }
    });
  };

  return (
    <>
      {/* Small chip — same shape as DeleteArtworkButton size='sm' so
          both grids' overlays feel identical. */}
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="flex items-center justify-center size-8 rounded-full bg-crayon-pink/90 backdrop-blur-sm text-white shadow-md hover:bg-crayon-pink hover:scale-110 active:scale-95 transition-all duration-200"
        aria-label="Delete picture"
        title="Delete picture"
      >
        <FontAwesomeIcon icon={faTrash} className="text-xs" />
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
            <DialogDescription className="sr-only">
              Permanently delete this picture.
            </DialogDescription>
          </DialogHeader>

          {/* Rounded-full pills, icon + text inline. Same vocabulary
              as DeleteArtworkButton + PaywallModal / ParentalGate. */}
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

export default DeleteCreationButton;

"use client";

import { useState, useTransition } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTrash, faSpinner } from "@fortawesome/free-solid-svg-icons";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { deleteSavedArtwork } from "@/app/actions/saved-artwork";

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
        className="flex items-center justify-center size-10 rounded-full bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90 transition-all"
        aria-label="Delete artwork"
        title="Delete artwork"
      >
        <FontAwesomeIcon icon={faTrash} className="text-sm" />
      </button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Artwork?</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this artwork? This action cannot
              be undone.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-3 mt-4">
            <button
              type="button"
              onClick={handleDelete}
              disabled={isPending}
              className="w-full px-6 py-2.5 rounded-lg bg-destructive text-destructive-foreground font-semibold hover:bg-destructive/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isPending ? (
                <FontAwesomeIcon icon={faSpinner} className="animate-spin" />
              ) : (
                "Yes, Delete"
              )}
            </button>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              disabled={isPending}
              className="w-full px-6 py-2.5 rounded-lg border border-border font-semibold text-muted-foreground hover:bg-secondary transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default DeleteArtworkButton;

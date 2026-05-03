'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faArrowsRotate,
  faTrashCan,
  faCheck,
  faXmark,
} from '@fortawesome/pro-solid-svg-icons';
import { ActionButton } from '@one-colored-pixel/coloring-ui';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import cn from '@/utils/cn';

type StartOverButtonProps = {
  onStartOver: () => void;
  className?: string;
  disabled?: boolean;
};

/**
 * "Start Over" action with a kid-friendly confirm modal.
 *
 * Tapping the refresh tile opens a centred modal with a big green tick
 * (confirm) and a big red cross (cancel). This is a destructive action that
 * wipes user colouring — the explicit modal is safer than an inline swap and
 * works identically on mobile, tablet, and desktop because it uses the
 * shared `<Dialog>` primitive. The action button uses a refresh-arrow icon
 * (reads as "fresh start"); the modal keeps the trash icon to make the
 * destructive consequence unmissable in the moment of confirmation.
 */
const StartOverButton = ({
  onStartOver,
  className,
  disabled = false,
}: StartOverButtonProps) => {
  const t = useTranslations('startOverButton');
  const [open, setOpen] = useState(false);

  const handleConfirm = () => {
    onStartOver();
    setOpen(false);
  };

  return (
    <>
      <ActionButton
        size="tile"
        tone="secondary"
        icon={faArrowsRotate}
        label={t('idle')}
        onClick={() => setOpen(true)}
        disabled={disabled}
        className={className}
        data-testid="start-over"
      />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          className={cn(
            'max-w-sm p-6 md:p-8 rounded-coloring-card border-2 border-paper-cream-dark',
          )}
          data-testid="start-over-modal"
        >
          <DialogHeader className="items-center text-center">
            <div className="flex items-center justify-center size-16 rounded-full bg-red-100 mb-3">
              <FontAwesomeIcon
                icon={faTrashCan}
                className="text-red-600 text-2xl"
              />
            </div>
            <DialogTitle className="font-tondo font-bold text-2xl text-text-primary">
              {t('modalTitle')}
            </DialogTitle>
            <DialogDescription className="font-tondo text-base text-text-secondary">
              {t('modalBody')}
            </DialogDescription>
          </DialogHeader>

          <div className="flex items-center justify-center gap-6 mt-4">
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label={t('cancel')}
              title={t('cancel')}
              className={cn(
                'flex items-center justify-center size-16 rounded-full',
                'border-2 border-paper-cream-dark bg-white text-text-primary',
                'transition-all duration-200 hover:scale-105 active:scale-95',
              )}
              data-testid="start-over-cancel"
            >
              <FontAwesomeIcon icon={faXmark} className="text-3xl" />
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              aria-label={t('confirm')}
              title={t('confirm')}
              className={cn(
                'flex items-center justify-center size-16 rounded-full',
                'bg-crayon-green text-white shadow-btn-primary',
                'transition-all duration-200 hover:scale-105 hover:bg-crayon-green-dark active:scale-95',
              )}
              data-testid="start-over-confirm"
            >
              <FontAwesomeIcon icon={faCheck} className="text-3xl" />
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default StartOverButton;

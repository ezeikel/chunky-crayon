'use client';

import { useState } from 'react';
import { faPlus } from '@fortawesome/pro-duotone-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import CreateCharacterModal from '@/components/Characters/CreateCharacterModal/CreateCharacterModal';

type Props = {
  /**
   * If true, render a full dashed-outline tile sized like a CharacterTile.
   * If false (small variant), render an inline chunky pill button suitable
   * for header / page CTA use. Both open the same modal.
   */
  variant?: 'tile' | 'pill';
  /** Hide the button entirely when the user has hit the per-profile cap. */
  disabled?: boolean;
};

const AddCharacterButton = ({ variant = 'tile', disabled = false }: Props) => {
  const [open, setOpen] = useState(false);

  const tileClasses =
    'group flex flex-col items-center justify-center gap-3 rounded-3xl border-4 border-dashed border-paper-cream-dark bg-paper-cream/50 aspect-square w-full text-neutral-600 hover:bg-paper-cream hover:text-black transition-colors disabled:opacity-40 disabled:cursor-not-allowed';

  const pillClasses =
    'inline-flex items-center gap-2 rounded-full bg-crayon-orange text-white px-5 py-3 text-base font-bold min-h-[44px] hover:bg-crayon-orange-dark disabled:opacity-40 disabled:cursor-not-allowed';

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        disabled={disabled}
        className={variant === 'tile' ? tileClasses : pillClasses}
        aria-label="Make a new character"
      >
        <FontAwesomeIcon
          icon={faPlus}
          className={variant === 'tile' ? 'text-5xl' : 'text-lg'}
        />
        <span className={variant === 'tile' ? 'font-display text-xl' : ''}>
          {variant === 'tile' ? 'Make a friend' : 'Make a friend'}
        </span>
      </button>

      {open ? (
        <CreateCharacterModal open={open} onClose={() => setOpen(false)} />
      ) : null}
    </>
  );
};

export default AddCharacterButton;

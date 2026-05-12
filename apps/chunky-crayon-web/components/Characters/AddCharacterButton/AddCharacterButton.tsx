'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { faPlus } from '@fortawesome/pro-duotone-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import useUser from '@/hooks/useUser';
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

/**
 * "Make a friend" button that does the right thing based on auth state:
 *   - Signed in → opens the create modal.
 *   - Guest → routes to /signin?callbackUrl=/characters so they bounce
 *     back to the right page after auth. Matches the pattern used by
 *     other paid/auth-only CTAs in CC (don't dead-end the user).
 *
 * While `useUser` is still loading we keep the button enabled and
 * default-treat the user as guest — clicking before auth resolves still
 * funnels them to /signin, which is harmless.
 */
const AddCharacterButton = ({ variant = 'tile', disabled = false }: Props) => {
  const router = useRouter();
  const { isGuest, isLoading } = useUser();
  const [open, setOpen] = useState(false);

  const tileClasses =
    'group flex flex-col items-center justify-center gap-3 rounded-3xl border-4 border-dashed border-paper-cream-dark bg-paper-cream/50 aspect-square w-full text-neutral-600 hover:bg-paper-cream hover:text-black transition-colors disabled:opacity-40 disabled:cursor-not-allowed';

  const pillClasses =
    'inline-flex items-center gap-2 rounded-full bg-crayon-orange text-white px-5 py-3 text-base font-bold min-h-[44px] hover:bg-crayon-orange-dark disabled:opacity-40 disabled:cursor-not-allowed';

  const handleClick = () => {
    // Guest path: route to signin with callback so we land back here after auth.
    if (isGuest || isLoading) {
      router.push(`/signin?callbackUrl=${encodeURIComponent('/characters')}`);
      return;
    }
    setOpen(true);
  };

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        disabled={disabled}
        className={variant === 'tile' ? tileClasses : pillClasses}
        aria-label="Make a new character"
      >
        <FontAwesomeIcon
          icon={faPlus}
          className={variant === 'tile' ? 'text-5xl' : 'text-lg'}
        />
        <span className={variant === 'tile' ? 'font-display text-xl' : ''}>
          Make a friend
        </span>
      </button>

      {open ? (
        <CreateCharacterModal open={open} onClose={() => setOpen(false)} />
      ) : null}
    </>
  );
};

export default AddCharacterButton;

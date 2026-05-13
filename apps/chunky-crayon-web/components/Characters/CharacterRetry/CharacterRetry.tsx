'use client';

/**
 * Retry surface for a FAILED character. Lives at /characters/[id] when
 * the row's status is FAILED. Tapping the button re-fires the worker via
 * regenerateCharacterPortrait and refreshes the route once the row
 * flips back to GENERATING.
 *
 * Kid-friendly copy: never surfaces the raw OpenAI / network error. The
 * dev viewer at /dev/characters/[id] is where admins see the real
 * failure reason.
 */

import { useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faRotateRight } from '@fortawesome/pro-duotone-svg-icons';
import { regenerateCharacterPortrait } from '@/app/actions/characters';

type Props = {
  id: string;
  name: string;
};

const CharacterRetry = ({ id, name }: Props) => {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const handleRetry = () => {
    startTransition(async () => {
      const result = await regenerateCharacterPortrait(id);
      if (result.ok) {
        toast.success(`Drawing ${name} again.`);
        // Server set status back to GENERATING — refresh the route so
        // the page re-fetches and renders the "on the way" state.
        router.refresh();
      } else {
        toast.error('Could not retry right now. Try again in a moment.');
      }
    });
  };

  const iconStyle = {
    '--fa-primary-color': 'hsl(var(--crayon-orange))',
    '--fa-secondary-color': 'hsl(var(--crayon-pink))',
    '--fa-secondary-opacity': '0.8',
  } as React.CSSProperties;

  return (
    <div className="flex flex-col items-center text-center py-12 gap-6">
      <FontAwesomeIcon
        icon={faRotateRight}
        className="text-6xl"
        style={iconStyle}
      />
      <div>
        <h1 className="font-display text-3xl mb-2">Let's try {name} again</h1>
        <p className="text-neutral-700 text-base max-w-md">
          Something went wrong drawing your friend. Tap the button and we'll
          have another go.
        </p>
      </div>
      <button
        type="button"
        onClick={handleRetry}
        disabled={pending}
        className="inline-flex items-center gap-2 rounded-full bg-crayon-orange text-white px-6 py-3 text-lg font-bold min-h-[56px] shadow-card hover:scale-105 active:scale-95 transition-transform disabled:opacity-50 disabled:hover:scale-100"
      >
        <FontAwesomeIcon icon={faRotateRight} />
        {pending ? 'Trying…' : 'Try again'}
      </button>
      <Link href="/characters" className="text-sm text-neutral-600 underline">
        Back to all friends
      </Link>
    </div>
  );
};

export default CharacterRetry;

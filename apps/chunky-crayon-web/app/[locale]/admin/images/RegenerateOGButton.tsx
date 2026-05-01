'use client';

import { useTransition } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faArrowsRotate,
  faCircleNotch,
} from '@fortawesome/pro-duotone-svg-icons';
import { toast } from 'sonner';
import { regenerateOGNow } from '@/app/actions/admin-og';
import cn from '@/utils/cn';

const RegenerateOGButton = () => {
  const [isPending, startTransition] = useTransition();

  const handleClick = () => {
    startTransition(async () => {
      const result = await regenerateOGNow();
      if ('error' in result) {
        toast.error(`OG regeneration failed: ${result.error}`);
      } else {
        toast.success(
          'OG regeneration kicked off. Wait ~30s, then re-scrape in Meta debugger.',
          { duration: 6000 },
        );
      }
    });
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isPending}
      className={cn(
        'inline-flex items-center gap-2 px-3 py-1.5 rounded-full border-2 text-sm font-medium transition-colors',
        'border-paper-cream-dark hover:border-crayon-orange/50 hover:text-crayon-orange',
        isPending && 'opacity-60 pointer-events-none',
      )}
    >
      <FontAwesomeIcon
        icon={isPending ? faCircleNotch : faArrowsRotate}
        className={cn('text-base', isPending && 'animate-spin')}
      />
      {isPending ? 'Regenerating…' : 'Regenerate OG now'}
    </button>
  );
};

export default RegenerateOGButton;

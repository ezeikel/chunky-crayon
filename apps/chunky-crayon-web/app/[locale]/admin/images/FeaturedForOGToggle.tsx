'use client';

import { useState, useTransition } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faStar as faStarSolid } from '@fortawesome/pro-solid-svg-icons';
import { faStar as faStarRegular } from '@fortawesome/pro-regular-svg-icons';
import { toast } from 'sonner';
import { setFeaturedForOG } from '@/app/actions/admin-og';
import cn from '@/utils/cn';

type Props = {
  coloringImageId: string;
  initialFeatured: boolean;
};

const FeaturedForOGToggle = ({ coloringImageId, initialFeatured }: Props) => {
  // Optimistic state so the star flips instantly. We reconcile to whatever
  // the server returned if the action errors.
  const [featured, setFeatured] = useState(initialFeatured);
  const [isPending, startTransition] = useTransition();

  const handleClick = (event: React.MouseEvent) => {
    // The toggle sits on top of the image link — stop the click bubbling
    // so we don't navigate when starring.
    event.preventDefault();
    event.stopPropagation();

    const next = !featured;
    setFeatured(next);

    startTransition(async () => {
      const result = await setFeaturedForOG(coloringImageId, next);
      if ('error' in result) {
        setFeatured(!next);
        toast.error(result.error);
      } else {
        toast.success(next ? 'Featured for OG' : 'Removed from OG');
      }
    });
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isPending}
      title={featured ? 'Featured in OG image' : 'Add to OG image pool'}
      aria-label={
        featured ? 'Remove from OG image pool' : 'Add to OG image pool'
      }
      className={cn(
        'absolute bottom-2 right-2 w-8 h-8 rounded-full flex items-center justify-center transition-all',
        'shadow-md hover:scale-110 active:scale-95',
        featured
          ? 'bg-crayon-yellow text-text-primary'
          : 'bg-white/90 text-text-primary/70 hover:text-crayon-orange',
        isPending && 'opacity-60 pointer-events-none',
      )}
    >
      <FontAwesomeIcon
        icon={featured ? faStarSolid : faStarRegular}
        className="text-sm"
      />
    </button>
  );
};

export default FeaturedForOGToggle;

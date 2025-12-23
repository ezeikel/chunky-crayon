'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUser, faUsers } from '@fortawesome/pro-duotone-svg-icons';
import cn from '@/utils/cn';
import useUser from '@/hooks/useUser';

type ImageFilterToggleProps = {
  className?: string;
  showCommunityImages?: boolean;
};

const ImageFilterToggle = ({
  className,
  showCommunityImages = false,
}: ImageFilterToggleProps) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const show = searchParams.get('show') || 'all';
  const { user } = useUser();

  const handleSelect = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('show', value);
    router.push(`?${params.toString()}`);
  };

  // Only show if user is logged in AND community images is enabled in settings
  if (!user || !showCommunityImages) {
    return null;
  }

  return (
    <div className={cn('flex gap-2', className)}>
      {/* Everyone's button */}
      <button
        type="button"
        onClick={() => handleSelect('all')}
        className={cn(
          'flex items-center gap-2 px-4 py-2.5 rounded-full font-tondo font-bold text-base',
          'transition-all duration-200 hover:scale-105 active:scale-95',
          'border-2',
          show === 'all'
            ? 'bg-crayon-teal text-white border-crayon-teal shadow-btn-primary'
            : 'bg-white text-text-secondary border-paper-cream-dark hover:border-crayon-teal hover:text-crayon-teal',
        )}
      >
        <FontAwesomeIcon
          icon={faUsers}
          className="text-lg"
          style={
            show === 'all'
              ? ({
                  '--fa-primary-color': '#ffffff',
                  '--fa-secondary-color': '#ffffff',
                  '--fa-secondary-opacity': '0.7',
                } as React.CSSProperties)
              : ({
                  '--fa-primary-color': 'hsl(var(--crayon-teal))',
                  '--fa-secondary-color': 'hsl(var(--crayon-orange))',
                  '--fa-secondary-opacity': '0.8',
                } as React.CSSProperties)
          }
        />
        Everyone&apos;s
      </button>

      {/* Mine button */}
      <button
        type="button"
        onClick={() => handleSelect('user')}
        className={cn(
          'flex items-center gap-2 px-4 py-2.5 rounded-full font-tondo font-bold text-base',
          'transition-all duration-200 hover:scale-105 active:scale-95',
          'border-2',
          show === 'user'
            ? 'bg-crayon-orange text-white border-crayon-orange shadow-btn-primary'
            : 'bg-white text-text-secondary border-paper-cream-dark hover:border-crayon-orange hover:text-crayon-orange',
        )}
      >
        <FontAwesomeIcon
          icon={faUser}
          className="text-lg"
          style={
            show === 'user'
              ? ({
                  '--fa-primary-color': '#ffffff',
                  '--fa-secondary-color': '#ffffff',
                  '--fa-secondary-opacity': '0.7',
                } as React.CSSProperties)
              : ({
                  '--fa-primary-color': 'hsl(var(--crayon-orange))',
                  '--fa-secondary-color': 'hsl(var(--crayon-teal))',
                  '--fa-secondary-opacity': '0.8',
                } as React.CSSProperties)
          }
        />
        Mine
      </button>
    </div>
  );
};

export default ImageFilterToggle;

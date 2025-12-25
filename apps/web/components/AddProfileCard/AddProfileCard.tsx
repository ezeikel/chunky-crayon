'use client';

import cn from '@/lib/utils';

type AddProfileCardProps = {
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
};

const AddProfileCard = ({
  onClick,
  disabled = false,
  className,
}: AddProfileCardProps) => {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'group flex flex-col items-center gap-3 p-4 rounded-2xl transition-all duration-200',
        'hover:scale-105 active:scale-95',
        'focus:outline-none focus-visible:ring-4 focus-visible:ring-crayon-orange/50',
        'disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100',
        className,
      )}
      aria-label="Add new profile"
    >
      {/* Plus icon circle */}
      <div
        className={cn(
          'w-24 h-24 rounded-full flex items-center justify-center',
          'bg-gray-100 border-4 border-dashed border-gray-300',
          'group-hover:border-crayon-orange group-hover:bg-crayon-orange/10',
          'transition-all duration-200',
        )}
      >
        <svg
          className={cn(
            'w-12 h-12 text-gray-400',
            'group-hover:text-crayon-orange transition-colors',
          )}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 4v16m8-8H4"
          />
        </svg>
      </div>

      {/* Label */}
      <span
        className={cn(
          'font-tondo font-bold text-lg text-gray-400',
          'group-hover:text-crayon-orange transition-colors',
        )}
      >
        Add Profile
      </span>
    </button>
  );
};

export default AddProfileCard;

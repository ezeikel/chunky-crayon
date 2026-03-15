'use client';

import cn from '@/lib/utils';
import ProfileAvatar from '@/components/ProfileAvatar/ProfileAvatar';

type ProfileCardProps = {
  id: string;
  name: string;
  avatarId: string;
  isActive?: boolean;
  onClick?: () => void;
  className?: string;
};

const ProfileCard = ({
  id,
  name,
  avatarId,
  isActive = false,
  onClick,
  className,
}: ProfileCardProps) => {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'group flex flex-col items-center gap-3 p-4 rounded-2xl transition-all duration-200',
        'hover:scale-105 active:scale-95',
        'focus:outline-none focus-visible:ring-4 focus-visible:ring-crayon-orange/50',
        isActive && 'bg-crayon-orange/10',
        className,
      )}
      aria-label={`Switch to ${name}'s profile`}
      aria-current={isActive ? 'true' : undefined}
      data-profile-id={id}
    >
      {/* Avatar with selection ring */}
      <div
        className={cn(
          'relative rounded-full transition-all duration-200',
          'group-hover:ring-4 group-hover:ring-crayon-orange/50',
          isActive && 'ring-4 ring-crayon-orange',
        )}
      >
        <ProfileAvatar avatarId={avatarId} name={name} size="lg" />

        {/* Active indicator checkmark */}
        {isActive && (
          <div className="absolute -bottom-1 -right-1 w-8 h-8 bg-crayon-orange rounded-full flex items-center justify-center shadow-md">
            <svg
              className="w-5 h-5 text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={3}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
        )}
      </div>

      {/* Profile name */}
      <span
        className={cn(
          'font-tondo font-bold text-lg text-text-secondary transition-colors',
          'group-hover:text-crayon-orange',
          isActive && 'text-crayon-orange',
        )}
      >
        {name}
      </span>
    </button>
  );
};

export default ProfileCard;

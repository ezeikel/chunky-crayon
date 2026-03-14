'use client';

import { getAvatar, getAvatarColor, getInitials } from '@/lib/avatars';
import cn from '@/lib/utils';

type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

type ProfileAvatarProps = {
  avatarId: string;
  name?: string;
  size?: AvatarSize;
  className?: string;
  showBorder?: boolean;
};

const sizeClasses: Record<AvatarSize, string> = {
  xs: 'w-8 h-8 text-xs',
  sm: 'w-10 h-10 text-sm',
  md: 'w-16 h-16 text-lg',
  lg: 'w-24 h-24 text-2xl',
  xl: 'w-32 h-32 text-3xl',
};

const borderSizeClasses: Record<AvatarSize, string> = {
  xs: 'ring-2',
  sm: 'ring-2',
  md: 'ring-4',
  lg: 'ring-4',
  xl: 'ring-[6px]',
};

const ProfileAvatar = ({
  avatarId,
  name,
  size = 'md',
  className,
  showBorder = false,
}: ProfileAvatarProps) => {
  const avatar = getAvatar(avatarId);
  const color = getAvatarColor(avatarId);
  const initials = name ? getInitials(name) : '?';

  // For placeholder avatars, show a gray circle with initials
  if (avatar?.placeholder || !avatar) {
    return (
      <div
        className={cn(
          'rounded-full flex items-center justify-center font-tondo font-bold text-gray-500 bg-gray-200',
          sizeClasses[size],
          showBorder && `${borderSizeClasses[size]} ring-white ring-offset-2`,
          className,
        )}
      >
        {initials}
      </div>
    );
  }

  // For crayon avatars, render a colored circle with crayon-style design
  return (
    <div
      className={cn(
        'rounded-full flex items-center justify-center relative overflow-hidden',
        sizeClasses[size],
        showBorder && `${borderSizeClasses[size]} ring-white ring-offset-2`,
        className,
      )}
      style={{ backgroundColor: color }}
    >
      {/* Crayon texture effect */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent" />

      {/* Crayon shine effect */}
      <div
        className="absolute top-1 left-1/4 w-1/3 h-1/4 rounded-full opacity-40"
        style={{ backgroundColor: 'white' }}
      />

      {/* Crayon tip indicator (small circle at bottom) */}
      <div
        className="absolute bottom-[10%] w-[30%] h-[30%] rounded-full opacity-30"
        style={{ backgroundColor: 'black' }}
      />
    </div>
  );
};

export default ProfileAvatar;

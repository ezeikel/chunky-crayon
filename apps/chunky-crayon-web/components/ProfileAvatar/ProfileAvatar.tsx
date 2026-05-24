'use client';

import { useState } from 'react';
import Image from 'next/image';
import { getAvatar, getInitials } from '@/lib/avatars';
import { resolveThumbnailUrl } from '@/lib/scene/thumbnail-url';
import cn from '@/lib/utils';

/**
 * Profile avatar render.
 *
 * Was a coloured-crayon circle (named hex per avatar + crayon-shine
 * pseudo-art). New shape: an illustrated tile from R2 sitting on a
 * soft tinted background (the catalog entry's `bg` Tailwind class).
 * `resolveThumbnailUrl` handles the env-aware URL build (same helper
 * the Character Builder species tiles use) so dev + prod work from
 * one catalog. Initials are the visual fallback when the image fails
 * to load AND when we have no avatar match in the catalog.
 *
 * Sizes / borders kept verbatim so every existing call site renders
 * at the same physical dimensions.
 */

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

// Pixel dimensions for `<Image>` (matches sizeClasses). Gives Next/Image
// a concrete size so it doesn't ship full-resolution 1024² PNGs for an
// 8px chip in the header.
const sizePx: Record<AvatarSize, number> = {
  xs: 32,
  sm: 40,
  md: 64,
  lg: 96,
  xl: 128,
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
  const initials = name ? getInitials(name) : '?';
  const [imageError, setImageError] = useState(false);

  // Fallback path — no catalog match (unknown id) OR the image
  // failed to load. Same grey-initials chip the previous component
  // shipped, kept as the last-resort visual.
  const renderInitialsFallback = () => (
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

  if (!avatar) return renderInitialsFallback();

  const imageUrl = resolveThumbnailUrl(avatar.imageKey);

  // Env-resolver returned null — dev surface without R2 wired up, or
  // a brand-new install before generate-profile-avatars has run.
  // Show the initials chip rather than a broken image.
  if (!imageUrl || imageError) return renderInitialsFallback();

  const px = sizePx[size];

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-full',
        avatar.bg,
        sizeClasses[size],
        showBorder && `${borderSizeClasses[size]} ring-white ring-offset-2`,
        className,
      )}
    >
      <Image
        src={imageUrl}
        alt={name ? `${name}'s avatar` : avatar.name}
        width={px}
        height={px}
        // p-1 trims the illustration slightly inside the tinted ring
        // so the art has a small "breathing" gap from the edge — same
        // composition the Character Builder species tiles use.
        className="size-full object-contain p-1"
        onError={() => setImageError(true)}
      />
    </div>
  );
};

export default ProfileAvatar;

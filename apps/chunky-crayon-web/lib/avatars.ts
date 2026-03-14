// Avatar system for profile selection
// Includes color-based crayons and placeholder slots for custom SVG avatars

export type Avatar = {
  id: string;
  name: string;
  color: string;
  placeholder?: boolean;
};

// Crayon colors matching the app's design system
export const AVATARS: Avatar[] = [
  { id: 'crayon-red', name: 'Red Crayon', color: '#FF6B6B' },
  { id: 'crayon-orange', name: 'Orange Crayon', color: '#FF9F43' },
  { id: 'crayon-yellow', name: 'Yellow Crayon', color: '#FECA57' },
  { id: 'crayon-green', name: 'Green Crayon', color: '#1DD1A1' },
  { id: 'crayon-blue', name: 'Blue Crayon', color: '#54A0FF' },
  { id: 'crayon-purple', name: 'Purple Crayon', color: '#A29BFE' },
  { id: 'crayon-pink', name: 'Pink Crayon', color: '#FF85A2' },
  { id: 'crayon-brown', name: 'Brown Crayon', color: '#C8A879' },
  { id: 'crayon-teal', name: 'Teal Crayon', color: '#00CEC9' },
  { id: 'crayon-coral', name: 'Coral Crayon', color: '#FF7675' },
  // Placeholder slots for future custom character avatars
  // User will create 10+ custom SVG avatars later
  { id: 'avatar-01', name: 'Character 1', color: '#E0E0E0', placeholder: true },
  { id: 'avatar-02', name: 'Character 2', color: '#E0E0E0', placeholder: true },
  { id: 'avatar-03', name: 'Character 3', color: '#E0E0E0', placeholder: true },
  { id: 'avatar-04', name: 'Character 4', color: '#E0E0E0', placeholder: true },
  { id: 'avatar-05', name: 'Character 5', color: '#E0E0E0', placeholder: true },
];

// Default avatar for new profiles
export const DEFAULT_AVATAR_ID = 'crayon-orange';

// Get avatar by ID
export const getAvatar = (avatarId: string): Avatar | undefined => {
  return AVATARS.find((avatar) => avatar.id === avatarId);
};

// Get avatar color (fallback to orange if not found)
export const getAvatarColor = (avatarId: string): string => {
  const avatar = getAvatar(avatarId);
  return avatar?.color || '#FF9F43';
};

// Get non-placeholder avatars (for selection UI)
export const getSelectableAvatars = (): Avatar[] => {
  return AVATARS.filter((avatar) => !avatar.placeholder);
};

// Get initials from name for fallback avatar
export const getInitials = (name: string): string => {
  return name
    .split(' ')
    .map((word) => word[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
};

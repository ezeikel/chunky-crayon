'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { AgeGroup } from '@chunky-crayon/db/types';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import cn from '@/lib/utils';
import ProfileAvatar from '@/components/ProfileAvatar/ProfileAvatar';
import { getSelectableAvatars, DEFAULT_AVATAR_ID } from '@/lib/avatars';
import { createProfile } from '@/app/actions/profiles';

type CreateProfileModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
};

type AgeGroupOption = {
  value: AgeGroup;
  label: string;
  description: string;
  emoji: string;
};

const AGE_GROUP_OPTIONS: AgeGroupOption[] = [
  {
    value: AgeGroup.TODDLER,
    label: 'Toddler',
    description: '2-4 years',
    emoji: '👶',
  },
  {
    value: AgeGroup.CHILD,
    label: 'Child',
    description: '5-8 years',
    emoji: '🧒',
  },
  {
    value: AgeGroup.TWEEN,
    label: 'Tween',
    description: '9-12 years',
    emoji: '🧑',
  },
  {
    value: AgeGroup.TEEN,
    label: 'Teen',
    description: '13-17 years',
    emoji: '🧑‍🎨',
  },
  { value: AgeGroup.ADULT, label: 'Adult', description: '18+', emoji: '🎨' },
];

const CreateProfileModal = ({
  open,
  onOpenChange,
  onSuccess,
}: CreateProfileModalProps) => {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [name, setName] = useState('');
  const [ageGroup, setAgeGroup] = useState<AgeGroup>(AgeGroup.CHILD);
  const [avatarId, setAvatarId] = useState(DEFAULT_AVATAR_ID);
  const [error, setError] = useState<string | null>(null);

  const selectableAvatars = getSelectableAvatars();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      setError('Please enter a name');
      return;
    }

    setError(null);

    startTransition(async () => {
      const result = await createProfile({
        name: name.trim(),
        avatarId,
        ageGroup,
      });

      if (result.error) {
        setError(result.error);
        return;
      }

      // Reset form
      setName('');
      setAgeGroup(AgeGroup.CHILD);
      setAvatarId(DEFAULT_AVATAR_ID);

      // Refresh and close
      router.refresh();
      onOpenChange(false);
      onSuccess?.();
    });
  };

  const handleClose = () => {
    if (!isPending) {
      setName('');
      setAgeGroup(AgeGroup.CHILD);
      setAvatarId(DEFAULT_AVATAR_ID);
      setError(null);
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Profile</DialogTitle>
          <DialogDescription>
            Add a new profile for someone in your family
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 mt-4">
          {/* Name input */}
          <div>
            <label
              htmlFor="profile-name"
              className="block font-tondo font-bold text-sm text-text-secondary mb-2"
            >
              Name
            </label>
            <input
              id="profile-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Emma"
              maxLength={20}
              className={cn(
                'w-full px-4 py-3 rounded-xl',
                'border-2 border-paper-cream-dark',
                'font-tondo text-lg text-text-primary',
                'placeholder:text-gray-400',
                'focus:outline-none focus:border-crayon-orange focus:ring-2 focus:ring-crayon-orange/20',
                'transition-all duration-200',
              )}
              disabled={isPending}
            />
          </div>

          {/* Age group selector */}
          <div>
            <label className="block font-tondo font-bold text-sm text-text-secondary mb-2">
              Age Group
            </label>
            <div className="grid grid-cols-5 gap-2">
              {AGE_GROUP_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setAgeGroup(option.value)}
                  disabled={isPending}
                  className={cn(
                    'flex flex-col items-center gap-1 p-2 rounded-xl',
                    'border-2 transition-all duration-200',
                    'hover:scale-105 active:scale-95',
                    ageGroup === option.value
                      ? 'border-crayon-orange bg-crayon-orange/10'
                      : 'border-paper-cream-dark hover:border-gray-300',
                  )}
                >
                  <span className="text-2xl">{option.emoji}</span>
                  <span
                    className={cn(
                      'font-tondo text-xs font-bold',
                      ageGroup === option.value
                        ? 'text-crayon-orange'
                        : 'text-text-secondary',
                    )}
                  >
                    {option.label}
                  </span>
                </button>
              ))}
            </div>
            <p className="mt-2 text-xs text-gray-500 text-center">
              {AGE_GROUP_OPTIONS.find((o) => o.value === ageGroup)?.description}
            </p>
          </div>

          {/* Avatar picker */}
          <div>
            <label className="block font-tondo font-bold text-sm text-text-secondary mb-2">
              Avatar
            </label>
            <div className="grid grid-cols-5 gap-3">
              {selectableAvatars.map((avatar) => (
                <button
                  key={avatar.id}
                  type="button"
                  onClick={() => setAvatarId(avatar.id)}
                  disabled={isPending}
                  className={cn(
                    'relative rounded-full p-1',
                    'transition-all duration-200',
                    'hover:scale-110 active:scale-95',
                    avatarId === avatar.id && 'ring-4 ring-crayon-orange',
                  )}
                >
                  <ProfileAvatar
                    avatarId={avatar.id}
                    name={name || '?'}
                    size="sm"
                  />
                  {avatarId === avatar.id && (
                    <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-crayon-orange rounded-full flex items-center justify-center">
                      <svg
                        className="w-3 h-3 text-white"
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
                </button>
              ))}
            </div>
          </div>

          {/* Error message */}
          {error && <p className="text-red-500 text-sm text-center">{error}</p>}

          {/* Submit button */}
          <button
            type="submit"
            disabled={isPending || !name.trim()}
            className={cn(
              'w-full py-3 px-6 rounded-full',
              'font-tondo font-bold text-lg text-white',
              'bg-crayon-orange shadow-btn-primary',
              'hover:shadow-btn-primary-hover hover:scale-105',
              'active:scale-95 transition-all duration-200',
              'disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100',
              'focus:outline-none focus-visible:ring-4 focus-visible:ring-crayon-orange/50',
            )}
          >
            {isPending ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Creating...
              </span>
            ) : (
              'Create Profile'
            )}
          </button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CreateProfileModal;

'use client';

import { useState, useTransition, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { AgeGroup, Difficulty } from '@chunky-crayon/db/types';
import cn from '@/utils/cn';
import { Button } from '@/components/ui/button';
import ProfileAvatar from '@/components/ProfileAvatar/ProfileAvatar';
import DifficultySlider from '@/components/DifficultySlider/DifficultySlider';
import { getSelectableAvatars } from '@/lib/avatars';
import {
  updateProfile,
  deleteProfile,
  type ProfileWithStats,
} from '@/app/actions/profiles';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

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

// Age group to default difficulty mapping
const AGE_GROUP_DEFAULTS: Record<AgeGroup, Difficulty> = {
  [AgeGroup.TODDLER]: Difficulty.BEGINNER,
  [AgeGroup.CHILD]: Difficulty.BEGINNER,
  [AgeGroup.TWEEN]: Difficulty.INTERMEDIATE,
  [AgeGroup.TEEN]: Difficulty.ADVANCED,
  [AgeGroup.ADULT]: Difficulty.EXPERT,
};

type ProfileEditFormProps = {
  profile: ProfileWithStats;
  canDelete: boolean;
};

const ProfileEditForm = ({ profile, canDelete }: ProfileEditFormProps) => {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  // Form state
  const [name, setName] = useState(profile.name);
  const [ageGroup, setAgeGroup] = useState<AgeGroup>(profile.ageGroup);
  const [avatarId, setAvatarId] = useState(profile.avatarId);
  const [difficulty, setDifficulty] = useState<Difficulty>(profile.difficulty);
  const [useRecommendedDifficulty, setUseRecommendedDifficulty] = useState(
    profile.difficulty === AGE_GROUP_DEFAULTS[profile.ageGroup],
  );
  const [error, setError] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  const selectableAvatars = getSelectableAvatars();

  // Track changes
  useEffect(() => {
    const changed =
      name !== profile.name ||
      ageGroup !== profile.ageGroup ||
      avatarId !== profile.avatarId ||
      difficulty !== profile.difficulty;
    setHasChanges(changed);
  }, [name, ageGroup, avatarId, difficulty, profile]);

  // When age group changes with "use recommended" enabled, update difficulty
  useEffect(() => {
    if (useRecommendedDifficulty) {
      setDifficulty(AGE_GROUP_DEFAULTS[ageGroup]);
    }
  }, [ageGroup, useRecommendedDifficulty]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      setError('Please enter a name');
      return;
    }

    setError(null);

    startTransition(async () => {
      const result = await updateProfile(profile.id, {
        name: name.trim(),
        avatarId,
        ageGroup,
        difficulty,
      });

      if (result.error) {
        setError(result.error);
        toast.error(result.error);
        return;
      }

      toast.success('Profile updated!');
      router.refresh();
    });
  };

  const handleDelete = () => {
    startTransition(async () => {
      const result = await deleteProfile(profile.id);

      if (result.error) {
        toast.error(result.error);
        setShowDeleteDialog(false);
        return;
      }

      toast.success(`"${profile.name}" deleted`);
      router.push('/account/profiles');
      router.refresh();
    });
  };

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Profile preview */}
        <div className="flex flex-col items-center gap-4 p-6 bg-paper-cream rounded-2xl">
          <ProfileAvatar avatarId={avatarId} name={name} size="lg" />
          <div className="text-center">
            <h2 className="font-tondo font-bold text-xl">
              {name || 'Unnamed'}
            </h2>
            <p className="text-sm text-muted-foreground">
              {AGE_GROUP_OPTIONS.find((o) => o.value === ageGroup)?.description}
            </p>
          </div>
        </div>

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

        {/* Difficulty slider */}
        <div>
          <label className="block font-tondo font-bold text-sm text-text-secondary mb-3">
            Difficulty Level
          </label>
          <DifficultySlider
            value={difficulty}
            onChange={setDifficulty}
            ageGroup={ageGroup}
            useRecommended={useRecommendedDifficulty}
            onUseRecommendedChange={setUseRecommendedDifficulty}
            disabled={isPending}
          />
        </div>

        {/* Error message */}
        {error && <p className="text-red-500 text-sm text-center">{error}</p>}

        {/* Action buttons */}
        <div className="flex flex-col gap-3">
          <button
            type="submit"
            disabled={isPending || !name.trim() || !hasChanges}
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
                Saving...
              </span>
            ) : (
              'Save Changes'
            )}
          </button>

          <Button
            type="button"
            variant="outline"
            onClick={() => router.push('/account/profiles')}
            disabled={isPending}
            className="w-full"
          >
            Cancel
          </Button>
        </div>

        {/* Delete section */}
        {canDelete && (
          <div className="pt-6 border-t border-gray-200">
            <h3 className="font-tondo font-bold text-sm text-red-600 mb-2">
              Danger Zone
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              Deleting this profile will remove it permanently. Coloring pages
              created by this profile will remain in your account.
            </p>
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowDeleteDialog(true)}
              disabled={isPending}
              className="text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300"
            >
              Delete Profile
            </Button>
          </div>
        )}
      </form>

      {/* Delete confirmation dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Profile?</DialogTitle>
            <DialogDescription asChild>
              <div className="space-y-4">
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <ProfileAvatar
                    avatarId={profile.avatarId}
                    name={profile.name}
                    size="sm"
                  />
                  <div>
                    <p className="font-tondo font-bold">{profile.name}</p>
                    <p className="text-sm text-gray-500">
                      {profile._count.coloringImages} coloring page
                      {profile._count.coloringImages === 1 ? '' : 's'}
                    </p>
                  </div>
                </div>
                <p>
                  This will permanently delete the profile. Coloring pages
                  created by this profile will remain in your account.
                </p>
              </div>
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-3 mt-6">
            <Button
              variant="outline"
              onClick={() => setShowDeleteDialog(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={handleDelete}
              disabled={isPending}
              className="bg-red-500 hover:bg-red-600 text-white"
            >
              {isPending ? 'Deleting...' : 'Delete Profile'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ProfileEditForm;

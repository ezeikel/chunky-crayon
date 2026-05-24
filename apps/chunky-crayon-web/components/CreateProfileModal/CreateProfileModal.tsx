'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faBaby,
  faChild,
  faChildReaching,
  faGamepad,
  faPalette,
  faUserPlus,
  faSpinnerThird,
  faCheck,
} from '@fortawesome/pro-duotone-svg-icons';
import type { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import { AgeGroup } from '@one-colored-pixel/db/types';
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
  labelKey: 'toddler' | 'child' | 'tween' | 'teen' | 'adult';
  descriptionKey:
    | 'toddlerDescription'
    | 'childDescription'
    | 'tweenDescription'
    | 'teenDescription'
    | 'adultDescription';
  icon: IconDefinition;
  color: string;
};

const AGE_GROUP_OPTIONS: AgeGroupOption[] = [
  {
    value: AgeGroup.TODDLER,
    labelKey: 'toddler',
    descriptionKey: 'toddlerDescription',
    icon: faBaby,
    color: 'text-crayon-purple',
  },
  {
    value: AgeGroup.CHILD,
    labelKey: 'child',
    descriptionKey: 'childDescription',
    icon: faChild,
    color: 'text-crayon-orange',
  },
  {
    value: AgeGroup.TWEEN,
    labelKey: 'tween',
    descriptionKey: 'tweenDescription',
    icon: faChildReaching,
    color: 'text-crayon-pink',
  },
  {
    value: AgeGroup.TEEN,
    labelKey: 'teen',
    descriptionKey: 'teenDescription',
    icon: faGamepad,
    color: 'text-crayon-blue',
  },
  {
    value: AgeGroup.ADULT,
    labelKey: 'adult',
    descriptionKey: 'adultDescription',
    icon: faPalette,
    color: 'text-crayon-green',
  },
];

const CreateProfileModal = ({
  open,
  onOpenChange,
  onSuccess,
}: CreateProfileModalProps) => {
  const router = useRouter();
  const t = useTranslations('profiles');
  const tAgeGroups = useTranslations('profiles.ageGroups');
  const [isPending, startTransition] = useTransition();

  const [name, setName] = useState('');
  const [ageGroup, setAgeGroup] = useState<AgeGroup>(AgeGroup.CHILD);
  const [avatarId, setAvatarId] = useState(DEFAULT_AVATAR_ID);
  const [error, setError] = useState<string | null>(null);

  const selectableAvatars = getSelectableAvatars();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      setError(t('create.nameError'));
      return;
    }

    setError(null);

    startTransition(async () => {
      const result = await createProfile({
        name: name.trim(),
        avatarId,
        ageGroup,
      });

      if ('error' in result) {
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

  // Description for the selected age group — same content as the old
  // standalone <p>, hoisted so the JSX reads cleanly.
  const ageGroupDescription = tAgeGroups(
    AGE_GROUP_OPTIONS.find((o) => o.value === ageGroup)?.descriptionKey ??
      'childDescription',
  );

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      {/* max-w-lg + tighter overflow scroll. Matches PaywallModal /
          ParentalGate / FeedbackDialog kid-modal chrome: icon-in-circle
          header badge, friendly title, chunky tap targets. */}
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader className="items-center gap-3 text-center">
          {/* Header badge — same recipe as the other CC modals. */}
          <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-crayon-orange/10">
            <FontAwesomeIcon
              icon={faUserPlus}
              className="text-3xl"
              style={
                {
                  '--fa-primary-color': 'hsl(var(--crayon-orange))',
                  '--fa-secondary-color': 'hsl(var(--crayon-yellow))',
                  '--fa-secondary-opacity': '1',
                } as React.CSSProperties
              }
            />
          </div>
          <DialogTitle className="font-tondo text-2xl font-bold text-text-primary md:text-3xl">
            {t('create.title')}
          </DialogTitle>
          <DialogDescription className="text-base text-text-secondary">
            {t('create.subtitle')}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="mt-2 space-y-6">
          {/* Name input — chunkier rounded-2xl, larger padding, tondo
              as the value typography so the kid's name reads as the
              friendly tile inscription it is. */}
          <div>
            <label
              htmlFor="profile-name"
              className="block font-tondo font-bold text-sm text-text-secondary mb-2"
            >
              {t('create.nameLabel')}
            </label>
            <input
              id="profile-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('create.namePlaceholder')}
              maxLength={20}
              className={cn(
                'w-full rounded-2xl border-2 border-paper-cream-dark px-4 py-3 font-tondo text-lg text-text-primary',
                'placeholder:text-gray-400',
                'focus:outline-none focus:border-crayon-orange focus:ring-2 focus:ring-crayon-orange/20',
                'transition-all duration-200',
              )}
              disabled={isPending}
            />
          </div>

          {/* Age group selector — kept shape, tightened spacing. */}
          <div>
            <label className="block font-tondo font-bold text-sm text-text-secondary mb-2">
              {t('create.ageGroupLabel')}
            </label>
            <div className="grid grid-cols-5 gap-2">
              {AGE_GROUP_OPTIONS.map((option) => {
                const isActive = ageGroup === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setAgeGroup(option.value)}
                    disabled={isPending}
                    className={cn(
                      'flex flex-col items-center gap-1 rounded-2xl border-2 p-2 transition-all duration-200',
                      'hover:scale-105 active:scale-95',
                      isActive
                        ? 'border-crayon-orange bg-crayon-orange/10'
                        : 'border-paper-cream-dark hover:border-gray-300',
                    )}
                    aria-pressed={isActive}
                  >
                    <FontAwesomeIcon
                      icon={option.icon}
                      className={cn(
                        'text-2xl',
                        isActive ? 'text-crayon-orange' : option.color,
                      )}
                    />
                    <span
                      className={cn(
                        'font-tondo text-xs font-bold',
                        isActive ? 'text-crayon-orange' : 'text-text-secondary',
                      )}
                    >
                      {tAgeGroups(option.labelKey)}
                    </span>
                  </button>
                );
              })}
            </div>
            <p className="mt-2 text-center text-xs text-gray-500">
              {ageGroupDescription}
            </p>
          </div>

          {/* Avatar picker — 4 cols × 3 rows of illustrated tiles.
              Each tile uses ProfileAvatar size='md' (64px) so the
              illustrations read at a glance. Selected state is a
              chunky orange ring + a check chip in the corner — same
              affordance the Character Builder species tiles use. */}
          <div>
            <label className="block font-tondo font-bold text-sm text-text-secondary mb-3">
              {t('create.avatarLabel')}
            </label>
            <div className="grid grid-cols-4 gap-3">
              {selectableAvatars.map((avatar) => {
                const isActive = avatarId === avatar.id;
                return (
                  <button
                    key={avatar.id}
                    type="button"
                    onClick={() => setAvatarId(avatar.id)}
                    disabled={isPending}
                    aria-label={avatar.name}
                    aria-pressed={isActive}
                    className={cn(
                      'relative flex items-center justify-center rounded-full p-1 transition-all duration-200',
                      'hover:scale-110 active:scale-95',
                      isActive && 'ring-4 ring-crayon-orange',
                    )}
                  >
                    <ProfileAvatar
                      avatarId={avatar.id}
                      name={avatar.name}
                      size="md"
                    />
                    {isActive && (
                      <div className="absolute -bottom-1 -right-1 flex size-6 items-center justify-center rounded-full bg-crayon-orange shadow-sm">
                        <FontAwesomeIcon
                          icon={faCheck}
                          className="text-xs text-white"
                        />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Error message — kept inline + simple. */}
          {error && (
            <p className="text-center text-sm text-crayon-pink">{error}</p>
          )}

          {/* Submit pill — same brand-orange chunky pill the rest of
              the CC modal kit uses. */}
          <button
            type="submit"
            disabled={isPending || !name.trim()}
            className={cn(
              'inline-flex w-full items-center justify-center gap-2 rounded-full bg-crayon-orange px-6 py-3.5 font-tondo text-lg font-bold text-white shadow-btn-primary',
              'transition-all duration-200 hover:scale-105 hover:shadow-btn-primary-hover active:scale-95',
              'disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100',
              'focus:outline-none focus-visible:ring-4 focus-visible:ring-crayon-orange/50',
            )}
          >
            {isPending ? (
              <>
                <FontAwesomeIcon
                  icon={faSpinnerThird}
                  className="animate-spin"
                />
                {t('create.creating')}
              </>
            ) : (
              <>
                <FontAwesomeIcon icon={faUserPlus} />
                {t('create.button')}
              </>
            )}
          </button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CreateProfileModal;

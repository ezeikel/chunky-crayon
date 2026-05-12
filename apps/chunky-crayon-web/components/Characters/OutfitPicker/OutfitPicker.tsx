'use client';

/**
 * Outfit picker for the character profile page.
 *
 * Horizontal scroll of tiles, one per outfit in OUTFIT_LIBRARY plus a
 * leading "No outfit" tile.
 *
 *   - Unlocked outfit, equipped : highlighted, tap = unequip (clear).
 *   - Unlocked outfit, not equipped : tap = equip immediately.
 *   - Locked outfit : tap = unlock flow (5 credits) → auto-equip on success.
 *
 * Optimistic updates: the parent Cockpit tracks `equipped`/`unlocked`
 * state and we lift changes via onEquip/onUnlock. Server is the source
 * of truth — failures roll back via a router.refresh() in the catch.
 */

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faLock } from '@fortawesome/pro-duotone-svg-icons';
import cn from '@/utils/cn';
import { trackEvent } from '@/utils/analytics-client';
import { TRACKING_EVENTS } from '@/constants';
import { equipOutfit, unlockOutfit } from '@/app/actions/character-actions';
import type { OutfitDefinition, OutfitKey } from '@/lib/characters/outfits';

type Outfit = { key: string; imageUrl: string };

type Props = {
  characterId: string;
  library: readonly OutfitDefinition[];
  unlockedKeys: ReadonlySet<OutfitKey>;
  equippedKey: string | null;
  onEquip: (outfit: Outfit | null) => void;
  onUnlock: (outfit: Outfit) => void;
};

const OutfitPicker = ({
  characterId,
  library,
  unlockedKeys,
  equippedKey,
  onEquip,
  onUnlock,
}: Props) => {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleClear = () => {
    setError(null);
    startTransition(async () => {
      const previous = equippedKey;
      onEquip(null); // optimistic
      const result = await equipOutfit(characterId, null);
      if (!result.ok) {
        // Roll back via server refresh — cheap and avoids drift.
        setError('Could not save your change. Try again.');
        router.refresh();
        void previous;
      }
    });
  };

  const handleEquip = (outfit: OutfitDefinition) => {
    setError(null);
    startTransition(async () => {
      onEquip({ key: outfit.key, imageUrl: outfit.imagePath }); // optimistic
      const result = await equipOutfit(characterId, outfit.key);
      if (!result.ok) {
        setError('Could not save your change. Try again.');
        router.refresh();
      }
    });
  };

  const handleUnlock = (outfit: OutfitDefinition) => {
    setError(null);
    startTransition(async () => {
      const result = await unlockOutfit(characterId, outfit.key);
      if (result.ok) {
        trackEvent(TRACKING_EVENTS.CHARACTER_OUTFIT_UNLOCKED, {
          characterId,
          outfitKey: outfit.key,
          creditsSpent: outfit.unlockCost,
        });
        onUnlock({ key: outfit.key, imageUrl: outfit.imagePath });
        // unlockOutfit doesn't auto-equip server-side — fire an equip
        // call too so the picker reflects the new state instantly.
        const equipResult = await equipOutfit(characterId, outfit.key);
        if (equipResult.ok) {
          trackEvent(TRACKING_EVENTS.CHARACTER_DRESSED, {
            characterId,
            outfitKey: outfit.key,
          });
        }
      } else if (result.error === 'insufficient_credits') {
        setError(
          `You need ${outfit.unlockCost} credits to unlock this. You have ${result.balance ?? 0}.`,
        );
      } else if (result.error === 'already_unlocked') {
        // Should never reach here from the UI; refresh to resync.
        router.refresh();
      } else {
        setError("We couldn't unlock that. Try again.");
      }
    });
  };

  return (
    <section>
      <h2 className="text-xs uppercase tracking-wider text-neutral-500 mb-2">
        Outfits
      </h2>
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
        {/* No outfit pill */}
        <button
          type="button"
          onClick={handleClear}
          aria-pressed={equippedKey === null}
          disabled={pending}
          className={cn(
            'shrink-0 w-24 h-28 rounded-2xl border-2 flex flex-col items-center justify-center gap-1 transition-colors min-h-[112px]',
            equippedKey === null
              ? 'border-crayon-orange bg-crayon-orange/10 text-crayon-orange'
              : 'border-paper-cream-dark bg-white text-neutral-600 hover:border-crayon-orange',
          )}
        >
          <span className="text-2xl">∅</span>
          <span className="text-xs font-bold">No outfit</span>
        </button>

        {library.map((outfit) => {
          const isUnlocked = unlockedKeys.has(outfit.key);
          const isEquipped = equippedKey === outfit.key;
          return (
            <button
              type="button"
              key={outfit.key}
              onClick={() =>
                isUnlocked ? handleEquip(outfit) : handleUnlock(outfit)
              }
              aria-pressed={isEquipped}
              disabled={pending}
              className={cn(
                'shrink-0 w-24 h-28 rounded-2xl border-2 flex flex-col items-center justify-between p-2 transition-all',
                isEquipped
                  ? 'border-crayon-orange bg-crayon-orange/10 scale-105'
                  : 'border-paper-cream-dark bg-white hover:border-crayon-orange',
                !isUnlocked && 'text-neutral-500',
              )}
            >
              <div className="flex-1 flex items-center justify-center w-full">
                {isUnlocked ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={outfit.imagePath}
                    alt=""
                    className="max-h-12"
                    onError={(e) => {
                      // Outfit SVG isn't bundled yet; show fallback.
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                ) : (
                  <FontAwesomeIcon
                    icon={faLock}
                    className="text-2xl text-neutral-400"
                  />
                )}
              </div>
              <span className="text-xs font-bold truncate w-full text-center">
                {outfit.label}
              </span>
              {!isUnlocked ? (
                <span className="text-[10px] text-neutral-500">
                  {outfit.unlockCost} credits
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      {error ? (
        <p className="mt-2 text-xs text-red-700" role="alert">
          {error}
        </p>
      ) : null}
    </section>
  );
};

export default OutfitPicker;

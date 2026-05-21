'use client';

/**
 * CharacterCockpit — the interactive surface of /characters/[id].
 *
 * Layout (mobile-first, scaled up):
 *
 *   ┌─────────────────────────────┐
 *   │       big portrait          │  (+ equipped outfit overlay)
 *   │                             │
 *   │           name              │
 *   │          species            │
 *   │                             │
 *   │  [Feed] [Exercise] [Dress]  │  (cosmetic action pills)
 *   │                             │
 *   │  ─ Outfit picker (chunky)   │
 *   │                             │
 *   │  ─ Voice pad (preset + custom)
 *   └─────────────────────────────┘
 *
 * Cosmetic actions (Feed/Exercise/Dress) are purely UI: bounce + play the
 * matching preset voice line. No meters, no decay — kids never see a
 * 'sad' character.
 *
 * Outfit picker handles its own equip / unlock flows via server actions;
 * the cockpit just renders state.
 *
 * Voice pad fetches the preset URL lazily on first play, then caches in
 * component state.
 */

import { useState } from 'react';
import Image from 'next/image';
import { trackEvent } from '@/utils/analytics-client';
import { TRACKING_EVENTS } from '@/constants';
import { OUTFIT_LIBRARY, type OutfitKey } from '@/lib/characters/outfits';
import OutfitPicker from '@/components/Characters/OutfitPicker/OutfitPicker';
import VoicePad from '@/components/Characters/VoicePad/VoicePad';
import cn from '@/utils/cn';
import { playPresetVoiceLine } from '@/app/actions/character-actions';

type Outfit = { key: string; imageUrl: string };

type Props = {
  id: string;
  name: string;
  species: string;
  portraitLineArtUrl: string | null;
  portraitUrl: string | null;
  voicePersona: string | null;
  equippedOutfit: Outfit | null;
  unlockedOutfits: Outfit[];
};

const CharacterCockpit = (props: Props) => {
  // Local equipped state — server is the source of truth, but optimistic
  // updates keep the picker feeling snappy.
  const [equipped, setEquipped] = useState<Outfit | null>(props.equippedOutfit);
  const [unlocked, setUnlocked] = useState<Outfit[]>(props.unlockedOutfits);
  const [bouncing, setBouncing] = useState<
    null | 'feed' | 'exercise' | 'dress'
  >(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);

  const portrait = props.portraitLineArtUrl ?? props.portraitUrl;

  // Each cosmetic action plays its preset voice line + triggers the bounce
  // animation. We don't track meter state — purely cosmetic by design.
  const triggerCosmetic = async (
    kind: 'feed' | 'exercise' | 'dress',
    slot: 'feed' | 'exercise' | 'dress',
  ) => {
    setBouncing(kind);
    // Reset after the animation completes (CSS class duration: 400ms).
    window.setTimeout(() => setBouncing(null), 500);

    const event =
      kind === 'feed'
        ? TRACKING_EVENTS.CHARACTER_FED
        : kind === 'exercise'
          ? TRACKING_EVENTS.CHARACTER_EXERCISED
          : TRACKING_EVENTS.CHARACTER_DRESSED;
    trackEvent(event as never, { characterId: props.id } as never);

    const result = await playPresetVoiceLine(props.id, slot);
    if (result.ok) {
      setAudioUrl(result.url);
      // Play immediately — the <audio> element below auto-plays on src change.
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <div
          className={cn(
            'relative mx-auto w-64 h-64 md:w-80 md:h-80 rounded-3xl border-2 border-paper-cream-dark bg-white shadow-card overflow-hidden',
            bouncing && 'animate-bounce',
          )}
        >
          {portrait ? (
            // R2-hosted portrait, rendered at 256–320px. next/image
            // serves a size-appropriate variant and lazy-loads if the
            // cockpit isn't immediately on-screen.
            <Image
              src={portrait}
              alt={`${props.name}, a ${props.species}`}
              fill
              sizes="(max-width: 768px) 256px, 320px"
              className="object-contain p-4"
              priority
            />
          ) : null}
          {/* Equipped outfit overlay — sits on top of the portrait. */}
          {equipped ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={equipped.imageUrl}
              alt=""
              className="absolute inset-0 w-full h-full object-contain p-4 pointer-events-none"
            />
          ) : null}
        </div>

        <h1 className="font-display text-3xl md:text-4xl mt-4">{props.name}</h1>
        <p className="text-sm text-neutral-500 capitalize">{props.species}</p>
      </div>

      {/* Cosmetic action pills */}
      <div className="flex justify-center gap-2 md:gap-3 flex-wrap">
        <button
          type="button"
          onClick={() => triggerCosmetic('feed', 'feed')}
          className="rounded-full bg-crayon-orange text-white px-5 py-3 text-base font-bold min-h-[44px] hover:scale-105 active:scale-95 transition-transform"
        >
          Feed
        </button>
        <button
          type="button"
          onClick={() => triggerCosmetic('exercise', 'exercise')}
          className="rounded-full bg-crayon-teal text-white px-5 py-3 text-base font-bold min-h-[44px] hover:scale-105 active:scale-95 transition-transform"
        >
          Exercise
        </button>
        <button
          type="button"
          onClick={() => triggerCosmetic('dress', 'dress')}
          className="rounded-full bg-crayon-purple text-white px-5 py-3 text-base font-bold min-h-[44px] hover:scale-105 active:scale-95 transition-transform"
        >
          Dress
        </button>
      </div>

      {/* Outfit picker — unlocks + equips. Equipped state mirrored locally
          so taps feel instant. */}
      <OutfitPicker
        characterId={props.id}
        library={OUTFIT_LIBRARY}
        unlockedKeys={
          new Set<OutfitKey>(unlocked.map((o) => o.key as OutfitKey))
        }
        equippedKey={equipped?.key ?? null}
        onEquip={(outfit) => setEquipped(outfit)}
        onUnlock={(outfit) => {
          setUnlocked((prev) => [...prev, outfit]);
          setEquipped(outfit); // auto-equip on unlock — instant gratification
        }}
      />

      {/* Voice pad — 4 presets + parent-gated custom input */}
      <VoicePad
        characterId={props.id}
        name={props.name}
        voicePersona={props.voicePersona}
      />

      {/* Hidden audio element shared by cosmetic pill triggers. The
          VoicePad has its own element for explicit playback. We swap
          src + auto-play so kids hear immediate feedback. */}
      {audioUrl ? (
        // eslint-disable-next-line jsx-a11y/media-has-caption
        <audio src={audioUrl} autoPlay className="hidden" />
      ) : null}
    </div>
  );
};

export default CharacterCockpit;

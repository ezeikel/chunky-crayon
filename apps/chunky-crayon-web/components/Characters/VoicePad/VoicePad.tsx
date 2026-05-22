'use client';

/**
 * VoicePad — 4 preset slots (hi/feed/exercise/bye) + parent-gated custom
 * free-text input.
 *
 * Why hi/feed/exercise/bye and not the full hi/feed/exercise/dress/bye?
 * "dress" already gets triggered automatically when the user equips an
 * outfit. Having a separate Dress pill duplicates the audio without new
 * intent, and pads the UI. We still keep the slot in the data model in
 * case it's useful for the cosmetic Dress action button on the Cockpit
 * (which fires playPresetVoiceLine('dress')).
 *
 * Audio playback: single <audio> element re-used across the four pills
 * and the custom input. Swapping src while playing cancels the previous
 * line — desirable, kids will mash the buttons.
 */

import { useRef, useState, useTransition } from 'react';
import { trackEvent } from '@/utils/analytics-client';
import { TRACKING_EVENTS, CHARACTER_LIMITS } from '@/constants';
import {
  generateCustomVoiceLine,
  playPresetVoiceLine,
} from '@/app/actions/character-actions';
import { useParentalGate } from '@/components/ParentalGate';
import { issueParentGateToken } from '@/app/actions/parent-gate';
import cn from '@/utils/cn';

type PresetSlot = 'hi' | 'feed' | 'exercise' | 'bye';

const PRESET_PILLS: { slot: PresetSlot; label: string }[] = [
  { slot: 'hi', label: 'Say hi' },
  { slot: 'feed', label: 'Yum!' },
  { slot: 'exercise', label: 'Whoosh!' },
  { slot: 'bye', label: 'Bye!' },
];

type Props = {
  characterId: string;
  name: string;
  voicePersona: string | null;
};

const VoicePad = ({ characterId, name }: Props) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [activeSlot, setActiveSlot] = useState<PresetSlot | 'custom' | null>(
    null,
  );
  const [customText, setCustomText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const { openGate } = useParentalGate();
  const [pending, startTransition] = useTransition();

  const playUrl = (url: string) => {
    if (!audioRef.current) return;
    audioRef.current.pause();
    audioRef.current.src = url;
    // Browsers occasionally reject autoplay; muted handoff isn't needed
    // because the audio is triggered by a tap (user gesture).
    void audioRef.current.play().catch(() => {});
  };

  const handlePreset = (slot: PresetSlot) => {
    setError(null);
    setActiveSlot(slot);
    startTransition(async () => {
      const result = await playPresetVoiceLine(characterId, slot);
      if (result.ok) {
        playUrl(result.url);
        trackEvent(TRACKING_EVENTS.CHARACTER_VOICE_PLAYED, {
          characterId,
          slot,
          cached: result.cached,
        });
        if (!result.cached) {
          trackEvent(TRACKING_EVENTS.CHARACTER_VOICE_GENERATED, {
            characterId,
            slot,
            isCustom: false,
          });
        }
      } else {
        setError(`${name} is thinking. Try again in a moment.`);
      }
    });
  };

  // "Say it" → shared tap-math parent-gate modal. On pass we mint a
  // scope-bound token and run the gated server action. Mirrors the
  // create-form's InputModeSelector — one gate UX across the app.
  const handleSayItTapped = () => {
    if (!customText.trim()) return;
    openGate({
      reason: 'character_custom_voice',
      onSuccess: async () => {
        const issued = await issueParentGateToken('character:voice-custom');
        if (!issued.ok) {
          setError('The grown-up check needs to pass again.');
          return;
        }
        handleCustomSubmit(issued.token);
      },
    });
  };

  const handleCustomSubmit = (token: string) => {
    setError(null);
    const text = customText.trim();
    if (!text) return;
    setActiveSlot('custom');
    startTransition(async () => {
      const result = await generateCustomVoiceLine(characterId, text, token);
      if (result.ok) {
        playUrl(result.url);
        setCustomText('');
        trackEvent(TRACKING_EVENTS.CHARACTER_VOICE_GENERATED, {
          characterId,
          slot: 'custom',
          isCustom: true,
        });
      } else {
        const friendly: Record<string, string> = {
          not_found: "We couldn't find this friend.",
          invalid_input: 'Lines must be 1 to 80 characters.',
          parent_gate_required: 'The grown-up check needs to pass again.',
          moderation_blocked: "We can't use that one. Try different words.",
          insufficient_credits: 'Not enough credits to make this line.',
          synthesis_failed: 'Something went wrong. Try again in a moment.',
        };
        setError(friendly[result.error] ?? 'Something went wrong.');
      }
    });
  };

  return (
    <section>
      <h2 className="text-xs uppercase tracking-wider text-neutral-500 mb-2">
        Voice
      </h2>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        {PRESET_PILLS.map((p) => (
          <button
            type="button"
            key={p.slot}
            onClick={() => handlePreset(p.slot)}
            disabled={pending}
            className={cn(
              'rounded-2xl px-3 py-3 text-sm border-2 min-h-[56px] font-bold transition-colors',
              activeSlot === p.slot
                ? 'border-crayon-orange bg-crayon-orange/10 text-crayon-orange'
                : 'border-paper-cream-dark bg-white text-neutral-700 hover:border-crayon-orange',
            )}
          >
            {p.label}
          </button>
        ))}
      </div>

      <div className="mt-4">
        <label className="block">
          <span className="block text-xs uppercase tracking-wider text-neutral-500 mb-1">
            Make {name} say something (grown-ups only)
          </span>
          <div className="flex gap-2">
            <input
              type="text"
              value={customText}
              onChange={(e) =>
                setCustomText(
                  e.target.value.slice(
                    0,
                    CHARACTER_LIMITS.CUSTOM_VOICE_MAX_CHARS,
                  ),
                )
              }
              maxLength={CHARACTER_LIMITS.CUSTOM_VOICE_MAX_CHARS}
              placeholder={`Hello, I'm ${name}!`}
              className="flex-1 rounded-2xl border-2 border-paper-cream-dark px-3 py-2 text-sm"
            />
            <button
              type="button"
              onClick={handleSayItTapped}
              disabled={pending || customText.trim().length === 0}
              className="rounded-2xl bg-black text-white px-4 py-2 text-sm font-bold disabled:opacity-50"
            >
              Say it
            </button>
          </div>
          <span className="block text-[10px] text-neutral-400 mt-1">
            {customText.length}/{CHARACTER_LIMITS.CUSTOM_VOICE_MAX_CHARS}
            {' · '}
            {CHARACTER_LIMITS.CUSTOM_VOICE_CREDIT_COST} credit per line
          </span>
        </label>
      </div>

      {error ? (
        <p className="mt-2 text-xs text-red-700" role="alert">
          {error}
        </p>
      ) : null}

      {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
      <audio ref={audioRef} className="hidden" />
    </section>
  );
};

export default VoicePad;

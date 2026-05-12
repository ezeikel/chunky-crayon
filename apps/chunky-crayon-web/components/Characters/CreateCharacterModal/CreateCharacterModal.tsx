'use client';

/**
 * Four-step character create flow.
 *
 *   1. Parent gate — HMAC token minting via <ParentGate />.
 *   2. Name + species pill picker.
 *   3. Short prompt (≤ 240 chars) with example prompt pills.
 *   4. Voice persona picker.
 *
 * Then submits to `createCharacter`. On success: closes the modal and lets
 * the parent (the page) revalidate. On failure: shows the inline error
 * so the parent can retry without losing typed input.
 *
 * No em dashes. No "AI" word. US/UK-neutral copy. Tap targets ≥ 44pt.
 */

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import ParentGate from '@/components/ParentGate/ParentGate';
import { createCharacter } from '@/app/actions/characters';
import { trackEvent } from '@/utils/analytics-client';
import { TRACKING_EVENTS, CHARACTER_LIMITS } from '@/constants';
import cn from '@/utils/cn';

type Props = {
  open: boolean;
  onClose: () => void;
};

type Step = 'gate' | 'name' | 'prompt' | 'voice';

// Curated species pills. Order matters: first is the kid-favourite default;
// last is the catch-all open-ended option. Keep this list ≤ 8 — wider
// picker becomes a scrolling overwhelm for 3-8 year olds.
const SPECIES_PILLS = [
  'dragon',
  'puppy',
  'kitten',
  'unicorn',
  'robot',
  'kid',
  'fairy',
  'monster',
] as const;

// Example prompt pills. Picked to model the "name + 2-3 visual details +
// 1 personality hint" shape we want, so parents copy that pattern.
const EXAMPLE_PROMPTS = [
  'small purple dragon with tiny horns and a yellow scarf who loves biscuits',
  'fluffy white puppy with a blue collar and floppy ears who is always sleepy',
  'kid with curly hair and red trainers who loves rockets',
  'tiny robot with a green antenna and squeaky wheels who is super silly',
] as const;

// Voice persona keys + display labels. Keys must match the enum in
// lib/characters/trait-extraction.ts.
const VOICE_OPTIONS: { key: string; label: string }[] = [
  { key: 'warm-girl-7yo', label: 'Warm girl' },
  { key: 'warm-boy-7yo', label: 'Warm boy' },
  { key: 'playful-girl-5yo', label: 'Playful girl' },
  { key: 'playful-boy-5yo', label: 'Playful boy' },
  { key: 'sleepy-neutral', label: 'Sleepy' },
  { key: 'brave-neutral', label: 'Brave' },
  { key: 'silly-neutral', label: 'Silly' },
  { key: 'gentle-neutral', label: 'Gentle' },
];

const CreateCharacterModal = ({ open, onClose }: Props) => {
  const router = useRouter();
  const [step, setStep] = useState<Step>('gate');
  const [parentGateToken, setParentGateToken] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [species, setSpecies] = useState<string | null>(null);
  const [shortPrompt, setShortPrompt] = useState('');
  const [voicePersona, setVoicePersona] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const reset = () => {
    setStep('gate');
    setParentGateToken(null);
    setName('');
    setSpecies(null);
    setShortPrompt('');
    setVoicePersona(null);
    setError(null);
  };

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      // Brief delay so the close animation doesn't reset the visible step
      setTimeout(reset, 200);
      onClose();
    }
  };

  const handleGatePass = (token: string) => {
    setParentGateToken(token);
    setStep('name');
    trackEvent(TRACKING_EVENTS.CHARACTER_CREATE_STARTED, {});
  };

  const handleSubmit = () => {
    if (!parentGateToken) {
      setError('Please pass the grown-up check first.');
      return;
    }
    if (!name.trim() || name.trim().length > 24) {
      setError('Name must be 1 to 24 characters.');
      return;
    }
    const promptToSend = shortPrompt.trim();
    if (!promptToSend || promptToSend.length > 240) {
      setError('Description must be 1 to 240 characters.');
      return;
    }

    setError(null);
    startTransition(async () => {
      // Composing the description: species pill picked → prepend it to give
      // the LLM a strong nudge. If user picked "monster" but prompt already
      // says "dragon", trait extraction will still pick the better-supported
      // species.
      const composed = species ? `${species}: ${promptToSend}` : promptToSend;

      const result = await createCharacter({
        name: name.trim(),
        shortPrompt: composed,
        voicePersona: voicePersona ?? undefined,
        parentGateToken,
      });

      if (result.ok) {
        trackEvent(TRACKING_EVENTS.CHARACTER_CREATE_SUBMITTED, {
          characterId: result.characterId,
          species: species ?? undefined,
          voicePersona: voicePersona ?? undefined,
        });
        handleOpenChange(false);
        router.refresh();
      } else {
        // Friendly error mapping. Don't leak the raw enum to kids.
        const friendly: Record<string, string> = {
          unauthorized: 'Please sign in first.',
          no_active_profile: 'Pick a profile before making a character.',
          parent_gate_required: 'The grown-up check needs to pass again.',
          invalid_input: 'Check the name and description.',
          moderation_blocked: "We can't use that one. Try a different idea.",
          limit_reached: "You've got a full house. Try removing one first.",
          extraction_failed: 'Something went wrong drawing your friend.',
          worker_unavailable: 'Something went wrong drawing your friend.',
          unknown: 'Something went wrong. Please try again.',
        };
        setError(
          friendly[result.error] ?? 'Something went wrong. Please try again.',
        );
        if (result.error === 'parent_gate_required') {
          setStep('gate');
          setParentGateToken(null);
        }
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-2xl">Make a friend</DialogTitle>
          <DialogDescription>
            Build a character your kid will see in coloring pages.
          </DialogDescription>
        </DialogHeader>

        {step === 'gate' ? (
          <ParentGate
            scope="character:create"
            onPass={handleGatePass}
            onCancel={() => handleOpenChange(false)}
          />
        ) : null}

        {step === 'name' ? (
          <div className="space-y-4">
            <label className="block">
              <span className="block text-sm font-bold mb-2">
                What's their name?
              </span>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value.slice(0, 24))}
                autoComplete="off"
                autoFocus
                className="w-full rounded-2xl border-2 border-paper-cream-dark px-4 py-3 text-lg"
                placeholder="Rex"
                aria-label="Character name"
              />
              <span className="block text-[10px] text-neutral-400 mt-1">
                {name.length}/24
              </span>
            </label>

            <div>
              <span className="block text-sm font-bold mb-2">
                What kind of friend? (optional)
              </span>
              <div className="flex flex-wrap gap-2">
                {SPECIES_PILLS.map((s) => (
                  <button
                    type="button"
                    key={s}
                    onClick={() =>
                      setSpecies((prev) => (prev === s ? null : s))
                    }
                    className={cn(
                      'rounded-full px-4 py-2 text-sm border-2 transition-colors min-h-[44px]',
                      species === s
                        ? 'bg-crayon-orange text-white border-crayon-orange'
                        : 'bg-white text-neutral-700 border-paper-cream-dark hover:border-crayon-orange',
                    )}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => handleOpenChange(false)}
                className="rounded-full px-5 py-3 text-sm border-2 border-paper-cream-dark min-h-[44px]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!name.trim()) {
                    setError('Give your friend a name.');
                    return;
                  }
                  setError(null);
                  setStep('prompt');
                }}
                className="rounded-full px-5 py-3 text-sm font-bold bg-black text-white min-h-[44px]"
              >
                Next
              </button>
            </div>
          </div>
        ) : null}

        {step === 'prompt' ? (
          <div className="space-y-4">
            <label className="block">
              <span className="block text-sm font-bold mb-2">
                Describe your friend
              </span>
              <textarea
                value={shortPrompt}
                onChange={(e) => setShortPrompt(e.target.value.slice(0, 240))}
                rows={3}
                autoFocus
                className="w-full rounded-2xl border-2 border-paper-cream-dark px-4 py-3 text-base resize-none"
                placeholder="What do they look like? What do they love?"
                aria-label="Character description"
              />
              <span className="block text-[10px] text-neutral-400 mt-1">
                {shortPrompt.length}/240
              </span>
            </label>

            <div>
              <span className="block text-xs text-neutral-500 mb-2">
                Need a starter?
              </span>
              <div className="flex flex-col gap-2">
                {EXAMPLE_PROMPTS.map((p) => (
                  <button
                    type="button"
                    key={p}
                    onClick={() => setShortPrompt(p)}
                    className="rounded-2xl border-2 border-paper-cream-dark bg-white px-4 py-2 text-xs text-left hover:border-crayon-orange transition-colors"
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex justify-between gap-3 pt-2">
              <button
                type="button"
                onClick={() => setStep('name')}
                className="rounded-full px-5 py-3 text-sm border-2 border-paper-cream-dark min-h-[44px]"
              >
                Back
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!shortPrompt.trim()) {
                    setError('Tell us a little about your friend.');
                    return;
                  }
                  setError(null);
                  setStep('voice');
                }}
                className="rounded-full px-5 py-3 text-sm font-bold bg-black text-white min-h-[44px]"
              >
                Next
              </button>
            </div>
          </div>
        ) : null}

        {step === 'voice' ? (
          <div className="space-y-4">
            <div>
              <span className="block text-sm font-bold mb-2">
                Pick a voice (optional)
              </span>
              <span className="block text-xs text-neutral-500 mb-2">
                Don't worry, you can change this later.
              </span>
              <div className="grid grid-cols-2 gap-2">
                {VOICE_OPTIONS.map((v) => (
                  <button
                    type="button"
                    key={v.key}
                    onClick={() =>
                      setVoicePersona((prev) => (prev === v.key ? null : v.key))
                    }
                    className={cn(
                      'rounded-2xl px-4 py-3 text-sm border-2 transition-colors min-h-[44px]',
                      voicePersona === v.key
                        ? 'bg-crayon-orange text-white border-crayon-orange'
                        : 'bg-white text-neutral-700 border-paper-cream-dark hover:border-crayon-orange',
                    )}
                  >
                    {v.label}
                  </button>
                ))}
              </div>
            </div>

            <p className="text-xs text-neutral-500">
              We'll draw {name.trim() || 'your friend'} for you. This takes
              about 30 seconds. Up to {CHARACTER_LIMITS.MAX_PER_PROFILE} friends
              per profile.
            </p>

            <div className="flex justify-between gap-3 pt-2">
              <button
                type="button"
                onClick={() => setStep('prompt')}
                disabled={pending}
                className="rounded-full px-5 py-3 text-sm border-2 border-paper-cream-dark min-h-[44px] disabled:opacity-50"
              >
                Back
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={pending}
                className="rounded-full px-5 py-3 text-sm font-bold bg-black text-white min-h-[44px] disabled:opacity-50"
              >
                {pending ? 'Drawing…' : 'Make my friend'}
              </button>
            </div>
          </div>
        ) : null}

        {error ? (
          <p className="text-xs text-red-700 mt-2" role="alert">
            {error}
          </p>
        ) : null}
      </DialogContent>
    </Dialog>
  );
};

export default CreateCharacterModal;

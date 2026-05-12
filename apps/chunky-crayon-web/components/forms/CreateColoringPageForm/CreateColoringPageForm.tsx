'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale } from 'next-intl';
import { useFeatureFlagEnabled } from 'posthog-js/react';
import { type ImageQuality } from '@one-colored-pixel/coloring-core/image-quality';
import cn from '@/utils/cn';
import { trackEvent } from '@/utils/analytics-client';
import { TRACKING_EVENTS } from '@/constants';
import { trackLead } from '@/utils/pixels';
import useUser from '@/hooks/useUser';
import useRecentCreations from '@/hooks/useRecentCreations';
import { signalGalleryRefresh } from '@/utils/galleryRefresh';
import { createPendingColoringImage } from '@/app/actions/createPendingColoringImage';
import {
  InputModeProvider,
  InputModeSelector,
  TextInput,
  VoiceInput,
  ImageInput,
  ExamplePrompts,
  useInputMode,
  type InputMode,
} from './inputs';
import FormCTA from './FormCTA';
import QualityPicker from './QualityPicker/QualityPicker';
import CharacterPicker from './CharacterPicker/CharacterPicker';

type CreateColoringPageFormProps = {
  className?: string;
  /** Size variant - 'large' for logged-in dashboard */
  size?: 'default' | 'large';
  /** Where this form is mounted. Controls whether example prompt pills
   *  render (guests on homepage/start only) and the location field sent
   *  to PostHog on pill clicks. */
  location?: 'homepage' | 'start';
};

// Inner form component that uses the input mode context
const MultiModeForm = ({
  className,
  location,
}: {
  className?: string;
  location?: 'homepage' | 'start';
}) => {
  const formRef = useRef<HTMLFormElement>(null);
  const router = useRouter();
  const locale = useLocale();
  const { mode, description, imageBase64 } = useInputMode();
  const {
    isGuest,
    guestGenerationsUsed,
    guestGenerationsRemaining,
    incrementGuestGeneration,
    hasActiveSubscription,
  } = useUser();
  const { addCreation } = useRecentCreations();

  // Quality tier. UI generations always default to 'low' so cold paid traffic
  // doesn't bounce on long generation waits — first real test confirmed
  // 'low' produces a great-looking page in ~75s vs 200s+ for 'high'. System
  // generations (cron, blog, ad assets, bundle pages) stay on 'high' since
  // they don't go through this form.
  //
  // The picker is feature-flagged off (PostHog: 'quality-tier-picker'). Flip
  // the flag on to expose the slider to a subset of users for A/B testing
  // or to all users if real complaints about quality come in. Hidden today
  // by default — the speed/quality choice is the kind of decision users
  // shouldn't have to make at the moment they're trying to create.
  const isSubscriber = Boolean(hasActiveSubscription);
  const showQualityPicker = useFeatureFlagEnabled('quality-tier-picker');
  const [quality, setQuality] = useState<ImageQuality>('low');

  // Characters feature flag — gates the picker. Hidden for guests (the
  // feature itself requires auth on submit; showing the picker to a guest
  // would just take them to the auth wall after they pick).
  const charactersFeatureEnabled = useFeatureFlagEnabled('characters-feature');
  const showCharacterPicker = !isGuest && charactersFeatureEnabled;
  const [characterId, setCharacterId] = useState<string | null>(null);

  /**
   * Common post-success bookkeeping: tracking, recents, gallery
   * refresh, navigation. Shared between the form-action (text/photo)
   * and voice's onComplete paths so behaviour stays consistent.
   *
   * Loading audio + Colo voiceover are NOT triggered here anymore —
   * the destination page (`/coloring-image/[id]`) owns the streaming
   * canvas overlay end-to-end. The form's job is to debit credits,
   * INSERT the GENERATING row, kick off the worker job, and navigate.
   */
  const onCreated = (
    id: string,
    desc: string,
    inputType: 'text' | 'voice' | 'image',
  ) => {
    trackLead({
      contentName: desc || 'Coloring Page',
      contentCategory: 'coloring_page_creation',
      eventId: id,
    });
    signalGalleryRefresh('image-created');

    if (isGuest) {
      trackEvent(TRACKING_EVENTS.GUEST_GENERATION_USED, {
        generationNumber: guestGenerationsUsed + 1,
        generationsRemaining: guestGenerationsRemaining - 1,
        inputType,
      });
      if (guestGenerationsRemaining - 1 === 0) {
        trackEvent(TRACKING_EVENTS.GUEST_LIMIT_REACHED, {
          totalGenerations: guestGenerationsUsed + 1,
          lastInputType: inputType,
        });
      }
      incrementGuestGeneration();
      addCreation(id);
    }

    router.push(`/coloring-image/${id}`);
  };

  return (
    <form
      action={async (formData) => {
        const inputType = formData.get('inputType') as InputMode;
        const desc = formData.get('description') as string;

        trackEvent(TRACKING_EVENTS.CREATION_SUBMITTED, {
          description: desc,
          inputType: inputType || 'text',
          characterCount: desc?.length || 0,
        });

        // Voice has its own onComplete handler; bail here so the form
        // action doesn't fire when keyboard-Enter happens during a voice
        // session.
        if (inputType === 'voice') {
          return;
        }

        // Empty-text guard. FormCTA's `disabled` prevents this in the
        // happy path; pressing Enter bypasses that. Photo mode skips
        // this — its "description" is the photo itself.
        if (inputType !== 'image' && (!desc || desc.trim().length === 0)) {
          return;
        }

        // Perceived-wait tracking. Pair with image_generation_completed
        // (server-side) to compute the gap between "user pressed go" and
        // "image is ready". This is the metric that actually drives the
        // mobile bounce — model latency alone misses the scene-gen +
        // SVG-trace + R2-upload steps.
        trackEvent(TRACKING_EVENTS.GENERATION_STARTED, {
          mode: inputType === 'image' ? 'photo' : 'text',
          quality,
          promptLength: desc?.length || 0,
          isSubscriber,
        });

        const result =
          inputType === 'image' && imageBase64
            ? await createPendingColoringImage({
                mode: 'photo',
                photoBase64: imageBase64,
                locale,
                quality,
                // characterId intentionally NOT passed: photo mode already
                // uses the user's photo as its reference image. Mixing in
                // a character portrait would muddy the output.
              })
            : await createPendingColoringImage({
                mode: 'text',
                description: desc,
                locale,
                quality,
                characterId: characterId ?? undefined,
              });

        if (!result.ok) {
          // No overlay on this surface anymore — the destination page
          // would have shown FAILED, but here we never got that far.
          // Console + PostHog for diagnostics; user can retry.
          console.error('[CreateColoringPageForm] create failed:', result);
          return;
        }

        onCreated(result.id, desc, inputType === 'image' ? 'image' : 'text');
      }}
      ref={formRef}
      className={cn('flex flex-col gap-y-4', className)}
    >
      {/* Hidden inputs for form submission */}
      <input type="hidden" name="inputType" value={mode} />
      <input type="hidden" name="description" value={description} />
      <input type="hidden" name="locale" value={locale} />

      {/* Input mode selector */}
      <InputModeSelector />

      {/* Character picker — gated by `characters-feature` PostHog flag.
          Hidden on photo mode because the photo IS the reference image
          there (see createPendingColoringImage comment for context). */}
      {showCharacterPicker && mode !== 'image' && (
        <CharacterPicker value={characterId} onChange={setCharacterId} />
      )}

      {/* Render active input based on mode */}
      {mode === 'text' && <TextInput />}
      {mode === 'voice' && (
        <VoiceInput
          onComplete={async (firstAnswer, secondAnswer) => {
            const desc = `${firstAnswer} ${secondAnswer}`.trim();

            trackEvent(TRACKING_EVENTS.CREATION_SUBMITTED, {
              description: desc,
              inputType: 'voice',
              characterCount: desc.length,
            });

            trackEvent(TRACKING_EVENTS.GENERATION_STARTED, {
              mode: 'voice',
              quality,
              promptLength: desc.length,
              isSubscriber,
            });

            const result = await createPendingColoringImage({
              mode: 'voice',
              firstAnswer,
              secondAnswer,
              locale,
              quality,
              characterId: characterId ?? undefined,
            });

            if (!result.ok) {
              console.error(
                '[CreateColoringPageForm] voice create failed:',
                result,
              );
              // Map server-action error codes to the voice hook's error
              // codes so VoiceInput can render its existing friendly UI
              // ("Let's try a different idea!" / "Try again?") instead
              // of leaving the user stranded on "Painting your page…".
              switch (result.error) {
                case 'moderation_blocked':
                  return 'follow_up_blocked';
                case 'unauthorized':
                  return 'requires_signin';
                default:
                  return 'follow_up_failed';
              }
            }

            onCreated(result.id, desc, 'voice');
            return undefined;
          }}
        />
      )}
      {mode === 'image' && <ImageInput />}

      {/* Example-prompt pills. Only shown to guests in text mode on the
          acquisition surfaces (homepage / start) — logged-in users don't
          need prompt scaffolding and the voice/image modes use their own
          onboarding cues. */}
      {isGuest && mode === 'text' && location && (
        <ExamplePrompts location={location} />
      )}

      {/* Quality tier picker — feature-flagged off. UI gens default to
          'low' regardless. Re-enable the 'quality-tier-picker' flag in
          PostHog to expose the slider. */}
      {showQualityPicker && (
        <QualityPicker
          value={quality}
          onChange={setQuality}
          isSubscriber={isSubscriber}
        />
      )}

      {/* Shared bottom CTA — free-try chip + Create/auth fallback */}
      <FormCTA />
    </form>
  );
};

const CreateColoringPageForm = ({
  className,
  size = 'default',
  location,
}: CreateColoringPageFormProps) => {
  const isLarge = size === 'large';

  return (
    <div
      className={cn(
        'flex flex-col gap-y-5 p-6 md:p-8 bg-white rounded-2xl shadow-card border-2 border-paper-cream-dark',
        isLarge ? 'max-w-2xl' : 'max-w-lg',
      )}
    >
      <InputModeProvider>
        <MultiModeForm className={className} location={location} />
      </InputModeProvider>
    </div>
  );
};

export default CreateColoringPageForm;

'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useFormStatus } from 'react-dom';
import { useLocale } from 'next-intl';
import posthog from 'posthog-js';
import {
  createColoringImage,
  createColoringImageFromVoiceConversation,
} from '@/app/actions/coloring-image';
import { createColoringImageFromPhoto } from '@/app/actions/photo-to-coloring';
import { generateLoadingAudio } from '@/app/actions/loading-audio';
import cn from '@/utils/cn';
import { trackEvent } from '@/utils/analytics-client';
import { TRACKING_EVENTS } from '@/constants';
import { trackLead } from '@/utils/pixels';
import useUser from '@/hooks/useUser';
import useRecentCreations from '@/hooks/useRecentCreations';
import { signalGalleryRefresh } from '@/utils/galleryRefresh';
import { ColoLoading, type AudioState } from '@/components/Loading/ColoLoading';
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
import { submitTextStreaming } from './submitTextStreaming';
import type { ColoringImage } from '@one-colored-pixel/db';

type ColoringImageActionResult =
  | Partial<ColoringImage>
  | { error: string; credits?: number };

type CreateColoringPageFormProps = {
  className?: string;
  /** Size variant - 'large' for logged-in dashboard */
  size?: 'default' | 'large';
  /** Where this form is mounted. Controls whether example prompt pills
   *  render (guests on homepage/start only) and the location field sent
   *  to PostHog on pill clicks. */
  location?: 'homepage' | 'start';
};

// Loading overlay component that uses form status
const FormLoadingOverlay = ({
  description,
  audioUrl,
  audioState,
  partialImageUrl,
}: {
  description: string;
  audioUrl: string | null;
  audioState: AudioState;
  /** When the streaming SSE flow emits a partial image, the form sets a
   *  data:URL here. ColoLoading renders it as a preview "your coloring
   *  page is appearing" so the kid sees progress before navigation. */
  partialImageUrl?: string | null;
}) => {
  const { pending } = useFormStatus();

  const handleAudioComplete = () => {
    trackEvent(TRACKING_EVENTS.LOADING_AUDIO_PLAYED, {
      descriptionLength: description.length,
    });
  };

  return (
    <ColoLoading
      isLoading={pending}
      audioUrl={audioUrl ?? undefined}
      audioState={audioState}
      description={description}
      partialImageUrl={partialImageUrl ?? undefined}
      onAudioComplete={handleAudioComplete}
    />
  );
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
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioState, setAudioState] = useState<AudioState>('idle');
  // Set when the SSE stream emits a partial image; passed into the
  // loading overlay so the kid sees the page appear before navigation.
  const [partialImageUrl, setPartialImageUrl] = useState<string | null>(null);
  const {
    isGuest,
    guestGenerationsUsed,
    guestGenerationsRemaining,
    incrementGuestGeneration,
  } = useUser();
  const { addCreation } = useRecentCreations();

  return (
    <form
      action={async (formData) => {
        // Attach the browser's PostHog distinct_id so server-side events
        // (image_generation_completed, creation_completed) attribute to the
        // same visitor as their $pageview events instead of 'anonymous'.
        const clientDistinctId =
          typeof window !== 'undefined' && posthog?.get_distinct_id
            ? posthog.get_distinct_id()
            : null;
        if (clientDistinctId) {
          formData.set('clientDistinctId', clientDistinctId);
        }

        // Get description from context (already set by input components)
        const inputType = formData.get('inputType') as InputMode;
        const desc = formData.get('description') as string;

        // Start audio generation IMMEDIATELY (fire-and-forget, runs in parallel)
        // This is called synchronously at the start of the action, not via useEffect
        if (desc) {
          // Show "preparing" state while audio generates
          setAudioState('preparing');

          generateLoadingAudio(desc, locale)
            .then((result) => {
              setAudioUrl(result.audioUrl);
              // Note: The ColoLoading component will set its own "playing" state
              // when it detects the audioUrl and starts playback
              trackEvent(TRACKING_EVENTS.LOADING_AUDIO_GENERATED, {
                script: result.script,
                durationMs: result.durationMs,
                descriptionLength: desc.length,
                locale,
              });
            })
            .catch((error) => {
              console.error('[LoadingAudio] Failed:', error);
              setAudioState('done'); // Skip to done state on error
              trackEvent(TRACKING_EVENTS.LOADING_AUDIO_FAILED, {
                error: error instanceof Error ? error.message : 'Unknown error',
                descriptionLength: desc.length,
                locale,
              });
            });
        }

        trackEvent(TRACKING_EVENTS.CREATION_SUBMITTED, {
          description: desc,
          inputType: inputType || 'text',
          characterCount: desc?.length || 0,
        });

        let coloringImage: ColoringImageActionResult;

        if (inputType === 'image' && imageBase64) {
          coloringImage = await createColoringImageFromPhoto(
            imageBase64,
            locale,
          );
        } else {
          // Text path — call the streaming SSE endpoint so the user sees
          // partial frames before final. This keeps the form action
          // pending while the stream runs (useFormStatus().pending stays
          // true) and only resolves when we get { type: 'final' } or an
          // error event.
          const streamResult = await submitTextStreaming({
            description: desc,
            locale,
            clientDistinctId,
            onPartial: (b64) => {
              setPartialImageUrl(`data:image/png;base64,${b64}`);
            },
          });
          // Normalize stream result to the shared ColoringImageActionResult
          // shape so the rest of the action treats text + photo uniformly.
          coloringImage =
            'error' in streamResult ? streamResult : { id: streamResult.id };
        }

        if ('error' in coloringImage) {
          console.error(coloringImage.error);
          setAudioUrl(null);
          setAudioState('idle');
          setPartialImageUrl(null);
          return;
        }

        // Track and increment guest generation counter if user is a guest
        if (isGuest) {
          const inputType = formData.get('inputType') as
            | 'text'
            | 'voice'
            | 'image';
          trackEvent(TRACKING_EVENTS.GUEST_GENERATION_USED, {
            generationNumber: guestGenerationsUsed + 1,
            generationsRemaining: guestGenerationsRemaining - 1,
            inputType: inputType || 'text',
          });

          // Check if this was their last free generation
          if (guestGenerationsRemaining - 1 === 0) {
            trackEvent(TRACKING_EVENTS.GUEST_LIMIT_REACHED, {
              totalGenerations: guestGenerationsUsed + 1,
              lastInputType: inputType || 'text',
            });
          }

          incrementGuestGeneration();
        }

        // Store in recent creations for guests to find later
        if (isGuest && coloringImage.id) {
          addCreation(coloringImage.id);
        }

        // Track Lead event for Facebook/Pinterest pixels (successful content creation)
        trackLead({
          contentName: desc || 'Coloring Page',
          contentCategory: 'coloring_page_creation',
        });

        // Signal galleries to refresh when user navigates back
        signalGalleryRefresh('image-created');

        // Reset audio + partial state before navigation
        setAudioUrl(null);
        setAudioState('idle');
        setPartialImageUrl(null);
        if (coloringImage.id) {
          router.push(`/coloring-image/${coloringImage.id}`);
        }
      }}
      ref={formRef}
      className={cn('flex flex-col gap-y-4', className)}
    >
      {/* Colo loading overlay with voice - audio URL is managed here */}
      <FormLoadingOverlay
        description={description}
        audioUrl={audioUrl}
        audioState={audioState}
        partialImageUrl={partialImageUrl}
      />

      {/* Hidden inputs for form submission */}
      <input type="hidden" name="inputType" value={mode} />
      <input type="hidden" name="description" value={description} />
      <input type="hidden" name="locale" value={locale} />

      {/* Input mode selector */}
      <InputModeSelector />

      {/* Render active input based on mode */}
      {mode === 'text' && <TextInput />}
      {mode === 'voice' && (
        <VoiceInput
          onComplete={async (firstAnswer, secondAnswer) => {
            // Voice path bypasses the standard form action — it has two
            // transcripts to combine and uses a different server action
            // that debits 10 credits instead of 5. Cleanup (tracking,
            // navigation) is the same as the text/image paths so we
            // mirror it here.
            const clientDistinctId =
              typeof window !== 'undefined' && posthog?.get_distinct_id
                ? posthog.get_distinct_id()
                : undefined;

            const desc = `${firstAnswer} ${secondAnswer}`.trim();

            // Start loading audio gen in parallel — same as text path.
            if (desc) {
              setAudioState('preparing');
              generateLoadingAudio(desc, locale)
                .then((result) => {
                  setAudioUrl(result.audioUrl);
                  trackEvent(TRACKING_EVENTS.LOADING_AUDIO_GENERATED, {
                    script: result.script,
                    durationMs: result.durationMs,
                    descriptionLength: desc.length,
                    locale,
                  });
                })
                .catch((error) => {
                  console.error('[LoadingAudio] Failed:', error);
                  setAudioState('done');
                  trackEvent(TRACKING_EVENTS.LOADING_AUDIO_FAILED, {
                    error:
                      error instanceof Error ? error.message : 'Unknown error',
                    descriptionLength: desc.length,
                    locale,
                  });
                });
            }

            trackEvent(TRACKING_EVENTS.CREATION_SUBMITTED, {
              description: desc,
              inputType: 'voice',
              characterCount: desc.length,
            });

            const coloringImage =
              await createColoringImageFromVoiceConversation({
                firstAnswer,
                secondAnswer,
                locale,
                clientDistinctId,
              });

            if ('error' in coloringImage) {
              console.error(coloringImage.error);
              setAudioUrl(null);
              setAudioState('idle');
              return;
            }

            // Voice mode requires a signed-in user, so guest tracking
            // doesn't apply here — but keep Lead + gallery refresh in sync
            // with the standard path.
            trackLead({
              contentName: desc || 'Coloring Page',
              contentCategory: 'coloring_page_creation',
            });
            signalGalleryRefresh('image-created');

            setAudioUrl(null);
            setAudioState('idle');
            if (coloringImage.id) {
              router.push(`/coloring-image/${coloringImage.id}`);
            }
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

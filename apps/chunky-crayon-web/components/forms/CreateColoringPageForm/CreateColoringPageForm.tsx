'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useFormStatus } from 'react-dom';
import { useLocale } from 'next-intl';
import posthog from 'posthog-js';
import { createColoringImage } from '@/app/actions/coloring-image';
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
  useInputMode,
  type InputMode,
} from './inputs';
import FormCTA from './FormCTA';

type CreateColoringPageFormProps = {
  className?: string;
  /** Size variant - 'large' for logged-in dashboard */
  size?: 'default' | 'large';
};

// Loading overlay component that uses form status
const FormLoadingOverlay = ({
  description,
  audioUrl,
  audioState,
}: {
  description: string;
  audioUrl: string | null;
  audioState: AudioState;
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
      onAudioComplete={handleAudioComplete}
    />
  );
};

// Inner form component that uses the input mode context
const MultiModeForm = ({ className }: { className?: string }) => {
  const formRef = useRef<HTMLFormElement>(null);
  const router = useRouter();
  const locale = useLocale();
  const { mode, description } = useInputMode();
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioState, setAudioState] = useState<AudioState>('idle');
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

        const coloringImage = await createColoringImage(formData);

        if ('error' in coloringImage) {
          console.error(coloringImage.error);
          setAudioUrl(null);
          setAudioState('idle');
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

        // Reset audio state before navigation
        setAudioUrl(null);
        setAudioState('idle');
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
      />

      {/* Hidden inputs for form submission */}
      <input type="hidden" name="inputType" value={mode} />
      <input type="hidden" name="description" value={description} />
      <input type="hidden" name="locale" value={locale} />

      {/* Input mode selector */}
      <InputModeSelector />

      {/* Render active input based on mode */}
      {mode === 'text' && <TextInput />}
      {mode === 'voice' && <VoiceInput />}
      {mode === 'image' && <ImageInput />}

      {/* Shared bottom CTA — free-try chip + Create/auth fallback */}
      <FormCTA />
    </form>
  );
};

const CreateColoringPageForm = ({
  className,
  size = 'default',
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
        <MultiModeForm className={className} />
      </InputModeProvider>
    </div>
  );
};

export default CreateColoringPageForm;

'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useFormStatus } from 'react-dom';
import { useTranslations, useLocale } from 'next-intl';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faWandMagicSparkles,
  faClock,
} from '@fortawesome/pro-duotone-svg-icons';
import { createColoringImage } from '@/app/actions/coloring-image';
import { generateLoadingAudio } from '@/app/actions/loading-audio';
import cn from '@/utils/cn';
import { trackEvent } from '@/utils/analytics-client';
import { TRACKING_EVENTS } from '@/constants';
import useUser from '@/hooks/useUser';
import useRecentCreations from '@/hooks/useRecentCreations';
import { ColoLoading, type AudioState } from '@/components/Loading/ColoLoading';
import UserInputV2 from './UserInputV2';
import {
  InputModeProvider,
  InputModeSelector,
  TextInput,
  VoiceInput,
  ImageInput,
  useInputMode,
  type InputMode,
} from './inputs';

type CreateColoringPageFormProps = {
  className?: string;
  /** Enable new multi-mode input (text/voice/image) */
  enableMultiMode?: boolean;
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
      <InputModeSelector className="mb-2" />

      {/* Render active input based on mode */}
      {mode === 'text' && <TextInput />}
      {mode === 'voice' && <VoiceInput />}
      {mode === 'image' && <ImageInput />}
    </form>
  );
};

const CreateColoringPageForm = ({
  className,
  enableMultiMode = true,
  size = 'default',
}: CreateColoringPageFormProps) => {
  const formRef = useRef<HTMLFormElement>(null);
  const router = useRouter();
  const locale = useLocale();
  const { isGuest } = useUser();
  const { addCreation } = useRecentCreations();
  const t = useTranslations('createForm');

  const isLarge = size === 'large';

  // Use new multi-mode input system (default)
  if (enableMultiMode) {
    return (
      <div
        className={cn(
          'flex flex-col gap-y-5 p-6 md:p-8 bg-white rounded-2xl shadow-card border-2 border-paper-cream-dark relative overflow-hidden',
          isLarge ? 'max-w-2xl' : 'max-w-lg',
        )}
      >
        {/* Decorative corner accent */}
        <div className="absolute -top-12 -right-12 w-24 h-24 bg-crayon-orange-light/20 rounded-full blur-2xl" />
        <div className="absolute -bottom-8 -left-8 w-20 h-20 bg-crayon-teal-light/20 rounded-full blur-2xl" />

        {/* Header */}
        <div className="text-center relative z-10">
          <div className="inline-flex items-center gap-2 mb-3">
            <FontAwesomeIcon
              icon={faWandMagicSparkles}
              className="text-2xl"
              style={
                {
                  '--fa-primary-color': 'hsl(var(--crayon-orange))',
                  '--fa-secondary-color': 'hsl(var(--crayon-yellow))',
                  '--fa-secondary-opacity': '1',
                } as React.CSSProperties
              }
            />
            <h3 className="font-tondo font-bold text-xl md:text-2xl text-gradient-orange">
              {t('title')}
            </h3>
          </div>
          <p className="font-tondo font-medium text-base md:text-lg text-text-primary">
            {t('tagline')}
          </p>
        </div>

        {/* Time notice */}
        <div className="flex items-center justify-center gap-2 px-4 py-2 bg-crayon-yellow-light/30 rounded-xl text-center">
          <FontAwesomeIcon
            icon={faClock}
            className="text-sm"
            style={
              {
                '--fa-primary-color': 'hsl(var(--crayon-orange))',
                '--fa-secondary-color': 'hsl(var(--crayon-teal))',
                '--fa-secondary-opacity': '0.8',
              } as React.CSSProperties
            }
          />
          <p className="font-tondo text-sm text-text-secondary">
            {t('generatingMessage')}
          </p>
        </div>

        <InputModeProvider>
          <MultiModeForm className={className} />
        </InputModeProvider>
      </div>
    );
  }

  // Legacy single-mode behavior (text only)
  return (
    <div className="max-w-lg flex flex-col gap-y-5 p-6 md:p-8 bg-white rounded-2xl shadow-card border-2 border-paper-cream-dark relative overflow-hidden">
      {/* Decorative corner accent */}
      <div className="absolute -top-12 -right-12 w-24 h-24 bg-crayon-orange-light/20 rounded-full blur-2xl" />
      <div className="absolute -bottom-8 -left-8 w-20 h-20 bg-crayon-teal-light/20 rounded-full blur-2xl" />

      <div className="text-center relative z-10">
        <div className="inline-flex items-center gap-2 mb-3">
          <FontAwesomeIcon
            icon={faWandMagicSparkles}
            className="text-2xl"
            style={
              {
                '--fa-primary-color': 'hsl(var(--crayon-orange))',
                '--fa-secondary-color': 'hsl(var(--crayon-yellow))',
                '--fa-secondary-opacity': '1',
              } as React.CSSProperties
            }
          />
          <h3 className="font-tondo font-bold text-xl md:text-2xl text-gradient-orange">
            {t('title')}
          </h3>
        </div>
        <p className="font-tondo font-medium text-base text-text-primary">
          {t('tagline')}
        </p>
      </div>

      {/* Time notice */}
      <div className="flex items-center justify-center gap-2 px-4 py-2 bg-crayon-yellow-light/30 rounded-xl text-center">
        <FontAwesomeIcon
          icon={faClock}
          className="text-sm"
          style={
            {
              '--fa-primary-color': 'hsl(var(--crayon-orange))',
              '--fa-secondary-color': 'hsl(var(--crayon-teal))',
              '--fa-secondary-opacity': '0.8',
            } as React.CSSProperties
          }
        />
        <p className="font-tondo text-sm text-text-secondary">
          {t('generatingMessage')}
        </p>
      </div>

      <form
        action={async (formData) => {
          const rawFormData = {
            description: (formData.get('description') as string) || '',
          };

          trackEvent(TRACKING_EVENTS.CREATION_SUBMITTED, {
            description: rawFormData.description,
            inputType: 'text',
            characterCount: rawFormData.description.length,
          });

          const coloringImage = await createColoringImage(formData);

          if ('error' in coloringImage) {
            console.error(coloringImage.error);
            return;
          }

          // Store in recent creations for guests to find later
          if (isGuest && coloringImage.id) {
            addCreation(coloringImage.id);
          }

          if (coloringImage.id) {
            router.push(`/coloring-image/${coloringImage.id}`);
          }
        }}
        ref={formRef}
        className={cn('flex flex-col gap-y-4 relative z-10', className)}
      >
        <input type="hidden" name="locale" value={locale} />
        <UserInputV2 />
      </form>
    </div>
  );
};

export default CreateColoringPageForm;

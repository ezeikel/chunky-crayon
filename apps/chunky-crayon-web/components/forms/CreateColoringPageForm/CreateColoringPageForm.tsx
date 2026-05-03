'use client';

import { useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale } from 'next-intl';
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
  } = useUser();
  const { addCreation } = useRecentCreations();

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

        const result =
          inputType === 'image' && imageBase64
            ? await createPendingColoringImage({
                mode: 'photo',
                photoBase64: imageBase64,
                locale,
              })
            : await createPendingColoringImage({
                mode: 'text',
                description: desc,
                locale,
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

            const result = await createPendingColoringImage({
              mode: 'voice',
              firstAnswer,
              secondAnswer,
              locale,
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

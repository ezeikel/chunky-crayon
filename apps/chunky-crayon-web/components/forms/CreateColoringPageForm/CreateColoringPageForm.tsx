'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale } from 'next-intl';
import { useFeatureFlagEnabled } from 'posthog-js/react';
import { type ImageQuality } from '@one-colored-pixel/coloring-core/image-quality';
import { type SceneSelection } from '@one-colored-pixel/coloring-ui';
import { DEFAULT_CURRENCY, type Currency } from '@/lib/currency';
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
  SceneInput,
  TextInput,
  VoiceInput,
  ImageInput,
  ExamplePrompts,
  useInputMode,
  type InputMode,
} from './inputs';
import { getUnlockedModes } from '@/app/actions/scene';
import { type GateableMode } from '@/lib/scene/modes';
import {
  savePendingCreation,
  loadPendingCreation,
  clearPendingCreation,
} from '@/lib/create/pending-creation';
import FormCTA from './FormCTA';
import {
  PaywallModal,
  usePaywall,
  type PaywallState,
} from '@/components/PaywallModal';
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
  /** Geo-resolved currency. Threaded through to the in-form PaywallModal
   *  so plan prices match the visitor's currency. Defaults to GBP. */
  currency?: Currency;
};

// Inner form component that uses the input mode context.
//
// `user` is hoisted from the outer CreateColoringPageForm so the two
// components share a single useUser() instance — without this MultiModeForm
// would fire its own getCurrentUser() request alongside the outer one,
// doubling the network on mount.
type MultiModeFormUserSlice = Pick<
  ReturnType<typeof useUser>,
  | 'isGuest'
  | 'guestGenerationsUsed'
  | 'guestGenerationsRemaining'
  | 'incrementGuestGeneration'
  | 'hasActiveSubscription'
  | 'canGenerate'
  // Threaded through to FormCTA — needed for the (blockedReason, sub)
  // → PaywallState lookup.
  | 'blockedReason'
>;

const MultiModeForm = ({
  className,
  location,
  openPaywall,
  user,
}: {
  className?: string;
  location?: 'homepage' | 'start';
  openPaywall: (triggerLocation: string) => void;
  user: MultiModeFormUserSlice;
}) => {
  const formRef = useRef<HTMLFormElement>(null);
  const router = useRouter();
  const locale = useLocale();
  const {
    mode,
    description,
    imageBase64,
    setMode,
    setDescription,
    setImageBase64,
  } = useInputMode();
  const {
    isGuest,
    guestGenerationsUsed,
    guestGenerationsRemaining,
    incrementGuestGeneration,
    hasActiveSubscription,
    canGenerate,
  } = user;
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
  //
  // Local dev: NODE_ENV === 'development' bypasses PostHog. Next.js inlines
  // process.env.NODE_ENV at build time, so this is a static check in prod
  // bundles (no runtime cost, no leak). Mirrors the server-side helper in
  // flags.ts.
  const charactersFeatureFlag = useFeatureFlagEnabled('characters-feature');
  const charactersFeatureEnabled =
    charactersFeatureFlag || process.env.NODE_ENV === 'development';
  const showCharacterPicker = !isGuest && charactersFeatureEnabled;
  const [characterId, setCharacterId] = useState<string | null>(null);

  // Scene mode mirrors its built description into InputModeContext (see
  // SceneInput) so it rides the same `description` + `isReady` path as
  // text mode — that's what enables FormCTA. Only the character mix-in
  // is scene-specific; the shared context has no slot for it.
  // Scene mode can feature up to MAX_SUBJECTS of the kid's characters (the
  // "Your friends" row). Text mode uses the single-select CharacterPicker.
  const [sceneCharacterIds, setSceneCharacterIds] = useState<string[]>([]);
  // Raw scene picker state + built description, lifted from SceneInput so
  // we can snapshot the in-progress scene into localStorage when the
  // paywall interrupts it (resume-after-checkout — see
  // lib/create/pending-creation).
  const [sceneSelection, setSceneSelection] = useState<SceneSelection>({});
  const [sceneDescription, setSceneDescription] = useState('');
  // Voice answers, surfaced from VoiceInput once both turns finish, so
  // a paywall-interrupted voice creation can be snapshotted + resumed.
  const [voiceAnswers, setVoiceAnswers] = useState<{
    firstAnswer: string;
    secondAnswer: string;
  } | null>(null);

  // Per-profile unlocked modes (Scene is always available, not listed).
  // Guests never have a profile to gate against, so the gateable modes
  // stay locked and the lock badge nudges them to sign in.
  const [unlockedModes, setUnlockedModes] = useState<GateableMode[]>([]);
  useEffect(() => {
    if (isGuest) {
      setUnlockedModes([]);
      return;
    }
    let cancelled = false;
    void getUnlockedModes().then((modes) => {
      if (!cancelled) setUnlockedModes(modes);
    });
    return () => {
      cancelled = true;
    };
  }, [isGuest]);

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

  // ─── Resume creation after checkout ──────────────────────────────────
  //
  // When the paywall interrupts a creation, we snapshot the current
  // intent to localStorage right before opening the modal (the modal
  // leads to Stripe Checkout, a full-page redirect that would otherwise
  // wipe the in-progress scene). On return — once the user can actually
  // generate — we restore it. See lib/create/pending-creation.

  // Snapshot the current creation intent, then open the paywall. This
  // wraps the raw `openPaywall` so every paywall-from-the-create-form
  // path persists the scene first. `/pricing` and other surfaces use
  // the bare hook, so the snapshot logic correctly lives here only.
  const openPaywallWithSnapshot = (triggerLocation: string) => {
    if (mode === 'scene' && sceneDescription) {
      savePendingCreation({
        mode: 'scene',
        selection: sceneSelection,
        characterIds: sceneCharacterIds,
        description: sceneDescription,
      });
    } else if (mode === 'text' && description.trim()) {
      savePendingCreation({ mode: 'text', description });
    } else if (mode === 'image' && imageBase64) {
      savePendingCreation({ mode: 'photo', photoBase64: imageBase64 });
    } else if (mode === 'voice' && voiceAnswers) {
      savePendingCreation({
        mode: 'voice',
        firstAnswer: voiceAnswers.firstAnswer,
        secondAnswer: voiceAnswers.secondAnswer,
      });
    }
    openPaywall(triggerLocation);
  };

  // Seeds SceneInput's picker / VoiceInput's answers when a creation is
  // restored post-checkout. null = nothing to restore (normal load).
  const [restoredSelection, setRestoredSelection] =
    useState<SceneSelection | null>(null);
  const [restoredVoiceAnswers, setRestoredVoiceAnswers] = useState<{
    firstAnswer: string;
    secondAnswer: string;
  } | null>(null);

  // Restore on mount — but only once the user can actually generate
  // (the subscription / credits landed). If they abandoned checkout and
  // came back still blocked, the saved intent is left untouched for
  // their next attempt and the form opens normally.
  const restoreAttempted = useRef(false);
  useEffect(() => {
    if (restoreAttempted.current || !canGenerate) return;
    restoreAttempted.current = true;
    const saved = loadPendingCreation();
    if (!saved) return;
    // Apply, then clear immediately so a refresh doesn't re-restore.
    if (saved.mode === 'scene') {
      setRestoredSelection(saved.selection);
      setSceneSelection(saved.selection);
      setSceneCharacterIds(saved.characterIds);
      setSceneDescription(saved.description);
      setDescription(saved.description);
      setMode('scene');
    } else if (saved.mode === 'text') {
      setDescription(saved.description);
      setMode('text');
    } else if (saved.mode === 'photo') {
      setImageBase64(saved.photoBase64);
      setMode('image');
    } else if (saved.mode === 'voice') {
      // VoiceInput re-seeds its conversation hook into `ready_to_submit`
      // from this prop — no mic, no question playback.
      setRestoredVoiceAnswers({
        firstAnswer: saved.firstAnswer,
        secondAnswer: saved.secondAnswer,
      });
      setDescription(`${saved.firstAnswer} ${saved.secondAnswer}`.trim());
      setMode('voice');
    }
    clearPendingCreation();
  }, [canGenerate, setDescription, setImageBase64, setMode]);

  return (
    <form
      action={async (formData) => {
        const inputType = formData.get('inputType') as InputMode;
        const desc = formData.get('description') as string;

        // Belt-and-braces gate. Visual states (disabled button / pill /
        // wizard's blocked Create) already prevent this in the happy
        // path, but pressing Enter inside a text input or any stale
        // disabled-button bypass would otherwise submit. Open the
        // paywall instead of firing the action.
        if (!canGenerate) {
          openPaywallWithSnapshot('form_action_blocked');
          return;
        }

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
                // Scene mode can feature up to MAX_SUBJECTS of the kid's
                // characters (the friends row); text mode uses the single
                // CharacterPicker selection.
                characterIds:
                  inputType === 'scene'
                    ? sceneCharacterIds
                    : characterId
                      ? [characterId]
                      : [],
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
      {/* Hidden inputs for form submission. Scene mirrors its built
          description into InputModeContext (see SceneInput), so all modes
          submit the same `description`; scene rides the text pipeline. */}
      <input type="hidden" name="inputType" value={mode} />
      <input type="hidden" name="description" value={description} />
      <input type="hidden" name="locale" value={locale} />

      {/* Input mode selector */}
      <InputModeSelector
        unlockedModes={unlockedModes}
        onModeUnlocked={(m) =>
          setUnlockedModes((prev) => (prev.includes(m) ? prev : [...prev, m]))
        }
        isGuest={isGuest}
      />

      {/* Character picker — gated by `characters-feature` PostHog flag.
          Hidden on photo mode (the photo IS the reference image) and on
          scene mode (scene mixes a character in via its own sentinel
          tile, so a second picker would be redundant + conflicting). */}
      {showCharacterPicker && mode !== 'image' && mode !== 'scene' && (
        <CharacterPicker value={characterId} onChange={setCharacterId} />
      )}

      {/* Render active input based on mode */}
      {mode === 'scene' && (
        <SceneInput
          // Remount when a restore lands so SceneInput re-seeds its
          // selection useState from `initialSelection`. The default
          // mode is 'scene', so SceneInput is already mounted (with an
          // empty selection) by the time the post-checkout restore
          // effect runs — without the key change, the new
          // initialSelection would be ignored.
          key={restoredSelection ? 'restored' : 'fresh'}
          onChange={({ characterIds: cIds, selection, description: desc }) => {
            setSceneCharacterIds(cIds);
            setSceneSelection(selection);
            setSceneDescription(desc);
          }}
          onCreate={() => formRef.current?.requestSubmit()}
          charactersEnabled={showCharacterPicker}
          createBlocked={!canGenerate}
          onCreateBlockedTap={() =>
            openPaywallWithSnapshot('scene_wizard_create')
          }
          initialSelection={restoredSelection ?? undefined}
        />
      )}
      {mode === 'text' && <TextInput />}
      {mode === 'voice' && (
        <VoiceInput
          // Surface the two answers up so a paywall-interrupted voice
          // creation can be snapshotted (resume-after-checkout).
          onAnswersChange={(firstAnswer, secondAnswer) =>
            setVoiceAnswers({ firstAnswer, secondAnswer })
          }
          // When present, VoiceInput seeds its conversation hook
          // straight into `ready_to_submit` from these (post-checkout
          // restore). undefined on the normal first-load path.
          restoreAnswers={restoredVoiceAnswers ?? undefined}
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
              characterIds: characterId ? [characterId] : [],
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

      {/* Shared bottom CTA. In Scene mode it renders in `compact` so it
          shows ONLY the free-tries chip / blocked-reason pill — the
          wizard owns the actual Create button so a second one would be
          duplicative + let a kid submit mid-wizard before the scene is
          built. */}
      <FormCTA
        openPaywall={openPaywallWithSnapshot}
        compact={mode === 'scene'}
        user={user}
      />
    </form>
  );
};

const CreateColoringPageForm = ({
  className,
  size = 'default',
  location,
  currency = DEFAULT_CURRENCY,
}: CreateColoringPageFormProps) => {
  const isLarge = size === 'large';
  // Single useUser() per form mount. MultiModeForm receives the slice
  // it needs as `user`; the outer component also reads `blockedReason`
  // here to compute the PaywallModal's state.
  const user = useUser();
  const { isGuest, hasActiveSubscription, blockedReason } = user;
  const paywall = usePaywall();

  // Map (blockedReason, sub status) → PaywallState. Single source of
  // truth for which ladder the modal shows.
  const paywallState: PaywallState = (() => {
    if (blockedReason === 'guest_limit_reached' || isGuest)
      return 'guest_limit';
    if (hasActiveSubscription) return 'subscriber_no_credits';
    return 'no_subscription';
  })();

  // Scene Builder is the default mode for everyone — privacy-first,
  // tap-only, no typing/voice/photo until the parent gate is passed.
  // Was previously flag-ramped behind PostHog 'scene-builder-default';
  // the flag was never created in PostHog so prod ran on the legacy 'text'
  // default the whole time. Cutover is this commit: rollout = deploy.
  return (
    <div
      className={cn(
        'flex flex-col gap-y-5 p-6 md:p-8 bg-white rounded-2xl shadow-card border-2 border-paper-cream-dark',
        isLarge ? 'max-w-2xl' : 'max-w-lg',
      )}
    >
      <InputModeProvider initialMode="scene">
        <MultiModeForm
          className={className}
          location={location}
          openPaywall={paywall.openPaywall}
          user={user}
        />
      </InputModeProvider>
      <PaywallModal
        open={paywall.open}
        onOpenChange={paywall.setOpen}
        state={paywallState}
        triggerLocation={paywall.triggerLocation}
        currency={currency}
      />
    </div>
  );
};

export default CreateColoringPageForm;

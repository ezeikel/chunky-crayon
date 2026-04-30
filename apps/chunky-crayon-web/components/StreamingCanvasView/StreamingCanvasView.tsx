'use client';
/**
 * Canvas-as-loader streaming page shell.
 *
 * Mirrors `<ColoringPageContent>`'s 3-column layout (palette sidebar +
 * center canvas + tools sidebar) so the streaming page is structurally
 * identical to the READY page — just with the real `<ColoringArea>`
 * replaced by a placeholder card that paints in the worker's partial
 * image and overlays Colo + cycling icons + voiceover on top.
 *
 * The palette / tools / progress / mute controls are the SAME real
 * components used on the READY page, wrapped in a fresh
 * `<ColoringContextProvider>` so they have state to mutate. They're
 * functional as visual widgets (selecting a colour highlights it,
 * tapping a tool selects it) — they just don't have a canvas to apply
 * to. When the row hits READY the parent page swaps the entire shell
 * out for `<ColoringPageContent>` via `router.refresh()`, so anything
 * the user clicked in the placeholder doesn't carry over (intentional;
 * the canvas needs to drive its own initial state).
 *
 * Partial image: rendered as background of the canvas card, blurred
 * lightly so Colo's text stays readable. The blur fades out as more
 * partials arrive (worker emits 3, blur shrinks at each step).
 */
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import Image from 'next/image';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faRotateRight,
  faFaceDizzy,
  faPencilPaintbrush,
  faPalette,
  faPenSwirl,
  faSparkles,
  faStars,
  faMagnifyingGlass,
  faGift,
  faWandMagicSparkles,
} from '@fortawesome/pro-duotone-svg-icons';
import type { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import {
  ColoringContextProvider,
  DesktopColorPalette,
  DesktopToolsSidebar,
  MuteToggle,
  type DesktopToolsSidebarLabels,
} from '@one-colored-pixel/coloring-ui';
import ProgressIndicator from '@/components/ProgressIndicator/ProgressIndicator';
import { generateLoadingAudio } from '@/app/actions/loading-audio';
import { trackEvent } from '@/utils/analytics-client';
import { TRACKING_EVENTS } from '@/constants';
import cn from '@/utils/cn';

type StreamingStatus = 'GENERATING' | 'READY' | 'FAILED';

type StreamingCanvasViewProps = {
  coloringImageId: string;
  initialStatus: StreamingStatus;
  initialPartialUrl: string | null;
  initialProgress: number;
  initialFailureReason: string | null;
  fallbackTitle: string;
};

type StateEvent = {
  type: 'state';
  status: StreamingStatus;
  streamingPartialUrl: string | null;
  streamingProgress: number;
  url: string | null;
  svgUrl: string | null;
  failureReason: string | null;
};

const LOADING_ICONS: IconDefinition[] = [
  faPencilPaintbrush,
  faPalette,
  faPenSwirl,
  faSparkles,
  faStars,
  faWandMagicSparkles,
  faMagnifyingGlass,
  faGift,
];
const LOADING_MESSAGE_KEYS = [
  'sharpeningCrayons',
  'mixingColors',
  'drawingLines',
  'addingSparkles',
  'almostThere',
  'creatingMasterpiece',
  'wavingWand',
  'coloringOutsideLines',
] as const;

// Blur intensity drops as more partials arrive — the kid sees the page
// clarifying. partial 1 → blur-md, partial 2 → blur-sm, partial 3 →
// blur-[2px], 0 → blur-lg (basically a vague colour wash). At READY
// we don't render this view anymore.
const BLUR_BY_PROGRESS: Record<number, string> = {
  0: 'blur-lg',
  1: 'blur-md',
  2: 'blur-sm',
  3: 'blur-[2px]',
};

// Shared sidebar labels — reused from ColoringPageContent. We rebuild
// them here so the streaming page doesn't depend on it.
const useSidebarLabels = (): DesktopToolsSidebarLabels => {
  const t = useTranslations('coloringPage');
  return {
    crayon: t('brushTypes.crayon'),
    marker: t('brushTypes.marker'),
    glitter: t('brushTypes.glitter'),
    eraser: t('brushTypes.eraser'),
    fill: t('tools.fill'),
    sticker: t('tools.sticker'),
    'magic-reveal': t('tools.magicBrush'),
    'magic-auto': t('tools.autoColor'),
    undo: t('undoRedo.undo'),
    redo: t('undoRedo.redo'),
    zoomIn: t('zoomControls.zoomIn'),
    zoomOut: t('zoomControls.zoomOut'),
    pan: t('zoomControls.pan'),
    resetView: t('zoomControls.reset'),
  };
};

// Stub canvas getters for ProgressIndicator — null causes early return,
// so the bar stays at 0% until the real canvas appears.
const noCanvas = () => null;

const StreamingCanvasView = ({
  coloringImageId,
  initialStatus,
  initialPartialUrl,
  initialProgress,
  initialFailureReason,
  fallbackTitle,
}: StreamingCanvasViewProps) => {
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations('coloLoading');
  const sidebarLabels = useSidebarLabels();

  const [status, setStatus] = useState<StreamingStatus>(initialStatus);
  const [partialUrl, setPartialUrl] = useState<string | null>(
    initialPartialUrl,
  );
  const [progress, setProgress] = useState<number>(initialProgress);
  const [failureReason, setFailureReason] = useState<string | null>(
    initialFailureReason,
  );

  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [hasPlayedAudio, setHasPlayedAudio] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  if (typeof window !== 'undefined') {
    // eslint-disable-next-line no-console
    console.log(
      `[StreamingCanvasView] mount/render: id=${coloringImageId} initialStatus=${initialStatus} fallbackTitle="${fallbackTitle}"`,
    );
  }

  const [iconIndex, setIconIndex] = useState(0);

  // SSE — open once, close on terminal state. EventSource auto-reconnects
  // on network blips so we don't need to babysit retries.
  useEffect(() => {
    if (initialStatus === 'READY' || initialStatus === 'FAILED') return;

    const url = `/api/coloring-image/${encodeURIComponent(coloringImageId)}/events`;
    const es = new EventSource(url);

    es.addEventListener('state', (e: MessageEvent) => {
      try {
        const data = JSON.parse(e.data) as StateEvent;
        setStatus(data.status);
        setPartialUrl(data.streamingPartialUrl);
        setProgress(data.streamingProgress);
        if (data.failureReason) setFailureReason(data.failureReason);

        if (data.status === 'READY') {
          es.close();
          router.refresh();
        } else if (data.status === 'FAILED') {
          es.close();
        }
      } catch (err) {
        console.error('[StreamingCanvasView] failed to parse event:', err);
      }
    });

    es.addEventListener('error', (e) => {
      // eslint-disable-next-line no-console
      console.warn('[StreamingCanvasView] SSE error', e);
    });

    return () => {
      es.close();
    };
  }, [coloringImageId, initialStatus, router]);

  // Trigger loading audio gen ONCE per mount. We use a ref guard rather
  // than effect deps because `fallbackTitle` can change during the page's
  // lifetime (e.g. dev-mode HMR or a server-component re-render with
  // updated sourcePrompt) and we don't want a second TTS call burning
  // ElevenLabs minutes + double-tracking the analytics event.
  const audioGenStartedRef = useRef(false);
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.log(
      `[StreamingCanvasView] audio-gen effect: initialStatus=${initialStatus} fallbackTitle="${fallbackTitle}" alreadyStarted=${audioGenStartedRef.current}`,
    );
    if (initialStatus !== 'GENERATING') return;
    if (audioGenStartedRef.current) return;
    audioGenStartedRef.current = true;

    // No cancellation flag here. React 18 StrictMode double-invokes
    // effects in dev — if we kept a `cancelled` flag, the cleanup from
    // the first run would set it true, and when generateLoadingAudio's
    // promise resolved, the setAudioUrl call would be skipped silently.
    // Audio URL would never reach state, autoplay effect would never
    // see hasUrl=true. The audioGenStartedRef already guards against
    // double-invocation (only one TTS call, one analytics event), so
    // we don't need a second guard here.
    // eslint-disable-next-line no-console
    console.log(
      `[StreamingCanvasView] calling generateLoadingAudio("${fallbackTitle}", "${locale}")`,
    );
    generateLoadingAudio(fallbackTitle, locale)
      .then((result) => {
        // eslint-disable-next-line no-console
        console.log(
          `[StreamingCanvasView] generateLoadingAudio returned audioUrl=${result.audioUrl ? 'set' : 'null'} script="${result.script}"`,
        );
        setAudioUrl(result.audioUrl);
        trackEvent(TRACKING_EVENTS.LOADING_AUDIO_GENERATED, {
          script: result.script,
          durationMs: result.durationMs,
          descriptionLength: fallbackTitle.length,
          locale,
        });
      })
      .catch((err) => {
        console.error('[StreamingCanvasView] loading audio failed:', err);
        trackEvent(TRACKING_EVENTS.LOADING_AUDIO_FAILED, {
          error: err instanceof Error ? err.message : 'Unknown error',
          descriptionLength: fallbackTitle.length,
          locale,
        });
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialStatus]);

  // Auto-play audio once when it arrives.
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.log(
      `[StreamingCanvasView] autoplay effect: hasUrl=${!!audioUrl} hasPlayed=${hasPlayedAudio} hasRef=${!!audioRef.current}`,
    );
    if (!audioUrl || hasPlayedAudio || !audioRef.current) return;
    audioRef.current.src = audioUrl;
    // eslint-disable-next-line no-console
    console.log('[StreamingCanvasView] calling audio.play()');
    audioRef.current
      .play()
      .then(() => {
        // eslint-disable-next-line no-console
        console.log('[StreamingCanvasView] audio.play() resolved (playing)');
      })
      .catch((err) => {
        // eslint-disable-next-line no-console
        console.log('[StreamingCanvasView] audio autoplay blocked:', err);
      });
    setHasPlayedAudio(true);
    setIsPlaying(true);
  }, [audioUrl, hasPlayedAudio]);

  // Cycle through icons every 4s while we're waiting + not playing audio.
  useEffect(() => {
    if (status !== 'GENERATING' || isPlaying) return;
    const id = setInterval(() => {
      setIconIndex((prev) => (prev + 1) % LOADING_ICONS.length);
    }, 4000);
    return () => clearInterval(id);
  }, [status, isPlaying]);

  const message = (() => {
    if (isPlaying) return null;
    if (!audioUrl) return t('audioStates.preparing');
    return t(`messages.${LOADING_MESSAGE_KEYS[iconIndex]}`);
  })();

  if (status === 'FAILED') {
    return (
      <div className="flex flex-col items-center justify-center gap-6 py-20">
        <FontAwesomeIcon
          icon={faFaceDizzy}
          size="6x"
          style={
            {
              '--fa-primary-color': 'hsl(var(--crayon-orange))',
              '--fa-secondary-color': 'hsl(var(--crayon-yellow))',
              '--fa-secondary-opacity': '1',
            } as React.CSSProperties
          }
        />
        <h2 className="font-tondo font-bold text-2xl text-text-primary text-center">
          Oh no, we couldn&apos;t finish your coloring page.
        </h2>
        {failureReason && (
          <p className="font-tondo text-sm text-text-muted text-center max-w-md italic">
            {failureReason}
          </p>
        )}
        <p className="font-tondo text-base text-text-primary text-center max-w-md">
          Don&apos;t worry — your credits have been refunded. Want to try again?
        </p>
        <button
          type="button"
          onClick={() => router.push('/')}
          className="font-tondo font-bold text-base md:text-lg text-white bg-btn-orange shadow-btn-primary hover:shadow-btn-primary-hover hover:scale-105 active:scale-95 transition-all duration-200 rounded-full px-8 py-4"
        >
          <FontAwesomeIcon icon={faRotateRight} className="mr-2" />
          Try again
        </button>
      </div>
    );
  }

  return (
    // Wrap the whole shell in a fresh ColoringContextProvider so the
    // palette + tools sidebars have somewhere to mutate state. They
    // function as state-only widgets here — selecting a swatch
    // highlights it, etc. — but with no canvas to apply changes to.
    // When the row hits READY, the parent page swaps to
    // <ColoringPageContent> which has its own provider; nothing the
    // user clicked here carries over (correct — the canvas drives its
    // own initial state).
    <ColoringContextProvider>
      <audio
        ref={audioRef}
        onEnded={() => setIsPlaying(false)}
        preload="auto"
      />

      <div className="flex flex-col gap-y-4 @container">
        {/* Title + (mobile/tablet) progress + mute */}
        <div className="flex flex-col items-center gap-2 max-w-3xl xl:max-w-none w-full mx-auto xl:px-4">
          <h1 className="hidden md:block font-tondo font-bold text-2xl md:text-3xl text-text-primary text-center">
            {fallbackTitle}
          </h1>
          <div className="hidden md:flex xl:hidden items-center gap-4 w-full">
            <ProgressIndicator
              getCanvas={noCanvas}
              getBoundaryCanvas={noCanvas}
              className="flex-1"
            />
            <MuteToggle />
          </div>
        </div>

        {/* 3-column layout — same shape as ColoringPageContent */}
        <div className="flex justify-center xl:justify-between items-start gap-4 xl:gap-6 @[1400px]:gap-8">
          {/* Left sidebar — palette */}
          <div className="hidden xl:block shrink-0 sticky top-24 self-start">
            <DesktopColorPalette className="w-[180px] @[1400px]:w-[200px] @[1600px]:w-[220px]" />
          </div>

          {/* Center — canvas placeholder card */}
          <div className="max-w-3xl w-full flex-1 xl:max-w-none xl:min-w-[600px]">
            {/* xl+ progress + mute above canvas */}
            <div className="hidden xl:flex items-center gap-4 mb-3">
              <ProgressIndicator
                getCanvas={noCanvas}
                getBoundaryCanvas={noCanvas}
                className="flex-1"
              />
              <MuteToggle />
            </div>

            <div className="bg-white rounded-2xl border-2 border-paper-cream-dark p-4 md:p-6 @[1600px]:p-8 shadow-sm">
              {/* Aspect-square canvas slot — same shape as the real
                  ColoringArea would render. Partial image paints in
                  here, blur reduces as more partials arrive. */}
              <div className="relative w-full aspect-square rounded-xl overflow-hidden bg-paper-cream/40">
                {partialUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={partialUrl}
                    alt={fallbackTitle}
                    className={cn(
                      'absolute inset-0 w-full h-full object-contain transition-all duration-700 animate-fade-in',
                      BLUR_BY_PROGRESS[Math.min(progress, 3)] ?? 'blur-md',
                    )}
                  />
                )}

                {/* Soft veil so Colo stays readable. Less opaque
                    once we have a partial — the partial itself is
                    blurred so contrast is fine. */}
                <div
                  className={cn(
                    'absolute inset-0 bg-gradient-to-b from-paper-cream/70 via-white/50 to-paper-cream/70 transition-opacity duration-700',
                    partialUrl ? 'opacity-40' : 'opacity-100',
                  )}
                />

                {/* Colo + activity content */}
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-6">
                  <div className="relative animate-float">
                    <Image
                      src="/images/colo.svg"
                      alt="Colo the friendly crayon mascot"
                      width={140}
                      height={140}
                      className={cn(
                        'drop-shadow-xl transition-transform duration-300',
                        isPlaying && 'scale-105',
                      )}
                      priority
                    />

                    {isPlaying && (
                      <div className="absolute -right-6 top-1/2 -translate-y-1/2 flex items-center gap-1">
                        {[0, 1, 2, 3].map((i) => (
                          <div
                            key={i}
                            className="w-1.5 bg-crayon-orange rounded-full animate-sound-wave"
                            style={{
                              height: `${10 + i * 5}px`,
                              animationDelay: `${i * 0.1}s`,
                            }}
                          />
                        ))}
                      </div>
                    )}
                  </div>

                  {!isPlaying && (
                    <div
                      key={`icon-${iconIndex}`}
                      className="flex h-14 w-14 items-center justify-center rounded-full bg-white shadow-md border-2 border-crayon-orange-light animate-icon-pop"
                    >
                      <FontAwesomeIcon
                        icon={LOADING_ICONS[iconIndex]}
                        className="text-2xl text-crayon-orange"
                        style={
                          {
                            '--fa-secondary-color': 'rgb(255 192 192 / 1)',
                            '--fa-secondary-opacity': 0.8,
                          } as React.CSSProperties
                        }
                      />
                    </div>
                  )}

                  <div className="text-center max-w-sm">
                    <h2 className="font-tondo font-bold text-lg md:text-xl text-gradient-orange mb-1">
                      {isPlaying ? t('titleSpeaking') : t('title')}
                    </h2>
                    {message && (
                      <p className="font-tondo text-sm text-text-primary">
                        {message}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right sidebar — tools. No onClick handlers wired up so the
              tools "select" but don't act. The actions slot is empty —
              start-over / download / share / save-to-gallery all need a
              real canvas, so we hide them rather than render half-
              functional buttons. */}
          <div className="hidden xl:block shrink-0 sticky top-24 self-start">
            <DesktopToolsSidebar labels={sidebarLabels} actions={null} />
          </div>
        </div>
      </div>
    </ColoringContextProvider>
  );
};

export default StreamingCanvasView;

'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ColoringImage } from '@one-colored-pixel/db/types';
import {
  ActionButtonSizeProvider,
  ImageCanvas,
  useRegionStore,
  type ImageCanvasHandle,
  type RegionStoreJson,
} from '@one-colored-pixel/coloring-ui';
import { useAnalytics } from '@/utils/analytics-client';
import { TRACKING_EVENTS } from '@/constants';
import cn from '@/utils/cn';
import SaveButton from '@/components/buttons/SaveButton';
import SlimColorPalette from './SlimColorPalette';

type EmbeddedColoringCanvasProps = {
  /**
   * The campaign-specific coloring image to load. Pre-fetched in
   * StartHeroAsync via getColoringImageForAdCampaign.
   */
  image: Partial<ColoringImage>;
  /**
   * The utm_campaign key the visitor arrived with. Forwarded to the
   * START_HERO_CANVAS_INTERACTED event for attribution.
   */
  campaign: string;
  className?: string;
};

/**
 * Slim coloring canvas embedded directly on the /start landing page.
 *
 * Replaces the static polaroid that used to sit there — the polaroid
 * required a click to /coloring-image/[id] which only 1 of 258 paid
 * Meta visitors made. Embedding the canvas inline removes the click,
 * lets visitors interact within seconds of landing.
 *
 * Composes existing primitives rather than reusing ColoringArea (which
 * is 1300 LOC of /coloring-image/[id]-specific UI: sticker tray, save
 * buttons, progress, mute toggle, zoom controls — all wrong for a
 * marketing page). Reuses:
 * - ImageCanvas (the actual paint surface, from coloring-ui)
 * - useRegionStore (loads regionMapUrl + regionsJson for Magic Brush)
 * - useColoringContext (state from app-root provider — already wraps
 *   the entire app in app/providers.tsx)
 *
 * The compact SlimColorPalette below the canvas covers BOTH desktop
 * and mobile — we deliberately don't render coloring-ui's full
 * MobileColoringDrawer here because it expands into a huge bottom
 * sheet (sticker tray, magic-auto, undo, fill patterns) that's way
 * too much UI for a marketing landing.
 *
 * Tracking: fires START_HERO_CANVAS_INTERACTED exactly once per session
 * on first stroke (whichever canvas method is first invoked).
 */
const EmbeddedColoringCanvas = ({
  image,
  campaign,
  className,
}: EmbeddedColoringCanvasProps) => {
  const { track } = useAnalytics();
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<ImageCanvasHandle>(null);
  const hasTrackedInteractionRef = useRef(false);
  // Capture mount time so the first-stroke event carries
  // time-to-first-stroke — useful for diagnosing visitor latency
  // (do paid users hit the canvas immediately or read the copy first?).
  const mountTimeRef = useRef<number>(Date.now());
  // Mobile floating palette is gated by IntersectionObserver — appears
  // when the canvas scrolls into view, hides as visitor reads further
  // down the marketing page. Desktop palette renders inline always.
  const [isInViewport, setIsInViewport] = useState(false);

  // Snapshot of the painted canvas at click time, used by the
  // SaveButton to embed the visitor's coloured version into the
  // PDF (instead of just the line art). Mirrors the helper exposed on
  // ColoringArea — see ColoringArea.tsx getCanvasDataUrl.
  const getCanvasDataUrl = useCallback((): string | null => {
    const composite = canvasRef.current?.getCompositeCanvas();
    return composite ? composite.toDataURL('image/png') : null;
  }, []);

  const handleFirstInteraction = useCallback(() => {
    if (hasTrackedInteractionRef.current) return;
    hasTrackedInteractionRef.current = true;
    track(TRACKING_EVENTS.START_HERO_CANVAS_INTERACTED, {
      campaign,
      coloringImageId: image.id ?? '',
      msFromMount: Date.now() - mountTimeRef.current,
    });
  }, [campaign, image.id, track]);

  // One-click auto-reveal: paints the entire pre-coloured canvas (built
  // by ImageCanvas from the region store + active palette variant) onto
  // the drawing canvas in one shot. Mirrors the body of
  // handleRegionStoreAutoColor in ColoringArea.tsx, minus the history /
  // unsaved-changes bookkeeping that doesn't apply to a marketing page.
  // The setTransform reset is required because the drawing context has
  // DPR scaling applied and drawImage needs raw pixel space.
  const handleMagicAutoColor = useCallback(() => {
    const drawing = canvasRef.current?.getCanvas();
    const preColored = canvasRef.current?.getPreColoredCanvas();
    const ctx = drawing?.getContext('2d');
    if (!drawing || !preColored || !ctx) return;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(preColored, 0, 0);
    ctx.restore();
    handleFirstInteraction();
    track(TRACKING_EVENTS.START_HERO_AUTO_REVEAL_CLICKED, {
      campaign,
      coloringImageId: image.id ?? '',
      msFromMount: Date.now() - mountTimeRef.current,
    });
  }, [campaign, image.id, track, handleFirstInteraction]);

  // Parse regionsJson from the DB string. Mirrors the parsing block in
  // ColoringArea.tsx — keep in sync if shape changes.
  const parsedRegionsJson = useMemo<RegionStoreJson | null>(() => {
    if (!image.regionsJson) return null;
    try {
      return JSON.parse(image.regionsJson) as RegionStoreJson;
    } catch (err) {
      console.error(
        '[EmbeddedColoringCanvas] Failed to parse regionsJson',
        err,
      );
      return null;
    }
  }, [image.regionsJson]);

  const regionStore = useRegionStore({
    regionMapUrl: image.regionMapUrl as string | undefined,
    regionMapWidth: image.regionMapWidth as number | undefined,
    regionMapHeight: image.regionMapHeight as number | undefined,
    regionsJson: parsedRegionsJson ?? undefined,
  });

  // Threshold 0.2 + 200ms debounce: drawer appears when ~20% of the
  // canvas is visible (gives time to reach for tools as canvas scrolls
  // in), hides once mostly off-screen. Debounce prevents flicker on
  // slow scroll.
  useEffect(() => {
    const node = containerRef.current;
    if (!node) return;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (timer) clearTimeout(timer);
        timer = setTimeout(() => {
          setIsInViewport(entry.isIntersecting);
        }, 200);
      },
      { threshold: 0.2 },
    );
    observer.observe(node);
    return () => {
      observer.disconnect();
      if (timer) clearTimeout(timer);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className={cn('flex flex-col gap-4 items-center w-full', className)}
    >
      {/* Canvas — masking-tape-on-paper styling so it visually matches
          the rest of the kid-friendly hero. The aspect-square keeps it
          stable across desktop + mobile without depending on dynamic
          image dimensions. */}
      <div className="relative w-full max-w-[400px]">
        <div
          aria-hidden
          className="absolute -top-3 left-1/2 -translate-x-1/2 z-10 h-6 w-28 rotate-[-3deg] bg-crayon-yellow-light/85 shadow-sm"
          style={{
            backgroundImage:
              'repeating-linear-gradient(45deg, transparent 0 3px, rgba(0,0,0,0.05) 3px 4px)',
          }}
        />
        <div className="relative bg-white rounded-sm p-3 shadow-[0_12px_28px_rgba(0,0,0,0.08),0_2px_4px_rgba(0,0,0,0.04)] border border-black/5">
          <div className="relative aspect-square w-full bg-paper-cream rounded-sm overflow-hidden">
            <ImageCanvas
              ref={canvasRef}
              coloringImage={image}
              onFirstInteraction={handleFirstInteraction}
              regionStore={
                regionStore.state.isReady
                  ? {
                      getRegionIdAt: regionStore.getRegionIdAt,
                      getColorForRegion: regionStore.getColorForRegion,
                      isReady: regionStore.state.isReady,
                      width: regionStore.state.width,
                      height: regionStore.state.height,
                    }
                  : undefined
              }
            />
          </div>
        </div>
      </div>

      {/* Desktop: inline palette below the canvas. Save button is
          rendered inline with the tools row (via SlimColorPalette's
          trailingAction slot) so the whole controls block reads as one
          unified group. ActionButtonSizeProvider scopes
          SaveButton (internally an ActionButton) to tile-compact
          (48px) — same square as the tool buttons.
          Capture-phase listener fires before SaveButton's own
          click handler so we can attribute the download to the
          campaign; the button itself ALSO fires DOWNLOAD_PDF_CLICKED
          for the global PDF funnel. */}
      <div className="hidden md:flex w-full justify-center">
        <SlimColorPalette
          magicAvailable={regionStore.state.isReady}
          onMagicAutoColor={handleMagicAutoColor}
          campaign={campaign}
          trailingAction={
            <ActionButtonSizeProvider value="tile">
              <div
                onClickCapture={() =>
                  track(TRACKING_EVENTS.START_HERO_PDF_DOWNLOADED, {
                    campaign,
                    coloringImageId: image.id ?? '',
                    msFromMount: Date.now() - mountTimeRef.current,
                  })
                }
              >
                <SaveButton
                  coloringImage={image}
                  getCanvasDataUrl={getCanvasDataUrl}
                />
              </div>
            </ActionButtonSizeProvider>
          }
        />
      </div>

      {/* Mobile: bottom-sheet drawer with the same look + feel as
          coloring-ui's MobileColoringDrawer (rounded top, drag handle,
          paper-cream surface, shadow above) so it visually matches the
          /coloring-image/[id] mobile experience visitors will see if
          they sign up. Gated by IntersectionObserver — visible only
          while the canvas is in viewport so it doesn't follow visitors
          into the marketing copy below.
          The drag handle is decorative here — we deliberately don't
          use Vaul because the canvas is the page's main feature, not
          dismissible by mistake. */}
      {isInViewport && (
        <div
          className={cn(
            'md:hidden fixed bottom-0 left-0 right-0 z-40 mx-2',
            'flex flex-col bg-white rounded-t-3xl overflow-hidden',
            'border-2 border-b-0 border-coloring-surface-dark',
            'shadow-[0_-4px_16px_rgba(0,0,0,0.15)]',
            'pb-[max(0.75rem,env(safe-area-inset-bottom))]',
          )}
        >
          {/* Decorative drag-handle pill — matches MobileColoringDrawer */}
          <div
            aria-hidden
            className="flex items-center justify-center pt-3 pb-2 w-full"
          >
            <div className="w-12 h-1.5 rounded-full bg-coloring-surface-dark" />
          </div>
          <div className="px-4 pb-2">
            <SlimColorPalette
              magicAvailable={regionStore.state.isReady}
              onMagicAutoColor={handleMagicAutoColor}
              campaign={campaign}
              trailingAction={
                <ActionButtonSizeProvider value="tile">
                  <div
                    onClickCapture={() =>
                      track(TRACKING_EVENTS.START_HERO_PDF_DOWNLOADED, {
                        campaign,
                        coloringImageId: image.id ?? '',
                        msFromMount: Date.now() - mountTimeRef.current,
                      })
                    }
                  >
                    <SaveButton
                      coloringImage={image}
                      getCanvasDataUrl={getCanvasDataUrl}
                    />
                  </div>
                </ActionButtonSizeProvider>
              }
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default EmbeddedColoringCanvas;

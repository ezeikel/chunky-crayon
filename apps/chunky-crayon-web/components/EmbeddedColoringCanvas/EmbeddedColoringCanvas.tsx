'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { ColoringImage } from '@one-colored-pixel/db/types';
import {
  ImageCanvas,
  MobileColoringDrawer,
  useRegionStore,
  type RegionStoreJson,
} from '@one-colored-pixel/coloring-ui';
import { useAnalytics } from '@/utils/analytics-client';
import { TRACKING_EVENTS } from '@/constants';
import cn from '@/utils/cn';
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
 * - MobileColoringDrawer (mobile tool sheet, gated by IntersectionObserver)
 * - useColoringContext (state from app-root provider — already wraps
 *   the entire app in app/providers.tsx)
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
  const hasTrackedInteractionRef = useRef(false);
  const [isInViewport, setIsInViewport] = useState(false);

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

  // Mobile tool drawer follows the canvas: only mounted when the canvas
  // is in the viewport so it doesn't follow the user as they scroll
  // into the marketing copy below. Debounce 200ms to prevent thrash on
  // slow scroll. Threshold 0.2 = drawer appears when ~20% of the canvas
  // is visible (gives the user time to reach for tools as the canvas
  // scrolls into view rather than waiting until it's fully visible).
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

  const handleFirstInteraction = () => {
    if (hasTrackedInteractionRef.current) return;
    hasTrackedInteractionRef.current = true;
    track(TRACKING_EVENTS.START_HERO_CANVAS_INTERACTED, {
      campaign,
      coloringImageId: image.id ?? '',
    });
  };

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

      {/* Desktop palette (hidden on mobile) */}
      <SlimColorPalette magicAvailable={regionStore.state.isReady} />

      {/* Mobile tool drawer — only mounted while canvas is in viewport.
          Drives all state from the shared context (no isOpen prop). */}
      {isInViewport && (
        <MobileColoringDrawer className="md:hidden fixed bottom-0 left-0 right-0 z-50" />
      )}
    </div>
  );
};

export default EmbeddedColoringCanvas;

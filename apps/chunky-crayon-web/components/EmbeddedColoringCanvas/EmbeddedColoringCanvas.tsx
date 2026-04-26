'use client';

import { useMemo, useRef } from 'react';
import type { ColoringImage } from '@one-colored-pixel/db/types';
import {
  ImageCanvas,
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
  const hasTrackedInteractionRef = useRef(false);

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

  const handleFirstInteraction = () => {
    if (hasTrackedInteractionRef.current) return;
    hasTrackedInteractionRef.current = true;
    track(TRACKING_EVENTS.START_HERO_CANVAS_INTERACTED, {
      campaign,
      coloringImageId: image.id ?? '',
    });
  };

  return (
    <div className={cn('flex flex-col gap-4 items-center w-full', className)}>
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

      {/* Compact palette — visible on both desktop and mobile.
          Replaces coloring-ui's full MobileColoringDrawer which is too
          heavyweight for a marketing landing. */}
      <SlimColorPalette magicAvailable={regionStore.state.isReady} />
    </div>
  );
};

export default EmbeddedColoringCanvas;

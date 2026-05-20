'use client';

import { useEffect, useRef } from 'react';
import {
  useColoringContext,
  COLORING_PALETTE_VARIANTS,
} from '@one-colored-pixel/coloring-ui';
import { useAnalytics } from '@/utils/analytics-client';
import { TRACKING_EVENTS } from '@/constants';

type EmbeddedDrawerTrackerProps = {
  campaign: string;
  /**
   * One-shot auto-color action. Fires when MobileColoringDrawer flips
   * activeTool to 'magic-auto'. After running, the tool is bounced
   * back to 'brush' + 'crayon' so a second tap re-triggers it.
   */
  onMagicAutoColor: () => void;
  /**
   * Whether the region store is ready — magic auto only fires when
   * the pre-computed fills are available, matching ColoringArea's
   * own guard.
   */
  magicReady: boolean;
};

// Renderless sibling that bridges coloring-ui's context-driven drawer
// to /start's analytics + one-shot magic semantics. Lives in the same
// ColoringContextProvider as EmbeddedColoringCanvas (the app-root
// provider wraps everything) so context reads are free.
//
// Why a renderless component rather than effects inside
// EmbeddedColoringCanvas: keeps the analytics + magic-reset wiring
// scoped to mobile-drawer mounts, so when the drawer is gated by
// IntersectionObserver we get start/stop semantics without extra
// flags.
const EmbeddedDrawerTracker = ({
  campaign,
  onMagicAutoColor,
  magicReady,
}: EmbeddedDrawerTrackerProps) => {
  const { track } = useAnalytics();
  const {
    activeTool,
    brushType,
    selectedColor,
    paletteVariant,
    setActiveTool,
    setBrushType,
  } = useColoringContext();

  type SlimToolId = 'crayon' | 'eraser' | 'magic';
  const prevToolRef = useRef<SlimToolId>(
    brushType === 'eraser' ? 'eraser' : 'crayon',
  );
  const prevColorRef = useRef<string>(selectedColor);

  // Magic auto = one-shot. Reset to brush/crayon right after firing so
  // a second tap re-triggers the action (matches the old SlimColorPalette
  // behaviour where Magic was an action, not a sticky tool selection).
  useEffect(() => {
    if (activeTool !== 'magic-auto') return;
    if (!magicReady) {
      // Tool got selected before the region store finished loading —
      // bounce back without painting so the next tap can succeed.
      setActiveTool('brush');
      setBrushType('crayon');
      return;
    }
    onMagicAutoColor();
    track(TRACKING_EVENTS.START_HERO_TOOL_CHANGED, {
      campaign,
      from: prevToolRef.current,
      to: 'magic',
    });
    setActiveTool('brush');
    setBrushType('crayon');
  }, [
    activeTool,
    magicReady,
    onMagicAutoColor,
    setActiveTool,
    setBrushType,
    track,
    campaign,
  ]);

  // Tool switch (crayon ↔ eraser). Magic transitions handled above.
  useEffect(() => {
    if (activeTool === 'magic-auto') return;
    const next: SlimToolId = brushType === 'eraser' ? 'eraser' : 'crayon';
    if (next === prevToolRef.current) return;
    track(TRACKING_EVENTS.START_HERO_TOOL_CHANGED, {
      campaign,
      from: prevToolRef.current,
      to: next,
    });
    prevToolRef.current = next;
  }, [activeTool, brushType, track, campaign]);

  // Color pick. The PostHog schema expects a human-readable color
  // name alongside the hex; look it up in the active palette variant
  // (defaults to 'realistic' on /start since slim hides the switcher).
  useEffect(() => {
    if (selectedColor === prevColorRef.current) return;
    prevColorRef.current = selectedColor;
    const swatch = COLORING_PALETTE_VARIANTS[paletteVariant].find(
      (s) => s.hex === selectedColor,
    );
    track(TRACKING_EVENTS.START_HERO_COLOR_PICKED, {
      campaign,
      color: selectedColor,
      colorName: swatch?.name ?? 'unknown',
    });
  }, [selectedColor, paletteVariant, track, campaign]);

  return null;
};

export default EmbeddedDrawerTracker;

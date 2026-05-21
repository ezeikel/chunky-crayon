"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faDice,
  faCheck,
  faArrowLeft,
  faArrowRight,
  faWandMagicSparkles,
} from "@fortawesome/pro-duotone-svg-icons";
// Lock icon is intentionally a flat solid (grey), not duotone — the
// locked-tile overlay should read as a calm "later" cue, not a coloured
// design element fighting the rest of the row.
import { faLock } from "@fortawesome/pro-solid-svg-icons";
import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import cn from "./cn";

/**
 * SceneBuilder — the privacy-first default create surface.
 *
 * A 3-8yo builds a coloring scene by tapping colourful tiles. Zero
 * typing, no mic, no camera — the whole reason this is the default mode.
 *
 * Wizard, not a wall of options. One question per screen:
 *
 *   Step 1  Who? (required, pick up to `maxSelections`)
 *   Step 2  Where? (required, pick 1)
 *   Step 3  Make it special (OPTIONAL, skippable) — weather + activity +
 *           accent collapsed into one light screen, since none are
 *           required and a kid shouldn't sit through three more screens.
 *
 * The first layer the app passes is Step 1, the second is Step 2, and any
 * remaining layers fold into the optional Step 3. This keeps the data
 * contract identical to before (the app still passes `layers` /
 * `selection` / `onSelectionChange`) — only the interaction model changed.
 *
 * Presentational + controlled + app-agnostic, same contract as
 * InputModeSelector: the app owns the catalogue + i18n, coloring-ui never
 * imports app data, so CC/CH share this. Tokenised; CSS-transition
 * animations only (no framer-motion dep in this package).
 */

// ─── Public data contract (app supplies these) ──────────────────────────────

export type SceneTileDuotone = {
  primary: string;
  secondary: string;
};

export type SceneTileOption = {
  /** Stable key, opaque to this component. */
  key: string;
  /** Short label under the tile. App passes the translated string. */
  label: string;
  /** FA fallback icon, shown when `thumbnailUrl` is null or fails to load. */
  icon: IconDefinition;
  /** Duotone palette for the FA fallback. */
  duotone: SceneTileDuotone;
  /** Generated colourful illustration; null until the asset pipeline runs. */
  thumbnailUrl: string | null;
};

export type SceneLayer = {
  /** Stable layer id (subject, location, weather, activity, accent). */
  id: string;
  /** Step / section heading. App passes the translated string. */
  title: string;
  /** "single" → one selection; "multi" → up to `maxSelections`. */
  kind: "single" | "multi";
  /** Multi-select cap. Ignored for single-select rows. */
  maxSelections?: number;
  options: readonly SceneTileOption[];
};

/**
 * Selection state: layer id → array of selected option keys. Single-select
 * layers hold 0 or 1 entries; multi up to the layer's cap. Controlled by
 * the parent so the app can derive the description + drive submit.
 */
export type SceneSelection = Record<string, readonly string[]>;

export type SceneBuilderLabels = {
  /** Accessible name for the whole picker region. */
  ariaLabel?: string;
  /** Dice button label / tooltip. */
  surpriseMe?: string;
  /** Suffix appended to a locked tile's aria-label, e.g. "(locked)". */
  lockedSuffix?: string;
  /** "Back" button. */
  back?: string;
  /** "Next" button. */
  next?: string;
  /** Final action, e.g. "Create!". */
  create?: string;
  /** Optional-step title, e.g. "Make it special". */
  extrasTitle?: string;
  /** Skip-the-optional-step affordance, e.g. "Skip". */
  skip?: string;
};

export type SceneBuilderProps = {
  layers: readonly SceneLayer[];
  selection: SceneSelection;
  onSelectionChange: (next: SceneSelection) => void;
  /** Dice tap → app rolls a scene and applies it via onSelectionChange. */
  onSurpriseMe?: () => void;
  /** Final "Create!" tap. Enabled only when required steps are satisfied. */
  onCreate?: () => void;
  /**
   * Option keys to render locked (blocked from selection) — used for the
   * `your-character` tile when the kid has no saved character yet.
   * Keyed by layer id → locked option keys.
   */
  lockedKeys?: Record<string, readonly string[]>;
  /** Tap on a locked tile (app decides what to do — e.g. open a flow). */
  onLockedTap?: (layerId: string, optionKey: string) => void;
  disabled?: boolean;
  className?: string;
  labels?: SceneBuilderLabels;
};

// ─── Tile ────────────────────────────────────────────────────────────────────

type SceneTileProps = {
  option: SceneTileOption;
  selected: boolean;
  locked: boolean;
  disabled: boolean;
  lockedSuffix?: string;
  /** "lg" for the focused step grid, "sm" for the optional-step rows. */
  size?: "lg" | "sm";
  onToggle: () => void;
};

const SceneTile = ({
  option,
  selected,
  locked,
  disabled,
  lockedSuffix,
  size = "lg",
  onToggle,
}: SceneTileProps) => {
  const ariaLabel = locked
    ? `${option.label} ${lockedSuffix ?? "(locked)"}`
    : option.label;

  return (
    <button
      type="button"
      role="option"
      aria-selected={selected}
      aria-label={ariaLabel}
      title={option.label}
      disabled={disabled}
      onClick={onToggle}
      className="group flex shrink-0 flex-col items-center gap-2 focus:outline-none"
    >
      <span
        className={cn(
          "relative grid place-items-center overflow-hidden",
          "rounded-coloring-card border bg-white",
          "transition-all duration-coloring-base ease-coloring",
          "focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-coloring-accent",
          size === "lg" ? "size-24 md:size-28" : "size-16 md:size-20",
          // Calm selected state: gentle scale + soft drop-shadow halo + the
          // check badge top-right. No heavy orange border, no orange label —
          // those together read as alarming rather than "you picked this".
          selected
            ? "border-transparent scale-105 shadow-[0_6px_18px_rgba(255,138,61,0.35)]"
            : "border-coloring-surface-dark",
          !disabled &&
            !selected &&
            "group-hover:border-coloring-accent/40 group-hover:bg-coloring-surface group-active:scale-95",
          disabled && "opacity-60",
        )}
        style={
          {
            "--fa-primary-color": option.duotone.primary,
            "--fa-secondary-color": option.duotone.secondary,
            "--fa-secondary-opacity": "1",
          } as React.CSSProperties
        }
      >
        {option.thumbnailUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={option.thumbnailUrl}
            alt=""
            className="size-full object-cover"
            draggable={false}
          />
        ) : (
          <FontAwesomeIcon
            icon={option.icon}
            className={size === "lg" ? "text-6xl" : "text-4xl"}
          />
        )}

        {selected && (
          <span
            className={cn(
              "absolute right-1.5 top-1.5 grid size-7 place-items-center",
              "rounded-full bg-coloring-accent text-white",
              "animate-in zoom-in duration-coloring-fast",
            )}
            aria-hidden="true"
          >
            <FontAwesomeIcon icon={faCheck} className="text-sm" />
          </span>
        )}

        {locked && (
          <span
            className={cn(
              "absolute inset-0 grid place-items-center",
              // Soft grey wash, no blur. The lock reads as "later" not
              // "denied"; duotone tinting on the lock fights the rest of
              // the row, so we force flat neutral grey here.
              "bg-neutral-200/80",
            )}
            aria-hidden="true"
            // Override the parent's duotone vars — the lock is intentionally
            // flat grey, not in the tile's brand colour.
            style={
              {
                "--fa-primary-color": "rgb(115, 115, 115)",
              } as React.CSSProperties
            }
          >
            <FontAwesomeIcon icon={faLock} className="text-2xl" />
          </span>
        )}
      </span>

      {/* Label stays default colour even when selected — turning it
          orange together with the tile glow read as alarming, not chosen. */}
      <span
        className={cn(
          "max-w-28 truncate text-center text-sm font-semibold",
          "text-coloring-text-primary",
        )}
      >
        {option.label}
      </span>
    </button>
  );
};

// ─── Tile carousel (one layer's options, scroll-snap, swipeable) ────────────
//
// Why a carousel and not a wrap grid: at 13+ subjects the wrap grid grows
// the card vertically, breaking the original-form-footprint promise. A
// horizontal scroll-snap track keeps the step at a constant height
// regardless of catalogue size and matches how kids actually flick through
// content on tablets.
//
// Implementation notes:
//   - `scroll-snap-x mandatory` + `snap-center` per tile gives native
//     touch swipe + clean arrow-button paging with zero JS animation.
//   - Page dots derive from `scrollLeft` / containerWidth, recomputed on
//     scroll + resize. No external observer needed.
//   - Arrows live OUTSIDE the scroll region so they don't fight pointer
//     events with a swipe.

type TileCarouselProps = {
  layer: SceneLayer;
  selected: readonly string[];
  locked: readonly string[];
  disabled: boolean;
  lockedSuffix?: string;
  size?: "lg" | "sm";
  onToggle: (optionKey: string) => void;
  onLockedTap?: (optionKey: string) => void;
};

const TileCarousel = ({
  layer,
  selected,
  locked,
  disabled,
  lockedSuffix,
  size = "lg",
  onToggle,
  onLockedTap,
}: TileCarouselProps) => {
  const lockedSet = useMemo(() => new Set(locked), [locked]);
  const selectedSet = useMemo(() => new Set(selected), [selected]);
  const trackRef = useRef<HTMLDivElement | null>(null);

  // Swipe + click-and-drag. There are two gestures we have to cover:
  //
  //   1. Touch swipe on tablets/phones. `overflow-x-auto` alone isn't
  //      enough — when the page itself is vertically scrollable, the
  //      browser can interpret an ambiguous diagonal swipe as vertical
  //      and skip our horizontal scroll entirely. `touch-action: pan-x`
  //      (Tailwind `touch-pan-x`) explicitly claims the horizontal pan
  //      gesture for this element so swipe lands reliably.
  //
  //   2. Mouse click-and-drag on desktop. Browsers do NOT enable this
  //      natively on `overflow-x-auto`. We wire pointer events ourselves
  //      and guard tile clicks with a 5px movement threshold so a real
  //      tap still selects the tile underneath the cursor.
  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;

    // Skip on touch devices — the native swipe gesture already drives
    // the scroll there; we don't want our pointer handler racing with it.
    let dragging = false;
    let startX = 0;
    let startScroll = 0;
    let moved = 0;

    const onPointerDown = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      dragging = true;
      moved = 0;
      startX = e.clientX;
      startScroll = el.scrollLeft;
      el.setPointerCapture(e.pointerId);
      el.style.cursor = "grabbing";
      // Pause snap during the drag so the strip follows the cursor 1:1
      // instead of jerking to nearest snap point on every pixel.
      el.style.scrollSnapType = "none";
    };
    const onPointerMove = (e: PointerEvent) => {
      if (!dragging) return;
      const dx = e.clientX - startX;
      moved = Math.max(moved, Math.abs(dx));
      el.scrollLeft = startScroll - dx;
    };
    const endDrag = (e: PointerEvent) => {
      if (!dragging) return;
      dragging = false;
      el.style.cursor = "";
      // Re-enable snap; the strip animates to the nearest snap point.
      el.style.scrollSnapType = "";
      try {
        el.releasePointerCapture(e.pointerId);
      } catch {
        /* already released */
      }
    };
    // If movement exceeded the threshold, swallow the click so the tile
    // underneath doesn't fire. Capture phase so we beat the tile's own
    // onClick.
    const onClickCapture = (e: MouseEvent) => {
      if (moved > 5) {
        e.stopPropagation();
        e.preventDefault();
      }
      moved = 0;
    };

    el.addEventListener("pointerdown", onPointerDown);
    el.addEventListener("pointermove", onPointerMove);
    el.addEventListener("pointerup", endDrag);
    el.addEventListener("pointercancel", endDrag);
    el.addEventListener("click", onClickCapture, true);
    return () => {
      el.removeEventListener("pointerdown", onPointerDown);
      el.removeEventListener("pointermove", onPointerMove);
      el.removeEventListener("pointerup", endDrag);
      el.removeEventListener("pointercancel", endDrag);
      el.removeEventListener("click", onClickCapture, true);
    };
  }, []);

  return (
    <div
      ref={trackRef}
      role="listbox"
      aria-label={layer.title}
      aria-multiselectable={layer.kind === "multi"}
      className={cn(
        "flex gap-3 overflow-x-auto px-2 md:gap-4",
        "snap-x snap-mandatory scroll-px-2",
        // Claim horizontal pan for touch so an ambiguous diagonal swipe
        // doesn't get hijacked by the page's vertical scroll. Without
        // this, touch-swipe is unreliable when the form sits in a
        // vertically scrollable page (which is always).
        "touch-pan-x",
        // Tell desktop users they can drag; the JS handler does the work.
        "cursor-grab select-none",
        // Native scrollbar hidden — edge-peek is the visual cue, not a bar.
        "[-ms-overflow-style:none] [scrollbar-width:none]",
        "[&::-webkit-scrollbar]:hidden",
        "py-2",
      )}
    >
      {layer.options.map((option) => {
        const isLocked = lockedSet.has(option.key);
        return (
          <div key={option.key} className="snap-center shrink-0">
            <SceneTile
              option={option}
              selected={selectedSet.has(option.key)}
              locked={isLocked}
              disabled={disabled}
              lockedSuffix={lockedSuffix}
              size={size}
              onToggle={() =>
                isLocked ? onLockedTap?.(option.key) : onToggle(option.key)
              }
            />
          </div>
        );
      })}
    </div>
  );
};

// ─── SceneBuilder (wizard) ───────────────────────────────────────────────────

const SceneBuilder = ({
  layers,
  selection,
  onSelectionChange,
  onSurpriseMe,
  onCreate,
  lockedKeys,
  onLockedTap,
  disabled = false,
  className,
  labels = {},
}: SceneBuilderProps) => {
  // Layer 0 → step 1 (required), layer 1 → step 2 (required), the rest →
  // one optional "make it special" step. Defensive against odd layer
  // counts so the app can't crash this by passing < 2 layers.
  const subjectLayer = layers[0];
  const locationLayer = layers[1];
  const extraLayers = useMemo(() => layers.slice(2), [layers]);

  // Steps: 0 = subject, 1 = location, 2 = (optional) extras. Extras only
  // exists as a step if there are extra layers to show. We don't surface
  // step numbers in the UI any more (kids don't read them); progress is
  // implicit in the question changing + the carousel page dots.
  const hasExtras = extraLayers.length > 0;
  const [step, setStep] = useState(0);

  const toggleOption = (layer: SceneLayer, optionKey: string) => {
    if (disabled) return;
    const current = selection[layer.id] ?? [];
    const isSelected = current.includes(optionKey);

    let nextForLayer: string[];
    if (layer.kind === "single") {
      nextForLayer = isSelected ? [] : [optionKey];
    } else if (isSelected) {
      nextForLayer = current.filter((k) => k !== optionKey);
    } else {
      const cap = layer.maxSelections ?? Infinity;
      nextForLayer =
        current.length >= cap
          ? [...current.slice(1), optionKey]
          : [...current, optionKey];
    }
    onSelectionChange({ ...selection, [layer.id]: nextForLayer });
  };

  const subjectChosen = (selection[subjectLayer?.id ?? ""] ?? []).length > 0;
  const locationChosen = (selection[locationLayer?.id ?? ""] ?? []).length > 0;

  const canAdvanceFromSubject = subjectChosen;
  const canAdvanceFromLocation = locationChosen;
  const canCreate = subjectChosen && locationChosen;

  // Tighter than the previous title — the card has to stay close to the
  // original form footprint, so step heading + tile row + CTA need to fit
  // without the card outgrowing its old size.
  const renderTitle = (text: string) => (
    <h2 className="text-center text-base font-bold text-coloring-text-primary md:text-lg">
      {text}
    </h2>
  );

  return (
    <div
      className={cn("flex flex-col gap-3", className)}
      role="group"
      aria-label={labels.ariaLabel ?? "Build your picture"}
    >
      {/* Surprise me — kid-prominent. The most playful affordance shouldn't
          read as the most timid; it's a chunky filled brand pill, not a
          ghost button. We deliberately dropped the "STEP X OF Y" text and
          step dots — a 3-8yo doesn't read either, and the carousel page
          dots beneath the tiles already carry "your place in this set"
          unambiguously. Two competing dot rows confuse adults, never mind
          kids. */}
      {onSurpriseMe && (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={onSurpriseMe}
            disabled={disabled}
            aria-label={labels.surpriseMe ?? "Surprise me!"}
            title={labels.surpriseMe ?? "Surprise me!"}
            className={cn(
              "flex items-center gap-2 rounded-full",
              "bg-coloring-accent px-4 py-2 text-sm font-bold text-white",
              "shadow-coloring-button transition-all duration-coloring-base",
              "focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-coloring-accent",
              !disabled && "hover:brightness-105 active:scale-95",
              disabled && "opacity-50",
            )}
          >
            <FontAwesomeIcon icon={faDice} className="text-base" />
            {labels.surpriseMe ?? "Surprise me!"}
          </button>
        </div>
      )}

      {/* Step 1 — Who? (required) */}
      {step === 0 && subjectLayer && (
        <div className="flex flex-col gap-3">
          {renderTitle(subjectLayer.title)}
          <TileCarousel
            layer={subjectLayer}
            selected={selection[subjectLayer.id] ?? []}
            locked={lockedKeys?.[subjectLayer.id] ?? []}
            disabled={disabled}
            lockedSuffix={labels.lockedSuffix}
            onToggle={(k) => toggleOption(subjectLayer, k)}
            onLockedTap={
              onLockedTap ? (k) => onLockedTap(subjectLayer.id, k) : undefined
            }
          />
          <div className="flex justify-end">
            <button
              type="button"
              disabled={disabled || !canAdvanceFromSubject}
              onClick={() => setStep(1)}
              className={cn(
                "flex items-center gap-2 rounded-coloring-button px-6 py-3",
                "text-base font-bold transition-all duration-coloring-base",
                "focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-coloring-accent",
                canAdvanceFromSubject && !disabled
                  ? "bg-coloring-accent text-white shadow-coloring-button hover:brightness-105 active:scale-95"
                  : "cursor-not-allowed bg-coloring-surface-dark text-coloring-muted",
              )}
            >
              {labels.next ?? "Next"}
              <FontAwesomeIcon icon={faArrowRight} />
            </button>
          </div>
        </div>
      )}

      {/* Step 2 — Where? (required) */}
      {step === 1 && locationLayer && (
        <div className="flex flex-col gap-3">
          {renderTitle(locationLayer.title)}
          <TileCarousel
            layer={locationLayer}
            selected={selection[locationLayer.id] ?? []}
            locked={lockedKeys?.[locationLayer.id] ?? []}
            disabled={disabled}
            lockedSuffix={labels.lockedSuffix}
            onToggle={(k) => toggleOption(locationLayer, k)}
          />
          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              disabled={disabled}
              onClick={() => setStep(0)}
              className={cn(
                "flex items-center gap-2 rounded-coloring-button px-5 py-3",
                "text-base font-semibold text-coloring-text-secondary",
                "transition-all duration-coloring-base",
                "focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-coloring-accent",
                "hover:bg-coloring-surface active:scale-95",
              )}
            >
              <FontAwesomeIcon icon={faArrowLeft} />
              {labels.back ?? "Back"}
            </button>
            {hasExtras ? (
              <button
                type="button"
                disabled={disabled || !canAdvanceFromLocation}
                onClick={() => setStep(2)}
                className={cn(
                  "flex items-center gap-2 rounded-coloring-button px-6 py-3",
                  "text-base font-bold transition-all duration-coloring-base",
                  "focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-coloring-accent",
                  canAdvanceFromLocation && !disabled
                    ? "bg-coloring-accent text-white shadow-coloring-button hover:brightness-105 active:scale-95"
                    : "cursor-not-allowed bg-coloring-surface-dark text-coloring-muted",
                )}
              >
                {labels.next ?? "Next"}
                <FontAwesomeIcon icon={faArrowRight} />
              </button>
            ) : (
              <button
                type="button"
                disabled={disabled || !canCreate}
                onClick={() => onCreate?.()}
                className={cn(
                  "flex items-center gap-2 rounded-coloring-button px-6 py-3",
                  "text-base font-bold transition-all duration-coloring-base",
                  "focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-coloring-accent",
                  canCreate && !disabled
                    ? "bg-coloring-accent text-white shadow-coloring-button hover:brightness-105 active:scale-95"
                    : "cursor-not-allowed bg-coloring-surface-dark text-coloring-muted",
                )}
              >
                <FontAwesomeIcon icon={faWandMagicSparkles} />
                {labels.create ?? "Create!"}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Step 3 — Make it special (OPTIONAL, skippable) */}
      {step === 2 && hasExtras && (
        <div className="flex flex-col gap-3">
          {renderTitle(labels.extrasTitle ?? "Make it special")}
          {extraLayers.map((layer) => (
            <section key={layer.id} className="flex flex-col gap-1.5">
              <h3 className="text-center text-xs font-semibold uppercase tracking-wide text-coloring-text-secondary">
                {layer.title}
              </h3>
              <TileCarousel
                layer={layer}
                selected={selection[layer.id] ?? []}
                locked={lockedKeys?.[layer.id] ?? []}
                disabled={disabled}
                lockedSuffix={labels.lockedSuffix}
                size="sm"
                onToggle={(k) => toggleOption(layer, k)}
              />
            </section>
          ))}
          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              disabled={disabled}
              onClick={() => setStep(1)}
              className={cn(
                "flex items-center gap-2 rounded-coloring-button px-5 py-3",
                "text-base font-semibold text-coloring-text-secondary",
                "transition-all duration-coloring-base",
                "focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-coloring-accent",
                "hover:bg-coloring-surface active:scale-95",
              )}
            >
              <FontAwesomeIcon icon={faArrowLeft} />
              {labels.back ?? "Back"}
            </button>
            <button
              type="button"
              disabled={disabled || !canCreate}
              onClick={() => onCreate?.()}
              className={cn(
                "flex items-center gap-2 rounded-coloring-button px-6 py-3",
                "text-base font-bold transition-all duration-coloring-base",
                "focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-coloring-accent",
                canCreate && !disabled
                  ? "bg-coloring-accent text-white shadow-coloring-button hover:brightness-105 active:scale-95"
                  : "cursor-not-allowed bg-coloring-surface-dark text-coloring-muted",
              )}
            >
              <FontAwesomeIcon icon={faWandMagicSparkles} />
              {labels.create ?? "Create!"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default SceneBuilder;

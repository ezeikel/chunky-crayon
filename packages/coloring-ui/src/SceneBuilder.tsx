"use client";

import { useMemo } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faDice, faCheck, faLock } from "@fortawesome/pro-duotone-svg-icons";
import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import cn from "./cn";

/**
 * SceneBuilder — the privacy-first default create surface.
 *
 * A kid layers a coloring scene by tapping colourful tiles across five
 * rows (subjects, location, weather, activity, accent). Zero typing, no
 * mic, no camera — the whole reason this is the default mode.
 *
 * This component is **presentational + controlled + app-agnostic**, the
 * same contract as InputModeSelector: the app owns the catalogue data and
 * selection state and passes them in. coloring-ui never imports the
 * app-side `lib/scene` catalogue, so CC and CH can share this component
 * while keeping brand-specific option sets and i18n in the app.
 *
 * Tokenised throughout (`coloring-accent`, `coloring-surface`, etc.) so it
 * renders in the active brand's theme. Animations are CSS transitions —
 * coloring-ui has no framer-motion dependency and the existing components
 * (InputModeSelector) animate the same way.
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
  /** Row heading. App passes the translated string. */
  title: string;
  /** "single" → one selection; "multi" → up to `maxSelections`. */
  kind: "single" | "multi";
  /** Multi-select cap. Ignored for single-select rows. */
  maxSelections?: number;
  options: readonly SceneTileOption[];
};

/**
 * Selection state: layer id → array of selected option keys. Single-select
 * rows hold 0 or 1 entries; multi-select up to the layer's cap. Controlled
 * by the parent so the app can derive the description + drive submit.
 */
export type SceneSelection = Record<string, readonly string[]>;

export type SceneBuilderLabels = {
  /** Accessible name for the whole picker region. */
  ariaLabel?: string;
  /** Dice button label / tooltip. */
  surpriseMe?: string;
  /** Suffix appended to a locked tile's aria-label, e.g. "(locked)". */
  lockedSuffix?: string;
};

export type SceneBuilderProps = {
  layers: readonly SceneLayer[];
  selection: SceneSelection;
  onSelectionChange: (next: SceneSelection) => void;
  /** Dice tap → app rolls a scene and applies it via onSelectionChange. */
  onSurpriseMe?: () => void;
  /**
   * Option keys to render with a lock badge and block from selection
   * (used for the `your-character` tile when the kid has no saved
   * character yet — tap routes to character creation in the app).
   * Keyed by layer id → set of locked option keys.
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
  onToggle: () => void;
};

const SceneTile = ({
  option,
  selected,
  locked,
  disabled,
  lockedSuffix,
  onToggle,
}: SceneTileProps) => {
  const isInert = disabled || (locked && !onToggle);
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
      className={cn(
        "relative flex shrink-0 flex-col items-center gap-1.5",
        "focus:outline-none",
      )}
    >
      <span
        className={cn(
          // Chunky kid tap target. --coloring-touch-target is the brand's
          // min tap size; the tile is comfortably above 44pt either way.
          "relative grid size-20 place-items-center overflow-hidden md:size-24",
          "rounded-coloring-card border-2",
          "transition-all duration-coloring-base ease-coloring",
          "focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-coloring-accent",
          selected
            ? "border-coloring-accent shadow-coloring-button scale-105"
            : "border-coloring-surface-dark bg-white",
          !isInert &&
            !selected &&
            "hover:border-coloring-accent hover:bg-coloring-surface active:scale-95",
          isInert && "opacity-60",
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
            className="text-4xl md:text-5xl"
          />
        )}

        {selected && (
          <span
            className={cn(
              "absolute right-1 top-1 grid size-6 place-items-center",
              "rounded-full bg-coloring-accent text-white",
              "animate-in zoom-in duration-coloring-fast",
            )}
            aria-hidden="true"
          >
            <FontAwesomeIcon icon={faCheck} className="text-xs" />
          </span>
        )}

        {locked && (
          <span
            className={cn(
              "absolute inset-0 grid place-items-center",
              "bg-coloring-text-primary/40 backdrop-blur-[1px]",
            )}
            aria-hidden="true"
          >
            <FontAwesomeIcon
              icon={faLock}
              className="text-2xl text-white drop-shadow"
            />
          </span>
        )}
      </span>

      <span
        className={cn(
          "max-w-20 truncate text-xs font-medium md:max-w-24",
          selected ? "text-coloring-accent" : "text-coloring-text-secondary",
        )}
      >
        {option.label}
      </span>
    </button>
  );
};

// ─── Layer row ───────────────────────────────────────────────────────────────

type SceneLayerRowProps = {
  layer: SceneLayer;
  selected: readonly string[];
  locked: readonly string[];
  disabled: boolean;
  lockedSuffix?: string;
  onToggle: (optionKey: string) => void;
  onLockedTap?: (optionKey: string) => void;
};

const SceneLayerRow = ({
  layer,
  selected,
  locked,
  disabled,
  lockedSuffix,
  onToggle,
  onLockedTap,
}: SceneLayerRowProps) => {
  const lockedSet = useMemo(() => new Set(locked), [locked]);
  const selectedSet = useMemo(() => new Set(selected), [selected]);

  return (
    <section aria-label={layer.title} className="flex flex-col gap-2">
      <h3 className="px-1 text-sm font-semibold text-coloring-text-primary">
        {layer.title}
      </h3>
      {/* Horizontal scroll keeps each row to one swipeable strip — far
          easier for a small child than a reflowing grid. */}
      <div
        role="listbox"
        aria-label={layer.title}
        aria-multiselectable={layer.kind === "multi"}
        className={cn(
          "flex gap-3 overflow-x-auto pb-2",
          "[-ms-overflow-style:none] [scrollbar-width:thin]",
        )}
      >
        {layer.options.map((option) => {
          const isLocked = lockedSet.has(option.key);
          return (
            <SceneTile
              key={option.key}
              option={option}
              selected={selectedSet.has(option.key)}
              locked={isLocked}
              disabled={disabled}
              lockedSuffix={lockedSuffix}
              onToggle={() =>
                isLocked ? onLockedTap?.(option.key) : onToggle(option.key)
              }
            />
          );
        })}
      </div>
    </section>
  );
};

// ─── Dice button ─────────────────────────────────────────────────────────────

type DiceButtonProps = {
  label: string;
  disabled: boolean;
  onClick: () => void;
};

const DiceButton = ({ label, disabled, onClick }: DiceButtonProps) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    aria-label={label}
    title={label}
    className={cn(
      "group flex items-center gap-2 self-center",
      "rounded-coloring-button border-2 border-coloring-accent",
      "bg-white px-4 py-2 text-sm font-bold text-coloring-accent",
      "transition-all duration-coloring-base ease-coloring",
      "focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-coloring-accent",
      !disabled && "hover:bg-coloring-accent hover:text-white active:scale-95",
      disabled && "opacity-50",
    )}
  >
    <FontAwesomeIcon
      icon={faDice}
      className={cn(
        "text-lg transition-transform duration-coloring-base",
        !disabled && "group-hover:rotate-[20deg] group-active:rotate-[360deg]",
      )}
    />
    {label}
  </button>
);

// ─── SceneBuilder ────────────────────────────────────────────────────────────

const SceneBuilder = ({
  layers,
  selection,
  onSelectionChange,
  onSurpriseMe,
  lockedKeys,
  onLockedTap,
  disabled = false,
  className,
  labels = {},
}: SceneBuilderProps) => {
  const toggleOption = (layer: SceneLayer, optionKey: string) => {
    if (disabled) return;
    const current = selection[layer.id] ?? [];
    const isSelected = current.includes(optionKey);

    let nextForLayer: string[];
    if (layer.kind === "single") {
      // Tap-again deselects so a kid can clear an optional row.
      nextForLayer = isSelected ? [] : [optionKey];
    } else if (isSelected) {
      nextForLayer = current.filter((k) => k !== optionKey);
    } else {
      const cap = layer.maxSelections ?? Infinity;
      if (current.length >= cap) {
        // At the cap: drop the oldest pick so the newest tap still
        // registers (kids don't read "you can pick 3" — they just tap).
        nextForLayer = [...current.slice(1), optionKey];
      } else {
        nextForLayer = [...current, optionKey];
      }
    }

    onSelectionChange({ ...selection, [layer.id]: nextForLayer });
  };

  return (
    <div
      className={cn("flex flex-col gap-5", className)}
      role="group"
      aria-label={labels.ariaLabel ?? "Build your scene"}
    >
      {layers.map((layer) => (
        <SceneLayerRow
          key={layer.id}
          layer={layer}
          selected={selection[layer.id] ?? []}
          locked={lockedKeys?.[layer.id] ?? []}
          disabled={disabled}
          lockedSuffix={labels.lockedSuffix}
          onToggle={(optionKey) => toggleOption(layer, optionKey)}
          onLockedTap={
            onLockedTap
              ? (optionKey) => onLockedTap(layer.id, optionKey)
              : undefined
          }
        />
      ))}

      {onSurpriseMe && (
        <DiceButton
          label={labels.surpriseMe ?? "Surprise me!"}
          disabled={disabled}
          onClick={onSurpriseMe}
        />
      )}
    </div>
  );
};

export default SceneBuilder;

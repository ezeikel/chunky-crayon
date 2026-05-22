import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import {
  SceneTile,
  type SceneTileOption,
} from '@one-colored-pixel/coloring-ui';
import {
  SPECIES_OPTIONS,
  TRAIT_OPTIONS,
  VOICE_TILES,
} from '@/lib/characters/picker-catalog';
import { resolveThumbnailUrl } from '@/lib/scene/thumbnail-url';

/**
 * The Characters section — the illustration tiles the Create Character
 * flow (Character Builder) is built from.
 *
 * Every species ("friend"), trait, and voice in the picker catalog
 * (`lib/characters/picker-catalog.ts`) is rendered here with the real
 * `SceneTile` component from coloring-ui — the same tile the modal's
 * `TileCarousel` renders. So tweaking the tile or swapping an
 * illustration shows up here exactly as it does in the app.
 *
 * Each catalog entry carries an R2 `thumbnailKey` (the colourful
 * illustration) and an FA `icon` fallback. `resolveThumbnailUrl` builds
 * the public URL; if it returns null SceneTile falls back to the icon.
 */
const meta = {
  title: 'Chunky Crayon/08 Characters',
  parameters: {
    docs: {
      description: {
        component:
          'Character Builder illustration tiles — every species, trait, and voice from the picker catalog, rendered with the real SceneTile component. The reference for the Create Character flow.',
      },
    },
  },
} satisfies Meta;

export default meta;
type Story = StoryObj;

// Catalog entries store env-agnostic R2 keys; resolveThumbnailUrl builds
// the public URL at render time. Same `toTile` shape the modal uses.
const toTile = (o: {
  key: string;
  label: string;
  icon: SceneTileOption['icon'];
  duotone: SceneTileOption['duotone'];
  thumbnailKey: string | null;
}): SceneTileOption => ({
  key: o.key,
  label: o.label,
  icon: o.icon,
  duotone: o.duotone,
  thumbnailUrl: resolveThumbnailUrl(o.thumbnailKey),
});

const SPECIES_TILES = SPECIES_OPTIONS.map(toTile);
const TRAIT_TILES = TRAIT_OPTIONS.map(toTile);
const VOICE_TILE_OPTIONS = VOICE_TILES.map(toTile);

/**
 * A labelled grid of SceneTiles. Tiles are tappable — tapping toggles
 * the select ring, so the selected state is reviewable directly. A
 * default selection can be seeded so the story documents both states.
 */
const TileGrid = ({
  heading,
  blurb,
  tiles,
  defaultSelected = [],
}: {
  heading: string;
  blurb: string;
  tiles: readonly SceneTileOption[];
  defaultSelected?: string[];
}) => {
  const [selected, setSelected] = useState<string[]>(defaultSelected);

  const toggle = (key: string) =>
    setSelected((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key],
    );

  return (
    <section className="space-y-3">
      <div>
        <h2 className="font-tondo text-xl font-bold text-text-primary">
          {heading}
        </h2>
        <p className="text-sm text-text-secondary">{blurb}</p>
      </div>
      <div className="flex flex-wrap gap-4 rounded-3xl border-2 border-paper-cream-dark bg-white p-6 shadow-card">
        {tiles.map((tile) => (
          <SceneTile
            key={tile.key}
            option={tile}
            selected={selected.includes(tile.key)}
            locked={false}
            disabled={false}
            onToggle={() => toggle(tile.key)}
          />
        ))}
      </div>
    </section>
  );
};

const Stage = ({ children }: { children: React.ReactNode }) => (
  <main className="min-h-screen space-y-10 bg-paper p-8">{children}</main>
);

// ─── Species ("friends") ──────────────────────────────────────────────

export const Species: Story = {
  name: 'Species (friends)',
  render: () => (
    <Stage>
      <TileGrid
        heading="Species"
        blurb="The 8 creature types in step 1 of the Character Builder — dragon, puppy, kitten, unicorn, robot, kid, fairy, monster. Single-select."
        tiles={SPECIES_TILES}
        defaultSelected={['dragon']}
      />
    </Stage>
  ),
};

// ─── Traits ───────────────────────────────────────────────────────────

export const Traits: Story = {
  name: 'Traits',
  render: () => (
    <Stage>
      <TileGrid
        heading="Traits"
        blurb="The 8 personality traits in step 3 — brave, sleepy, silly, shy, snacky, bouncy, curious, sparkly. Multi-select, up to 3."
        tiles={TRAIT_TILES}
        defaultSelected={['brave', 'curious']}
      />
    </Stage>
  ),
};

// ─── Voices ───────────────────────────────────────────────────────────

export const Voices: Story = {
  name: 'Voices',
  render: () => (
    <Stage>
      <TileGrid
        heading="Voices"
        blurb="The 8 voice personas in step 5 — warm, cosy, bouncy, playful, sleepy, brave, silly, gentle. Single-select, optional."
        tiles={VOICE_TILE_OPTIONS}
        defaultSelected={['warm-girl-7yo']}
      />
    </Stage>
  ),
};

// ─── All catalog tiles ────────────────────────────────────────────────

export const AllTiles: Story = {
  name: 'All character tiles',
  render: () => (
    <Stage>
      <TileGrid
        heading="Species"
        blurb="Step 1 — pick your friend."
        tiles={SPECIES_TILES}
      />
      <TileGrid
        heading="Traits"
        blurb="Step 3 — what are they like? Pick up to 3."
        tiles={TRAIT_TILES}
      />
      <TileGrid
        heading="Voices"
        blurb="Step 5 — pick a voice. Optional."
        tiles={VOICE_TILE_OPTIONS}
      />
    </Stage>
  ),
};

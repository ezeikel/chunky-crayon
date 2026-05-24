import type { Meta, StoryObj } from '@storybook/react-vite';
import { ColoAvatar } from '@/components/ColoAvatar';
import StickerCard from '@/components/StickerBook/StickerCard';
import { COLO_STAGES } from '@/lib/colo';
import type { ColoStage } from '@/lib/colo';
import { STICKER_CATALOG } from '@/lib/stickers/catalog';
import type { Sticker, StickerRarity } from '@/lib/stickers/types';

/**
 * Mascot & Stickers — the two kid-facing collectible systems.
 *
 * Colo evolves through 6 stages (Baby → Master) as kids save more
 * artwork; stickers are 22 unlockable achievements grouped by rarity.
 * Both are catalog-driven, so the stories render the full set at a
 * glance — tweak a Colo stage asset or sticker artwork and see every
 * spot it lands.
 *
 * Components used are the real ones the app renders: `ColoAvatar`
 * (which reads `COLO_STAGES`) and `StickerCard` (which reads from
 * `STICKER_CATALOG`).
 */
const meta = {
  title: 'Chunky Crayon/10 Mascot & Stickers',
  parameters: {
    docs: {
      description: {
        component:
          'Colo evolution stages and the full sticker catalog. The reference for two kid-facing progress systems — change a stage asset or sticker artwork and check every state lands.',
      },
    },
  },
} satisfies Meta;

export default meta;
type Story = StoryObj;

const Stage = ({ children }: { children: React.ReactNode }) => (
  <main className="min-h-screen space-y-10 bg-paper p-8">{children}</main>
);

// ─── Colo — all 6 stages ──────────────────────────────────────────────

const STAGES: ColoStage[] = [1, 2, 3, 4, 5, 6];

export const ColoStages: Story = {
  name: 'Colo — all 6 stages',
  render: () => (
    <Stage>
      <section className="space-y-3">
        <div>
          <h2 className="font-tondo text-xl font-bold text-text-primary">
            Colo evolution stages
          </h2>
          <p className="text-sm text-text-secondary">
            Six stages, unlocked by saved-artwork count. The kid sees Colo grow
            as they color more pages.
          </p>
        </div>
        <div className="grid gap-4 rounded-3xl border-2 border-paper-cream-dark bg-white p-6 shadow-card sm:grid-cols-3 lg:grid-cols-6">
          {STAGES.map((stage) => {
            const info = COLO_STAGES[stage];
            return (
              <div
                key={stage}
                className="flex flex-col items-center gap-3 rounded-2xl border-2 border-paper-cream-dark/60 bg-paper p-4 text-center"
              >
                <ColoAvatar stage={stage} size="lg" />
                <div>
                  <p className="font-tondo text-base font-bold text-text-primary">
                    {info.name}
                  </p>
                  <p className="text-xs text-text-secondary">
                    {info.description}
                  </p>
                  <p className="mt-2 text-[10px] uppercase tracking-wide text-text-tertiary">
                    Stage {stage} · {info.requiredArtworks}+ saved
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </Stage>
  ),
};

// ─── Colo — tooltip (hover/tap state) ────────────────────────────────
// The tooltip used to be four stacked text blocks (title +
// description + a "50/30 artworks" fraction + a Tap-me pill); the
// fraction could read "50/30" and the matching dashboard subtitle
// went "Save -20 more artworks to evolve!" when the kid overshot a
// stage threshold. Redesigned for 3-8yo: just the stage name as a big
// headline, a visual progress bar (no fraction), and a chunky brand-
// orange "Tap me!" pill. At max stage the bar becomes a four-star
// "all done" badge instead of math. Service-level cap on
// `progressToNext.current` keeps the bar inside [0,100%].

const sampleColoState = (stage: ColoStage, artworkCount: number) => {
  const info = COLO_STAGES[stage];
  const next = stage < 6 ? COLO_STAGES[(stage + 1) as ColoStage] : null;
  const required = next?.requiredArtworks ?? 0;
  const capped = Math.min(artworkCount, required);
  return {
    stage,
    stageName: info.name,
    stageDescription: info.description,
    imagePath: info.imagePath,
    accessories: [],
    nextStage: next,
    progressToNext: next
      ? {
          current: capped,
          required,
          percentage: Math.round((capped / required) * 100),
        }
      : null,
  };
};

const TooltipDemo = ({
  stage,
  artworkCount,
  label,
}: {
  stage: ColoStage;
  artworkCount: number;
  label: string;
}) => (
  // `forceTooltipOpen` keeps the bubble pinned so the story IS the
  // tooltip — no hover dance needed. Heavy bottom padding gives the
  // bubble room to land below the avatar without clipping the next
  // card in the grid.
  <div className="flex flex-col items-center gap-3 rounded-2xl border-2 border-paper-cream-dark/60 bg-paper p-4 pb-48">
    <ColoAvatar
      stage={stage}
      coloState={sampleColoState(stage, artworkCount)}
      size="lg"
      forceTooltipOpen
      enableTapReactions
    />
    <p className="font-tondo text-sm font-bold text-text-secondary">{label}</p>
  </div>
);

export const ColoTooltip: Story = {
  name: 'Colo — tooltip (every progress state)',
  render: () => (
    <Stage>
      <section className="space-y-3">
        <div>
          <h2 className="font-tondo text-xl font-bold text-text-primary">
            Tooltip — 3-8yo redesign
          </h2>
          <p className="text-sm text-text-secondary">
            Headline = stage name. Progress is a visual bar, no fraction. Max
            stage swaps the bar for four stars. Tap-me pill is the only piece of
            meaningful copy. Tooltips are pinned open (forceTooltipOpen) so the
            story IS the tooltip.
          </p>
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <TooltipDemo
            stage={2}
            artworkCount={2}
            label="Early progress (2 / 15 to next)"
          />
          <TooltipDemo
            stage={3}
            artworkCount={28}
            label="Nearly there (28 / 30 to next)"
          />
          <TooltipDemo
            stage={3}
            artworkCount={100}
            label="Overshoot capped at 30 (was the bug)"
          />
          <TooltipDemo stage={4} artworkCount={40} label="Mid-stage" />
          <TooltipDemo stage={5} artworkCount={80} label="One stage to go" />
          <TooltipDemo
            stage={6}
            artworkCount={200}
            label="Max stage — four-star badge, no bar"
          />
        </div>
      </section>
    </Stage>
  ),
};

// ─── Colo — every avatar size ─────────────────────────────────────────

const SIZES = ['xs', 'sm', 'header', 'md', 'lg', 'xl'] as const;

export const ColoSizes: Story = {
  name: 'Colo — every size',
  render: () => (
    <Stage>
      <section className="space-y-3">
        <div>
          <h2 className="font-tondo text-xl font-bold text-text-primary">
            ColoAvatar — sizes
          </h2>
          <p className="text-sm text-text-secondary">
            Six sizes for header chips, profile cards, hero spots. Shown here
            with the same Happy Colo (stage 4) so the size delta is the only
            thing that changes.
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-6 rounded-3xl border-2 border-paper-cream-dark bg-white p-6 shadow-card">
          {SIZES.map((size) => (
            <div key={size} className="flex flex-col items-center gap-2">
              <ColoAvatar stage={4} size={size} />
              <span className="font-tondo text-xs font-bold text-text-secondary">
                {size}
              </span>
            </div>
          ))}
        </div>
      </section>
    </Stage>
  ),
};

// ─── Stickers — full catalog (unlocked + locked) ──────────────────────

// Rarity order makes the page read low → high, like a collection
// poster. Within each rarity the catalog's existing order is kept.
const RARITY_ORDER: StickerRarity[] = [
  'common',
  'uncommon',
  'rare',
  'legendary',
];

const RARITY_LABEL: Record<StickerRarity, string> = {
  common: 'Common',
  uncommon: 'Uncommon',
  rare: 'Rare',
  legendary: 'Legendary',
};

const groupByRarity = (stickers: readonly Sticker[]) => {
  const map = new Map<StickerRarity, Sticker[]>();
  RARITY_ORDER.forEach((r) => map.set(r, []));
  stickers.forEach((s) => map.get(s.rarity)?.push(s));
  return map;
};

const StickerGrid = ({
  heading,
  blurb,
  isUnlocked,
}: {
  heading: string;
  blurb: string;
  isUnlocked: boolean;
}) => {
  const grouped = groupByRarity(STICKER_CATALOG);
  return (
    <section className="space-y-3">
      <div>
        <h2 className="font-tondo text-xl font-bold text-text-primary">
          {heading}
        </h2>
        <p className="text-sm text-text-secondary">{blurb}</p>
      </div>
      <div className="space-y-5 rounded-3xl border-2 border-paper-cream-dark bg-white p-6 shadow-card">
        {RARITY_ORDER.map((rarity) => {
          const items = grouped.get(rarity) ?? [];
          if (items.length === 0) return null;
          return (
            <div key={rarity} className="space-y-2">
              <h3 className="font-tondo text-sm font-bold uppercase tracking-wide text-text-tertiary">
                {RARITY_LABEL[rarity]} · {items.length}
              </h3>
              <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-6">
                {items.map((sticker) => (
                  <StickerCard
                    key={sticker.id}
                    sticker={sticker}
                    isUnlocked={isUnlocked}
                    onClick={() => undefined}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};

export const StickersAllUnlocked: Story = {
  name: 'Stickers — all unlocked',
  render: () => (
    <Stage>
      <StickerGrid
        heading="Sticker catalog — unlocked state"
        blurb="All 22 stickers in their unlocked appearance. Grouped by rarity (common → legendary)."
        isUnlocked
      />
    </Stage>
  ),
};

export const StickersAllLocked: Story = {
  name: 'Stickers — all locked',
  render: () => (
    <Stage>
      <StickerGrid
        heading="Sticker catalog — locked state"
        blurb="Every sticker before it's earned: greyed-out silhouette with the unlock hint."
        isUnlocked={false}
      />
    </Stage>
  ),
};

// ─── Stickers — mixed (a partially-progressed collection) ─────────────

export const StickersMixed: Story = {
  name: 'Stickers — mixed (partial progress)',
  render: () => {
    // Unlock the common milestones + a couple of rare ones so the page
    // shows what a mid-game collection looks like in practice.
    const unlocked = new Set<string>(
      STICKER_CATALOG.filter(
        (s) =>
          s.rarity === 'common' ||
          (s.rarity === 'uncommon' && Math.random() > 0.4),
      ).map((s) => s.id),
    );
    const grouped = groupByRarity(STICKER_CATALOG);
    return (
      <Stage>
        <section className="space-y-3">
          <div>
            <h2 className="font-tondo text-xl font-bold text-text-primary">
              Sticker catalog — partial progress
            </h2>
            <p className="text-sm text-text-secondary">
              What the book looks like mid-game: most commons unlocked, some
              uncommons, rare/legendary still locked.
            </p>
          </div>
          <div className="space-y-5 rounded-3xl border-2 border-paper-cream-dark bg-white p-6 shadow-card">
            {RARITY_ORDER.map((rarity) => {
              const items = grouped.get(rarity) ?? [];
              if (items.length === 0) return null;
              return (
                <div key={rarity} className="space-y-2">
                  <h3 className="font-tondo text-sm font-bold uppercase tracking-wide text-text-tertiary">
                    {RARITY_LABEL[rarity]} · {items.length}
                  </h3>
                  <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-6">
                    {items.map((sticker) => (
                      <StickerCard
                        key={sticker.id}
                        sticker={sticker}
                        isUnlocked={unlocked.has(sticker.id)}
                        onClick={() => undefined}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </Stage>
    );
  },
};

import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import Confetti from '@/components/Confetti';
import { ActionButton } from '@one-colored-pixel/coloring-ui';
import {
  faSpinnerThird,
  faFloppyDisk,
  faPrint,
  faArrowsRotate,
} from '@fortawesome/pro-duotone-svg-icons';
import { faHeart } from '@fortawesome/pro-solid-svg-icons';

/**
 * Section 11 — Celebrations & Action Row.
 *
 * Two things in one file because they live in the same family
 * (the post-action UX on the coloring canvas):
 *
 *   1. Confetti playground — a chunky "Tap to celebrate" button
 *      that fires the new canvas-confetti burst on click. Lets you
 *      eyeball the school-pride pattern + tweak colours/scalar in
 *      the source without saving real artwork.
 *
 *   2. Action row at every breakpoint it changes — mobile shows
 *      icon-only tiles (`size="tile"`, 64px), tablet/desktop show
 *      icon+label hero buttons. The action row sits at the bottom
 *      of the canvas card on mobile and inside DesktopToolsSidebar
 *      on xl+ (rendered there by ColoringPageContent).
 */

const meta = {
  title: 'Chunky Crayon/11 Celebrations & Actions',
  parameters: {
    layout: 'fullscreen',
    viewport: {
      // Same CC viewport menu as section 07 Coloring Experience so
      // you can compare side-by-side at identical widths.
      options: {
        cc320: {
          name: '📱 320 — iPhone SE',
          styles: { width: '320px', height: '720px' },
          type: 'mobile' as const,
        },
        cc390: {
          name: '📱 390 — iPhone 14',
          styles: { width: '390px', height: '844px' },
          type: 'mobile' as const,
        },
        cc768: {
          name: '📱 768 — iPad portrait',
          styles: { width: '768px', height: '1024px' },
          type: 'tablet' as const,
        },
        cc1280: {
          name: '💻 1280 — laptop (xl)',
          styles: { width: '1280px', height: '800px' },
          type: 'desktop' as const,
        },
      },
    },
    docs: {
      description: {
        component:
          'Confetti playground + action-button row across breakpoints.',
      },
    },
  },
} satisfies Meta;

export default meta;
type Story = StoryObj;

// ─── Confetti playground ─────────────────────────────────────────────

const ConfettiPlayground = () => {
  const [isActive, setIsActive] = useState(false);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-paper p-8">
      <h1 className="font-tondo text-3xl font-bold text-text-primary">
        Confetti playground
      </h1>
      <p className="max-w-md text-center text-text-secondary">
        Tap the button — fires the new canvas-confetti burst with the saturated
        CC crayon palette + school-pride two-side-then-centre pattern. The
        host&apos;s `isActive` prop is the trigger; flip back false via
        `onComplete` so subsequent taps re-fire.
      </p>
      <button
        type="button"
        onClick={() => setIsActive(true)}
        className="rounded-full bg-crayon-orange px-10 py-4 font-tondo text-2xl font-bold text-white shadow-btn-primary transition-transform hover:scale-105 active:scale-95"
      >
        Tap to celebrate
      </button>
      <Confetti isActive={isActive} onComplete={() => setIsActive(false)} />
    </div>
  );
};

export const ConfettiBurst: Story = {
  name: '🎉 Confetti — tap to fire',
  render: () => <ConfettiPlayground />,
};

// ─── Action row across breakpoints ───────────────────────────────────

// Mobile / tablet pattern: icon-only chunky tiles in the canvas card.
// Mirrors the row rendered inside ColoringArea at md+ tile size.
const MobileActionRow = () => (
  <div className="rounded-2xl border-2 border-paper-cream-dark bg-white p-4 shadow-sm">
    {/* Canvas placeholder — just enough framing so the row's gutter
        from the card edge is visible. */}
    <div className="mb-4 aspect-square rounded-lg bg-paper-cream-dark/30" />
    <div className="flex items-center justify-center gap-3 py-2 px-4">
      <ActionButton
        size="tile"
        tone="tool"
        icon={faArrowsRotate}
        label="Start Over"
      />
      <ActionButton size="tile" tone="tool" icon={faPrint} label="Print" />
      <ActionButton size="tile" tone="tool" icon={faFloppyDisk} label="Save" />
      <ActionButton
        size="tile"
        tone="tool"
        icon={faHeart}
        label="Save to gallery"
      />
    </div>
  </div>
);

// Desktop pattern: icon+label hero buttons stacked in the sidebar's
// action slot. Reuses the same shared ActionButton with `size="hero"`.
const DesktopActionStack = () => (
  <div className="flex w-72 flex-col gap-3 rounded-coloring-card border-2 border-paper-cream-dark bg-white p-4 shadow-sm">
    <h3 className="font-tondo text-sm font-bold uppercase tracking-wide text-text-secondary">
      Actions
    </h3>
    <ActionButton
      size="hero"
      tone="tool"
      icon={faArrowsRotate}
      label="Start Over"
    />
    <ActionButton size="hero" tone="tool" icon={faPrint} label="Print" />
    <ActionButton size="hero" tone="tool" icon={faFloppyDisk} label="Save" />
    <ActionButton
      size="hero"
      tone="tool"
      icon={faHeart}
      label="Save to gallery"
    />
  </div>
);

// Each state of the SaveToGallery button, side-by-side, on one row.
// Lets the designer eyeball the four states against each other at the
// same scale.
const SaveStatesRow = () => (
  <div className="rounded-2xl border-2 border-paper-cream-dark bg-white p-6 shadow-sm">
    <h3 className="mb-4 font-tondo text-sm font-bold uppercase tracking-wide text-text-secondary">
      SaveToGallery states
    </h3>
    <div className="flex flex-wrap items-end gap-4">
      <div className="flex flex-col items-center gap-2">
        <ActionButton size="tile" tone="tool" icon={faHeart} label="Save" />
        <span className="text-xs text-text-secondary">Idle</span>
      </div>
      <div className="flex flex-col items-center gap-2">
        <ActionButton
          size="tile"
          tone="tool"
          icon={faSpinnerThird}
          label="Saving"
          disabled
          className="[&_svg]:animate-spin text-crayon-pink"
        />
        <span className="text-xs text-text-secondary">Saving (spinner)</span>
      </div>
      <div className="flex flex-col items-center gap-2">
        <ActionButton
          size="tile"
          tone="tool"
          icon={faHeart}
          label="Saved"
          disabled
          className="[&_svg]:text-crayon-pink"
        />
        <span className="text-xs text-text-secondary">Saved (pink heart)</span>
      </div>
    </div>
  </div>
);

export const ActionRowMobile320: Story = {
  name: '📱 320 — action row',
  globals: { viewport: { value: 'cc320' } },
  render: () => (
    <div className="min-h-screen bg-paper p-4">
      <MobileActionRow />
      <div className="mt-6">
        <SaveStatesRow />
      </div>
    </div>
  ),
};

export const ActionRowMobile390: Story = {
  name: '📱 390 — action row',
  globals: { viewport: { value: 'cc390' } },
  render: () => (
    <div className="min-h-screen bg-paper p-4">
      <MobileActionRow />
      <div className="mt-6">
        <SaveStatesRow />
      </div>
    </div>
  ),
};

export const ActionRowTablet768: Story = {
  name: '📱 768 — action row',
  globals: { viewport: { value: 'cc768' } },
  render: () => (
    <div className="min-h-screen bg-paper p-6">
      <MobileActionRow />
      <div className="mt-6">
        <SaveStatesRow />
      </div>
    </div>
  ),
};

export const ActionRowDesktop1280: Story = {
  name: '💻 1280 — action row (sidebar)',
  globals: { viewport: { value: 'cc1280' } },
  render: () => (
    <div className="flex min-h-screen items-start justify-center gap-8 bg-paper p-8">
      <div className="flex-1 max-w-3xl">
        <div className="aspect-[4/3] rounded-2xl border-2 border-paper-cream-dark bg-white p-6 shadow-sm">
          <div className="h-full rounded-lg bg-paper-cream-dark/30" />
        </div>
      </div>
      <DesktopActionStack />
    </div>
  ),
};

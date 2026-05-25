import type { Decorator, Meta, StoryObj } from '@storybook/react-vite';
import { useEffect } from 'react';
import ColoringPageContent from '@/components/ColoringPageContent/ColoringPageContent';
import type { ColoringImage } from '@one-colored-pixel/db/types';
import regionsJson from './fixtures/region-store-monkey-seashell.json';

/**
 * The coloring experience at every breakpoint — the single most
 * important screen in CC.
 *
 * Two parallel story sets (standard + focus mode) × 8 viewport
 * widths. Each story renders the real `ColoringPageContent`
 * component (not a fake) inside a fixed-width frame so layout
 * comparisons across breakpoints are pure (only the wrapper width
 * changes between stories).
 *
 * Fixture: one prod system-generated coloring image, region-store
 * backfilled so the magic-brush + auto-color tooling is functional
 * inside the story. SVG + region map fetch from the public
 * assets.chunkycrayon.com CDN. The full `regionsJson` blob lives in
 * `./fixtures/region-store-monkey-seashell.json` so the story file
 * stays readable.
 *
 * Page chrome simulation: Storybook stories don't run the route
 * layout, so the global Header/Footer/breadcrumbs don't render by
 * default. The breakpoint decorator below renders a stand-in
 * Header + Breadcrumbs above the content (and a stand-in Footer
 * below), all carrying `focus-mode-hide`. That way the focus-mode
 * stories actually demonstrate the chrome disappearing — without it
 * focus mode on desktop would look identical to standard mode.
 *
 * Browser Fullscreen API: cannot be invoked from inside the
 * Storybook iframe (cross-origin requestFullscreen rejection). The
 * focus-mode stories show CC chrome hidden but browser tab/OS chrome
 * unchanged. Real Fullscreen API verification happens in the smoke
 * test against the dev app — see the PR description.
 */

const FIXTURE_COLORING_IMAGE: Partial<ColoringImage> = {
  id: 'cmpjbaxro000004jlf15ah3mr',
  title: 'Happy Monkey Painting a Seashell',
  alt: 'Happy Monkey Painting a Seashell, Beach Coloring Page',
  svgUrl:
    'https://assets.chunkycrayon.com/uploads/coloring-images/cmpjbaxro000004jlf15ah3mr/image.svg',
  regionMapUrl:
    'https://assets.chunkycrayon.com/uploads/coloring-images/cmpjbaxro000004jlf15ah3mr/regions.bin.gz',
  regionMapWidth: 1024,
  regionMapHeight: 1024,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  regionsJson: regionsJson as any,
  // Kept null — no autoplay in Storybook so the kid doesn't get a
  // surprise piano loop on every story flip.
  backgroundMusicUrl: null,
  status: 'READY',
  generationType: 'SYSTEM',
  brand: 'CHUNKY_CRAYON',
  difficulty: 'BEGINNER',
  tags: ['monkey', 'beach', 'seashell'],
};

// ─── Chrome stand-ins ────────────────────────────────────────────────
//
// Cheap fakes of the global Header / Breadcrumbs / Footer that exist
// in the real route. Each carries `focus-mode-hide`, so flipping
// into focus mode disappears them — that's the demo the story exists
// for. Real Header/Footer aren't reused because they'd pull in
// SessionProvider / SWR / data fetches that don't belong in a layout
// audit story.

const StubHeader = () => (
  <header
    className="focus-mode-hide sticky top-0 z-30 bg-white border-b-2 border-paper-cream-dark"
    aria-label="Stand-in for the real CC header"
  >
    <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
      <span className="font-tondo text-xl font-bold text-crayon-orange">
        Chunky Crayon
      </span>
      <nav className="hidden md:flex items-center gap-4 text-sm font-tondo font-bold text-text-secondary">
        <span>Home</span>
        <span>My Stuff</span>
        <span>Gallery</span>
        <span>Characters</span>
      </nav>
    </div>
  </header>
);

const StubBreadcrumbs = () => (
  <nav className="focus-mode-hide text-sm text-text-secondary">
    Home / Gallery / {FIXTURE_COLORING_IMAGE.title}
  </nav>
);

const StubRelatedAndFooter = () => (
  <>
    <section className="focus-mode-hide mt-8 pt-8 border-t border-paper-cream-dark">
      <h2 className="font-tondo font-semibold text-xl text-text-primary mb-4">
        You might also like
      </h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          // eslint-disable-next-line react/no-array-index-key
          <div
            key={i}
            className="aspect-square rounded-xl bg-white border-2 border-paper-cream-dark"
          />
        ))}
      </div>
    </section>
    <footer className="focus-mode-hide mt-12 pt-8 pb-4 border-t border-paper-cream-dark text-center text-sm text-text-secondary">
      © Chunky Crayon — stand-in footer for the layout audit
    </footer>
  </>
);

// ─── Breakpoint decorator ────────────────────────────────────────────

const breakpoint =
  (width: number): Decorator =>
  (Story) => (
    <div
      className="mx-auto h-screen overflow-auto border-x border-dashed border-gray-300 bg-paper"
      style={{ width }}
    >
      <StubHeader />
      <div className="mx-auto max-w-7xl px-4 py-4 space-y-4">
        <StubBreadcrumbs />
        <Story />
        <StubRelatedAndFooter />
      </div>
    </div>
  );

// ─── Content shell ───────────────────────────────────────────────────

type StoryContextGlobals = { authState?: string };

const StandardContent = (_: unknown, ctx: { globals: StoryContextGlobals }) => {
  const isAuthenticated = ctx.globals.authState === 'signed-in';
  return (
    <ColoringPageContent
      coloringImage={FIXTURE_COLORING_IMAGE}
      isAuthenticated={isAuthenticated}
      title={FIXTURE_COLORING_IMAGE.title ?? 'Coloring page'}
    />
  );
};

// ─── Meta ────────────────────────────────────────────────────────────

const meta = {
  title: 'Chunky Crayon/07 Coloring Experience',
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'The single most important screen in CC. Renders the real ColoringPageContent component at every breakpoint side-by-side. Standard mode + Focus mode at 320/390/414/768/1024/1280/1536/1920.',
      },
    },
  },
} satisfies Meta;

export default meta;
type Story = StoryObj;

// ─── Standard mode (chrome visible) ──────────────────────────────────

export const Mobile320: Story = {
  name: '📱 320 — iPhone SE',
  decorators: [breakpoint(320)],
  render: StandardContent,
};

export const Mobile390: Story = {
  name: '📱 390 — iPhone 14',
  decorators: [breakpoint(390)],
  render: StandardContent,
};

export const Mobile414: Story = {
  name: '📱 414 — iPhone Plus',
  decorators: [breakpoint(414)],
  render: StandardContent,
};

export const Tablet768: Story = {
  name: '📱 768 — iPad portrait',
  decorators: [breakpoint(768)],
  render: StandardContent,
};

export const Tablet1024: Story = {
  name: '💻 1024 — iPad landscape',
  decorators: [breakpoint(1024)],
  render: StandardContent,
};

export const Desktop1280: Story = {
  name: '💻 1280 — laptop (xl breakpoint)',
  decorators: [breakpoint(1280)],
  render: StandardContent,
};

export const Desktop1536: Story = {
  name: '🖥 1536 — desktop',
  decorators: [breakpoint(1536)],
  render: StandardContent,
};

export const Desktop1920: Story = {
  name: '🖥 1920 — widescreen (@[1400px] container query)',
  decorators: [breakpoint(1920)],
  render: StandardContent,
};

// ─── Focus mode (chrome hidden — auto-entered) ───────────────────────
//
// The focus-mode stories layer one extra decorator that sets
// `<html data-focus-mode>` directly on mount. We can't reach into
// ColoringPageContent's own FocusModeProvider from outside it, but
// we don't need to — the `.focus-mode-hide` CSS rule keys off the
// HTML attribute, so toggling the attribute is enough to demonstrate
// chrome-hiding. (The floating X won't render because
// ColoringPageContent's React state is still false, but the chrome
// disappearing is the point of the story.)

const SetFocusModeAttribute = (): Decorator => (Story) => {
  useEffect(() => {
    document.documentElement.setAttribute('data-focus-mode', '');
    return () => {
      document.documentElement.removeAttribute('data-focus-mode');
    };
  }, []);
  return <Story />;
};

export const FocusMobile320: Story = {
  name: '📱 320 — iPhone SE',
  decorators: [SetFocusModeAttribute(), breakpoint(320)],
  render: StandardContent,
};

export const FocusMobile390: Story = {
  name: '📱 390 — iPhone 14',
  decorators: [SetFocusModeAttribute(), breakpoint(390)],
  render: StandardContent,
};

export const FocusMobile414: Story = {
  name: '📱 414 — iPhone Plus',
  decorators: [SetFocusModeAttribute(), breakpoint(414)],
  render: StandardContent,
};

export const FocusTablet768: Story = {
  name: '📱 768 — iPad portrait',
  decorators: [SetFocusModeAttribute(), breakpoint(768)],
  render: StandardContent,
};

export const FocusTablet1024: Story = {
  name: '💻 1024 — iPad landscape',
  decorators: [SetFocusModeAttribute(), breakpoint(1024)],
  render: StandardContent,
};

export const FocusDesktop1280: Story = {
  name: '💻 1280 — laptop',
  decorators: [SetFocusModeAttribute(), breakpoint(1280)],
  render: StandardContent,
};

export const FocusDesktop1536: Story = {
  name: '🖥 1536 — desktop',
  decorators: [SetFocusModeAttribute(), breakpoint(1536)],
  render: StandardContent,
};

export const FocusDesktop1920: Story = {
  name: '🖥 1920 — widescreen',
  decorators: [SetFocusModeAttribute(), breakpoint(1920)],
  render: StandardContent,
};

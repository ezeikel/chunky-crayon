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
 * widths. Each story uses Storybook's viewport addon to resize the
 * preview iframe to the target width, so Tailwind responsive
 * prefixes (`md:`, `xl:`) — which key off viewport width — actually
 * fire. A wrapper decorator above is NOT enough because responsive
 * media queries don't respect container width; only a real iframe
 * resize does the right thing.
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
 * default. The chrome decorator below renders a stand-in Header +
 * Breadcrumbs above the content (and a stand-in Footer below), all
 * carrying `focus-mode-hide`. That way the focus-mode stories
 * actually demonstrate the chrome disappearing — without it focus
 * mode on desktop would look identical to standard mode.
 *
 * Browser Fullscreen API: cannot be invoked from inside the
 * Storybook iframe (cross-origin requestFullscreen rejection). The
 * focus-mode stories show CC chrome hidden but browser tab/OS chrome
 * unchanged. Real Fullscreen API verification happens in the smoke
 * test against the dev app — see the PR description.
 */

// Use the Storybook dev-server proxy path (`/_assets-cc` → assets.chunkycrayon.com)
// configured in .storybook/main.ts. Direct URLs to the prod CDN fail
// CORS because the bucket doesn't send Access-Control-Allow-Origin for
// localhost. The proxy bypasses CORS by serving the response same-origin.
const FIXTURE_COLORING_IMAGE: Partial<ColoringImage> = {
  id: 'cmpjbaxro000004jlf15ah3mr',
  title: 'Happy Monkey Painting a Seashell',
  alt: 'Happy Monkey Painting a Seashell, Beach Coloring Page',
  svgUrl:
    '/_assets-cc/uploads/coloring-images/cmpjbaxro000004jlf15ah3mr/image.svg',
  regionMapUrl:
    '/_assets-cc/uploads/coloring-images/cmpjbaxro000004jlf15ah3mr/regions.bin.gz',
  regionMapWidth: 1024,
  regionMapHeight: 1024,
  // ColoringArea expects regionsJson as a string (Prisma Text
  // column) and JSON.parses it. Importing the JSON file gives us a
  // pre-parsed object; restringify so the component's parse step
  // doesn't throw → regionStore.isReady → auto-color + magic brush
  // fill the entire canvas like prod.
  regionsJson: JSON.stringify(regionsJson),
  backgroundMusicUrl: null,
  status: 'READY',
  generationType: 'SYSTEM',
  brand: 'CHUNKY_CRAYON',
  difficulty: 'BEGINNER',
  tags: ['monkey', 'beach', 'seashell'],
};

// ─── Custom viewports ────────────────────────────────────────────────
//
// Storybook's MINIMAL_VIEWPORTS only ship mobile1/2 + tablet sizes;
// we want named CC-specific breakpoints. Each one matches a meaningful
// transition in the layout:
//   320  iPhone SE                              ← narrowest target
//   390  iPhone 14                              ← most common phone
//   414  iPhone Plus                            ← widest phone
//   768  iPad portrait — `md` activates here
//   1024 iPad landscape — still `md..xl` tier
//   1280 laptop — `xl` activates, 3-panel layout kicks in
//   1536 desktop — `2xl` activates
//   1920 widescreen — `@[1400px]` container query activates

const CC_VIEWPORTS = {
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
  cc414: {
    name: '📱 414 — iPhone Plus',
    styles: { width: '414px', height: '896px' },
    type: 'mobile' as const,
  },
  cc768: {
    name: '📱 768 — iPad portrait',
    styles: { width: '768px', height: '1024px' },
    type: 'tablet' as const,
  },
  cc1024: {
    name: '💻 1024 — iPad landscape',
    styles: { width: '1024px', height: '768px' },
    type: 'tablet' as const,
  },
  cc1280: {
    name: '💻 1280 — laptop (xl)',
    styles: { width: '1280px', height: '800px' },
    type: 'desktop' as const,
  },
  cc1536: {
    name: '🖥 1536 — desktop',
    styles: { width: '1536px', height: '864px' },
    type: 'desktop' as const,
  },
  cc1920: {
    name: '🖥 1920 — widescreen',
    styles: { width: '1920px', height: '1080px' },
    type: 'desktop' as const,
  },
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

// Chrome wrapper. Doesn't set a width — the viewport addon does that
// by resizing the iframe. This decorator just supplies the
// Header/Breadcrumbs/Footer scaffolding so focus mode has something
// to hide.
const withChrome: Decorator = (Story) => (
  <div className="min-h-screen bg-paper">
    <StubHeader />
    <div className="mx-auto max-w-7xl px-4 py-4 space-y-4">
      <StubBreadcrumbs />
      <Story />
      <StubRelatedAndFooter />
    </div>
  </div>
);

// Set <html data-focus-mode> directly so the .focus-mode-hide CSS
// rule fires for the focus-mode stories. ColoringPageContent's own
// FocusModeProvider state stays false (which means the floating X
// won't render and the mobile scrim won't paint), but the chrome
// hiding is the audit goal — the X + scrim are verified in the real
// app smoke test.
const withForcedFocusMode: Decorator = (Story) => {
  useEffect(() => {
    document.documentElement.setAttribute('data-focus-mode', '');
    return () => {
      document.documentElement.removeAttribute('data-focus-mode');
    };
  }, []);
  return <Story />;
};

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
  decorators: [withChrome],
  parameters: {
    layout: 'fullscreen',
    viewport: {
      // Storybook 10 renamed `viewports` → `options`. These show
      // up in the viewport toolbar dropdown; per-story default is
      // set via the `globals.viewport.value` per story below.
      options: CC_VIEWPORTS,
    },
    docs: {
      description: {
        component:
          "The single most important screen in CC. Renders the real ColoringPageContent component at every breakpoint via Storybook 10's built-in viewport feature. Standard mode + Focus mode at 320/390/414/768/1024/1280/1536/1920.",
      },
    },
  },
} satisfies Meta;

export default meta;
type Story = StoryObj;

// ─── Standard mode (chrome visible) ──────────────────────────────────

export const Mobile320: Story = {
  name: '📱 320 — iPhone SE',
  globals: { viewport: { value: 'cc320' } },
  render: StandardContent,
};

export const Mobile390: Story = {
  name: '📱 390 — iPhone 14',
  globals: { viewport: { value: 'cc390' } },
  render: StandardContent,
};

export const Mobile414: Story = {
  name: '📱 414 — iPhone Plus',
  globals: { viewport: { value: 'cc414' } },
  render: StandardContent,
};

export const Tablet768: Story = {
  name: '📱 768 — iPad portrait',
  globals: { viewport: { value: 'cc768' } },
  render: StandardContent,
};

export const Tablet1024: Story = {
  name: '💻 1024 — iPad landscape',
  globals: { viewport: { value: 'cc1024' } },
  render: StandardContent,
};

export const Desktop1280: Story = {
  name: '💻 1280 — laptop (xl breakpoint)',
  globals: { viewport: { value: 'cc1280' } },
  render: StandardContent,
};

export const Desktop1536: Story = {
  name: '🖥 1536 — desktop',
  globals: { viewport: { value: 'cc1536' } },
  render: StandardContent,
};

export const Desktop1920: Story = {
  name: '🖥 1920 — widescreen',
  globals: { viewport: { value: 'cc1920' } },
  render: StandardContent,
};

// ─── Focus mode (chrome hidden — auto-entered) ───────────────────────

export const FocusMobile320: Story = {
  name: '📱 320 — iPhone SE',
  globals: { viewport: { value: 'cc320' } },
  decorators: [withForcedFocusMode],
  render: StandardContent,
};

export const FocusMobile390: Story = {
  name: '📱 390 — iPhone 14',
  globals: { viewport: { value: 'cc390' } },
  decorators: [withForcedFocusMode],
  render: StandardContent,
};

export const FocusMobile414: Story = {
  name: '📱 414 — iPhone Plus',
  globals: { viewport: { value: 'cc414' } },
  decorators: [withForcedFocusMode],
  render: StandardContent,
};

export const FocusTablet768: Story = {
  name: '📱 768 — iPad portrait',
  globals: { viewport: { value: 'cc768' } },
  decorators: [withForcedFocusMode],
  render: StandardContent,
};

export const FocusTablet1024: Story = {
  name: '💻 1024 — iPad landscape',
  globals: { viewport: { value: 'cc1024' } },
  decorators: [withForcedFocusMode],
  render: StandardContent,
};

export const FocusDesktop1280: Story = {
  name: '💻 1280 — laptop',
  globals: { viewport: { value: 'cc1280' } },
  decorators: [withForcedFocusMode],
  render: StandardContent,
};

export const FocusDesktop1536: Story = {
  name: '🖥 1536 — desktop',
  globals: { viewport: { value: 'cc1536' } },
  decorators: [withForcedFocusMode],
  render: StandardContent,
};

export const FocusDesktop1920: Story = {
  name: '🖥 1920 — widescreen',
  globals: { viewport: { value: 'cc1920' } },
  decorators: [withForcedFocusMode],
  render: StandardContent,
};

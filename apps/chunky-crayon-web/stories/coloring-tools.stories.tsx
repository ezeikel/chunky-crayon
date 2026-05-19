import type { Meta, StoryObj } from '@storybook/react-vite';
import {
  ActionButton,
  BrushSizeSelector as BrushSizeSelectorComponent,
  ColoringContextProvider,
  ColoringToolbar as ColoringToolbarComponent,
  DesktopColorPalette as DesktopColorPaletteComponent,
  DesktopToolsSidebar as DesktopToolsSidebarComponent,
  MobileColoringDrawer as MobileColoringDrawerComponent,
} from '@one-colored-pixel/coloring-ui';
import {
  faBroomWide,
  faCloudArrowUp,
  faDownload,
  faShare,
} from '@fortawesome/pro-solid-svg-icons';

const meta = {
  title: 'Chunky Crayon/06 Coloring Tools',
  parameters: {
    docs: {
      description: {
        component:
          'Canvas tool controls used by the Chunky Crayon coloring experience. These stories mirror the shared coloring-ui components in the app theme so desktop, tablet, and mobile tool surfaces can be reviewed alongside the rest of the design system.',
      },
    },
  },
} satisfies Meta;

export default meta;
type Story = StoryObj;

const SampleActions = () => (
  <>
    <ActionButton
      icon={faBroomWide}
      label="Start Over"
      tone="secondary"
      size="tile"
    />
    <ActionButton icon={faDownload} label="Download" size="tile" />
    <ActionButton icon={faShare} label="Share" size="tile" />
    <ActionButton icon={faCloudArrowUp} label="Save" size="tile" />
  </>
);

const DesktopStage = ({
  children,
  className = 'inline-flex',
}: {
  children: React.ReactNode;
  className?: string;
}) => (
  <ColoringContextProvider variant="kids" storagePrefix="sb-cc-tools-desktop">
    <main className="min-h-screen bg-paper p-8">
      <div className="flex justify-center">
        <div
          className={`rounded-coloring-card border-2 border-paper-cream-dark bg-white p-6 shadow-card ${className}`}
        >
          {children}
        </div>
      </div>
    </main>
  </ColoringContextProvider>
);

const CanvasWorkbench = ({ children }: { children: React.ReactNode }) => (
  <ColoringContextProvider variant="kids" storagePrefix="sb-cc-tools-workbench">
    <main className="min-h-screen bg-paper p-6">
      <div className="grid min-h-[720px] grid-cols-[auto_minmax(0,1fr)_auto] gap-6">
        <DesktopToolsSidebarComponent actions={<SampleActions />} />
        <section className="rounded-coloring-card border-2 border-paper-cream-dark bg-white p-6 shadow-card">
          <div className="h-full rounded-3xl border-2 border-dashed border-paper-cream-dark bg-paper" />
        </section>
        {children}
      </div>
    </main>
  </ColoringContextProvider>
);

const PaletteStage = () => (
  <ColoringContextProvider variant="kids" storagePrefix="sb-cc-palette">
    <main className="min-h-screen bg-paper p-8">
      <div className="mx-auto grid max-w-4xl grid-cols-[minmax(0,1fr)_auto] gap-6">
        <section className="min-h-[560px] rounded-coloring-card border-2 border-paper-cream-dark bg-white p-6 shadow-card">
          <div className="h-full rounded-3xl border-2 border-dashed border-paper-cream-dark bg-paper" />
        </section>
        <DesktopColorPaletteComponent className="w-[180px] @[1400px]:w-[200px] @[1600px]:w-[220px]" />
      </div>
    </main>
  </ColoringContextProvider>
);

export const DesktopToolsSidebar: Story = {
  name: 'Desktop Tools Sidebar',
  parameters: {
    layout: 'fullscreen',
  },
  render: () => (
    <DesktopStage>
      <DesktopToolsSidebarComponent actions={<SampleActions />} />
    </DesktopStage>
  ),
};

export const DesktopWorkbench: Story = {
  name: 'Desktop Workbench',
  render: () => (
    <CanvasWorkbench>
      <DesktopColorPaletteComponent className="w-[180px] @[1400px]:w-[200px] @[1600px]:w-[220px]" />
    </CanvasWorkbench>
  ),
};

export const ColoringToolbar: Story = {
  name: 'Coloring Toolbar',
  parameters: {
    layout: 'fullscreen',
  },
  render: () => (
    <ColoringContextProvider variant="kids" storagePrefix="sb-cc-toolbar">
      <main className="min-h-screen bg-paper p-6">
        <div className="mx-auto max-w-5xl">
          <ColoringToolbarComponent />
        </div>
      </main>
    </ColoringContextProvider>
  ),
};

export const BrushSizeSelector: Story = {
  name: 'Brush Size Selector',
  parameters: {
    layout: 'fullscreen',
  },
  render: () => (
    <DesktopStage>
      <div className="w-96 max-w-full">
        <BrushSizeSelectorComponent />
      </div>
    </DesktopStage>
  ),
};

export const DesktopColorPalette: Story = {
  name: 'Desktop Color Palette',
  parameters: {
    layout: 'fullscreen',
  },
  render: () => <PaletteStage />,
};

export const MobileColoringDrawer: Story = {
  name: 'Mobile Coloring Drawer',
  parameters: {
    layout: 'fullscreen',
    viewport: { defaultViewport: 'mobile1' },
  },
  render: () => (
    <ColoringContextProvider variant="kids" storagePrefix="sb-cc-mobile-drawer">
      <main className="relative min-h-screen overflow-hidden bg-paper">
        <div className="mx-auto h-[72vh] max-w-sm p-4">
          <div className="h-full rounded-coloring-card border-2 border-paper-cream-dark bg-white shadow-card" />
        </div>
        <MobileColoringDrawerComponent handleHintLabel="Drag for tools" />
      </main>
    </ColoringContextProvider>
  ),
};

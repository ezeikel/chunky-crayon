import type { Meta, StoryObj } from "@storybook/react-vite";
import { ColoringContextProvider } from "./context";
import DesktopToolsSidebar from "./DesktopToolsSidebar";
import ActionButton from "./ActionButton";
import {
  faBroomWide,
  faCloudArrowUp,
  faImage,
  faShare,
} from "@fortawesome/pro-solid-svg-icons";

const meta: Meta<typeof DesktopToolsSidebar> = {
  title: "Coloring/DesktopToolsSidebar",
  component: DesktopToolsSidebar,
  parameters: {
    docs: {
      description: {
        component:
          "Desktop (xl+) vertical tools sidebar. Composes the coloring experience: " +
          "tools → magic tools → brush sizes → undo/redo → zoom → actions slot. " +
          "Fully themed via coloring-* tokens — same component renders CC or CH " +
          "depending on the theme vars in the surrounding app.",
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof DesktopToolsSidebar>;

const SampleActions = () => (
  <>
    <ActionButton
      icon={faBroomWide}
      label="Start Over"
      tone="secondary"
      size="tile"
    />
    <ActionButton icon={faImage} label="Download" size="tile" />
    <ActionButton icon={faShare} label="Share" size="tile" />
    <ActionButton icon={faCloudArrowUp} label="Save" size="tile" />
  </>
);

export const Default: Story = {
  decorators: [
    (Story) => (
      <ColoringContextProvider storagePrefix="sb-sidebar-default">
        <div className="p-8 bg-coloring-surface min-h-screen flex">
          <Story />
        </div>
      </ColoringContextProvider>
    ),
  ],
  render: () => <DesktopToolsSidebar actions={<SampleActions />} />,
};

export const WithoutStickers: Story = {
  decorators: [
    (Story) => (
      <ColoringContextProvider
        variant="adult"
        storagePrefix="sb-sidebar-no-stickers"
      >
        <div className="p-8 bg-coloring-surface min-h-screen flex">
          <Story />
        </div>
      </ColoringContextProvider>
    ),
  ],
  render: () => (
    <DesktopToolsSidebar showStickers={false} actions={<SampleActions />} />
  ),
};

export const BothBrands: Story = {
  render: () => (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 p-4">
      <div
        data-theme="chunky-crayon"
        className="p-6 rounded-coloring-card bg-coloring-surface flex justify-center"
      >
        <ColoringContextProvider variant="kids" storagePrefix="sb-cc-sidebar">
          <div className="flex flex-col items-center gap-3">
            <div className="text-sm font-coloring-heading text-coloring-muted">
              Chunky Crayon (kids)
            </div>
            <DesktopToolsSidebar actions={<SampleActions />} />
          </div>
        </ColoringContextProvider>
      </div>
      <div
        data-theme="coloring-habitat"
        className="p-6 rounded-coloring-card bg-coloring-surface flex justify-center"
      >
        <ColoringContextProvider variant="adult" storagePrefix="sb-ch-sidebar">
          <div className="flex flex-col items-center gap-3">
            <div className="text-sm font-coloring-heading text-coloring-muted">
              Coloring Habitat (adult)
            </div>
            <DesktopToolsSidebar
              showStickers={false}
              actions={<SampleActions />}
            />
          </div>
        </ColoringContextProvider>
      </div>
    </div>
  ),
};

import type { Meta, StoryObj } from "@storybook/react-vite";
import {
  faBroomWide,
  faImage,
  faShare,
  faCloudArrowUp,
} from "@fortawesome/pro-solid-svg-icons";
import ActionButton from "./ActionButton";

const meta: Meta<typeof ActionButton> = {
  title: "Coloring/ActionButton",
  component: ActionButton,
  args: {
    icon: faImage,
    label: "Print",
    tone: "accent",
  },
};

export default meta;
type Story = StoryObj<typeof ActionButton>;

export const Default: Story = {};

export const Sizes: Story = {
  render: (args) => (
    <div className="flex flex-col gap-6">
      <div>
        <div className="text-xs font-coloring-heading text-coloring-muted mb-2">
          size="hero" — primary page CTA
        </div>
        <ActionButton {...args} size="hero" icon={faImage} label="Print" />
      </div>
      <div className="max-w-[200px]">
        <div className="text-xs font-coloring-heading text-coloring-muted mb-2">
          size="compact" — sidebar fit (icon + label)
        </div>
        <div className="flex flex-col gap-2">
          <ActionButton
            size="compact"
            tone="secondary"
            icon={faBroomWide}
            label="Start Over"
          />
          <ActionButton
            size="compact"
            tone="accent"
            icon={faImage}
            label="Print"
          />
          <ActionButton
            size="compact"
            tone="accent"
            icon={faShare}
            label="Share"
          />
        </div>
      </div>
      <div className="max-w-[220px]">
        <div className="text-xs font-coloring-heading text-coloring-muted mb-2">
          size="tile" — kid-first icon-only (64px). Hover for tooltip.
        </div>
        <div className="flex flex-wrap gap-2">
          <ActionButton
            size="tile"
            tone="secondary"
            icon={faBroomWide}
            label="Start Over"
          />
          <ActionButton
            size="tile"
            tone="accent"
            icon={faImage}
            label="Print"
          />
          <ActionButton
            size="tile"
            tone="accent"
            icon={faShare}
            label="Share"
          />
        </div>
      </div>
    </div>
  ),
};

export const Tones: Story = {
  render: (args) => (
    <div className="flex flex-wrap gap-3 items-center">
      <ActionButton {...args} tone="accent" icon={faImage} label="Print" />
      <ActionButton
        {...args}
        tone="secondary"
        icon={faBroomWide}
        label="Start Over"
      />
      <ActionButton
        {...args}
        tone="success"
        icon={faCloudArrowUp}
        label="Saved"
      />
      <ActionButton
        {...args}
        tone="destructive"
        icon={faBroomWide}
        label="Confirm"
      />
      <ActionButton {...args} tone="outline" icon={faShare} label="Cancel" />
    </div>
  ),
};

export const ActionsRow: Story = {
  render: () => (
    <div className="flex flex-col gap-3 max-w-xs">
      <ActionButton tone="secondary" icon={faBroomWide} label="Start Over" />
      <ActionButton tone="accent" icon={faImage} label="Print" />
      <ActionButton tone="accent" icon={faShare} label="Share" />
    </div>
  ),
};

export const BothBrands: Story = {
  render: () => (
    <div className="grid grid-cols-2 gap-8">
      <div
        data-theme="chunky-crayon"
        className="p-8 rounded-xl bg-coloring-surface flex flex-col gap-4"
      >
        <div className="text-sm font-coloring-heading text-coloring-muted">
          Chunky Crayon (kids) — hero
        </div>
        <ActionButton tone="secondary" icon={faBroomWide} label="Start Over" />
        <ActionButton tone="accent" icon={faImage} label="Print" />
        <ActionButton tone="accent" icon={faShare} label="Share" />
        <div className="text-sm font-coloring-heading text-coloring-muted mt-4">
          Chunky Crayon — tile (sidebar)
        </div>
        <div className="max-w-[220px] flex flex-wrap gap-2">
          <ActionButton
            size="tile"
            tone="secondary"
            icon={faBroomWide}
            label="Start Over"
          />
          <ActionButton
            size="tile"
            tone="accent"
            icon={faImage}
            label="Print"
          />
          <ActionButton
            size="tile"
            tone="accent"
            icon={faShare}
            label="Share"
          />
        </div>
      </div>
      <div
        data-theme="coloring-habitat"
        className="p-8 rounded-xl bg-coloring-surface flex flex-col gap-4"
      >
        <div className="text-sm font-coloring-heading text-coloring-muted">
          Coloring Habitat (adult) — hero
        </div>
        <ActionButton tone="secondary" icon={faBroomWide} label="Start Over" />
        <ActionButton tone="accent" icon={faImage} label="Print" />
        <ActionButton tone="accent" icon={faShare} label="Share" />
        <div className="text-sm font-coloring-heading text-coloring-muted mt-4">
          Coloring Habitat — compact
        </div>
        <div className="max-w-[200px] flex flex-col gap-2">
          <ActionButton
            size="compact"
            tone="secondary"
            icon={faBroomWide}
            label="Start Over"
          />
          <ActionButton
            size="compact"
            tone="accent"
            icon={faImage}
            label="Print"
          />
          <ActionButton
            size="compact"
            tone="accent"
            icon={faShare}
            label="Share"
          />
        </div>
      </div>
    </div>
  ),
};

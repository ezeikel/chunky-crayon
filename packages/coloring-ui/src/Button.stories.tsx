import type { Meta, StoryObj } from "@storybook/react-vite";
import { Button } from "./Button";

const meta: Meta<typeof Button> = {
  title: "Coloring/Button",
  component: Button,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "Brand-themed Button shared across CC and CH. Variants map to the toast palette where it makes sense (destructive=error, success=success), so a button next to a toast reads as the same brand family.",
      },
    },
  },
  args: {
    children: "Save my page",
  },
  argTypes: {
    variant: {
      control: "select",
      options: [
        "default",
        "secondary",
        "destructive",
        "success",
        "neutral",
        "outline",
        "outline-muted",
        "ghost",
        "link",
      ],
    },
    size: {
      control: "select",
      options: ["default", "sm", "lg", "icon"],
    },
    disabled: { control: "boolean" },
  },
};

export default meta;
type Story = StoryObj<typeof Button>;

export const Default: Story = {};

export const Secondary: Story = { args: { variant: "secondary" } };
export const Destructive: Story = {
  args: { variant: "destructive", children: "Delete profile" },
};
export const Success: Story = {
  args: { variant: "success", children: "All done" },
};
export const Neutral: Story = {
  args: { variant: "neutral", children: "Maybe later" },
};
export const Outline: Story = { args: { variant: "outline" } };
export const OutlineMuted: Story = {
  args: { variant: "outline-muted", children: "Pick another" },
};
export const Ghost: Story = { args: { variant: "ghost" } };
export const Link: Story = {
  args: { variant: "link", children: "Learn more" },
};

export const Sizes: Story = {
  render: () => (
    <div className="flex items-end gap-3">
      <Button size="sm">Small</Button>
      <Button>Default</Button>
      <Button size="lg">Large</Button>
      <Button size="icon" aria-label="icon">
        ★
      </Button>
    </div>
  ),
};

export const AllVariants: Story = {
  render: () => (
    <div className="grid grid-cols-2 gap-3 p-6 bg-coloring-surface rounded-coloring-card">
      <Button>Default</Button>
      <Button variant="secondary">Secondary</Button>
      <Button variant="destructive">Destructive</Button>
      <Button variant="success">Success</Button>
      <Button variant="neutral">Neutral</Button>
      <Button variant="outline">Outline</Button>
      <Button variant="outline-muted">Outline muted</Button>
      <Button variant="ghost">Ghost</Button>
      <Button variant="link">Link</Button>
      <Button disabled>Disabled</Button>
    </div>
  ),
};

/**
 * Real-world patterns the migration found in the CC app — included here so
 * future devs know which variant to reach for instead of inline className
 * overrides like `bg-crayon-orange ...`.
 */
export const RealWorldPatterns: Story = {
  render: () => (
    <div className="flex flex-col gap-6 p-6 bg-coloring-surface rounded-coloring-card max-w-md">
      <div className="flex flex-col gap-2">
        <p className="text-xs font-semibold text-coloring-text-secondary">
          Pricing card — popular plan
        </p>
        <Button className="w-full rounded-full">Start 7-day free trial</Button>
      </div>
      <div className="flex flex-col gap-2">
        <p className="text-xs font-semibold text-coloring-text-secondary">
          Pricing card — non-popular plan
        </p>
        <Button variant="neutral" className="w-full rounded-full">
          Start 7-day free trial
        </Button>
      </div>
      <div className="flex flex-col gap-2">
        <p className="text-xs font-semibold text-coloring-text-secondary">
          Free tools form submit
        </p>
        <Button size="lg" className="w-full">
          Download PDF
        </Button>
      </div>
      <div className="flex flex-col gap-2">
        <p className="text-xs font-semibold text-coloring-text-secondary">
          Voice input — Cancel + Stop pair
        </p>
        <div className="flex gap-3">
          <Button
            variant="outline-muted"
            size="lg"
            className="rounded-full flex-1"
          >
            Cancel
          </Button>
          <Button size="lg" className="rounded-full flex-[2]">
            Stop recording
          </Button>
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <p className="text-xs font-semibold text-coloring-text-secondary">
          Subscribe pitch — secondary CTA
        </p>
        <Button variant="outline">See pricing</Button>
      </div>
    </div>
  ),
};

export const BothBrands: Story = {
  render: () => (
    <div className="grid grid-cols-2 gap-4">
      <div
        data-theme="chunky-crayon"
        className="p-6 rounded-coloring-card bg-coloring-surface flex flex-col gap-3 items-start"
      >
        <p className="font-coloring-heading font-bold text-coloring-text-primary mb-1">
          Chunky Crayon
        </p>
        <Button>Create a page</Button>
        <Button variant="secondary">Try another</Button>
        <Button variant="neutral">Maybe later</Button>
        <Button variant="outline">Skip for now</Button>
        <Button variant="outline-muted">Pick another</Button>
        <Button variant="destructive">Delete</Button>
      </div>
      <div
        data-theme="coloring-habitat"
        className="p-6 rounded-coloring-card bg-coloring-surface flex flex-col gap-3 items-start"
      >
        <p className="font-coloring-heading font-semibold text-coloring-text-primary mb-1">
          Coloring Habitat
        </p>
        <Button>Save to gallery</Button>
        <Button variant="secondary">Try another</Button>
        <Button variant="neutral">Maybe later</Button>
        <Button variant="outline">Skip for now</Button>
        <Button variant="outline-muted">Pick another</Button>
        <Button variant="destructive">Delete</Button>
      </div>
    </div>
  ),
};

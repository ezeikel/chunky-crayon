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
        "outline",
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
export const Outline: Story = { args: { variant: "outline" } };
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
      <Button variant="outline">Outline</Button>
      <Button variant="ghost">Ghost</Button>
      <Button variant="link">Link</Button>
      <Button disabled>Disabled</Button>
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
        <Button variant="outline">Skip for now</Button>
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
        <Button variant="outline">Skip for now</Button>
        <Button variant="destructive">Delete</Button>
      </div>
    </div>
  ),
};

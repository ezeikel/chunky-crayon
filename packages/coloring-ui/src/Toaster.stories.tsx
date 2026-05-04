import type { Meta, StoryObj } from "@storybook/react-vite";
import { Toaster, toast } from "./Toaster";

const TriggerButton = ({
  label,
  onClick,
}: {
  label: string;
  onClick: () => void;
}) => (
  <button
    type="button"
    onClick={onClick}
    className="px-4 py-2 rounded-coloring-button bg-coloring-accent text-white font-[var(--coloring-weight-emphasis)] text-sm shadow-coloring-button hover:bg-coloring-accent-dark active:translate-y-[1px] active:shadow-coloring-button-hover"
  >
    {label}
  </button>
);

const Stage = ({ children }: { children: React.ReactNode }) => (
  <div className="p-8 bg-coloring-surface rounded-coloring-card min-h-[420px] flex flex-col gap-3 items-start">
    {children}
    <Toaster duration={20000} visibleToasts={6} expand />
  </div>
);

const meta: Meta<typeof Toaster> = {
  title: "Coloring/Toaster",
  component: Toaster,
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component:
          "Themed sonner Toaster with FA duotone icons. Mount once in the app root; trigger from anywhere with the exported `toast` API.",
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof Toaster>;

export const Success: Story = {
  render: () => (
    <Stage>
      <TriggerButton
        label="Show success"
        onClick={() => toast.success("Your invite is ready!")}
      />
    </Stage>
  ),
};

export const Error: Story = {
  render: () => (
    <Stage>
      <TriggerButton
        label="Show error"
        onClick={() => toast.error("Please enter your child's name.")}
      />
    </Stage>
  ),
};

export const Info: Story = {
  render: () => (
    <Stage>
      <TriggerButton
        label="Show info"
        onClick={() => toast.info("Worker pipeline triggered.")}
      />
    </Stage>
  ),
};

export const Warning: Story = {
  render: () => (
    <Stage>
      <TriggerButton
        label="Show warning"
        onClick={() => toast.warning("This action can't be undone.")}
      />
    </Stage>
  ),
};

export const Loading: Story = {
  render: () => (
    <Stage>
      <TriggerButton
        label="Show loading"
        onClick={() => toast.loading("Mixing the magic colors...")}
      />
    </Stage>
  ),
};

export const WithDescription: Story = {
  render: () => (
    <Stage>
      <TriggerButton
        label="Show with description"
        onClick={() =>
          toast.success("Profile updated", {
            description: "Your changes have been saved to your account.",
          })
        }
      />
    </Stage>
  ),
};

export const WithAction: Story = {
  render: () => (
    <Stage>
      <TriggerButton
        label="Show with action"
        onClick={() =>
          toast("Profile deleted", {
            description: "Maya was removed from your profiles.",
            action: {
              label: "Undo",
              onClick: () => toast.success("Restored!"),
            },
          })
        }
      />
    </Stage>
  ),
};

export const PromiseToast: Story = {
  render: () => (
    <Stage>
      <TriggerButton
        label="Run promise"
        onClick={() => {
          const promise = new global.Promise<string>((resolve) =>
            setTimeout(() => resolve("Sparkle"), 1500),
          );
          toast.promise(promise, {
            loading: "Brewing your coloring page...",
            success: (name) => `${name} pack is ready!`,
            error: "Something went wrong.",
          });
        }}
      />
    </Stage>
  ),
};

export const BothBrands: Story = {
  render: () => (
    <div className="grid grid-cols-2 gap-4 p-4">
      <div
        data-theme="chunky-crayon"
        className="p-6 rounded-coloring-card bg-coloring-surface min-h-[280px] flex flex-col gap-2"
      >
        <p className="font-coloring-heading font-bold text-coloring-text-primary mb-2">
          Chunky Crayon
        </p>
        <TriggerButton
          label="Success"
          onClick={() => toast.success("Your invite is ready!")}
        />
        <TriggerButton
          label="Error"
          onClick={() => toast.error("Something went wrong.")}
        />
      </div>
      <div
        data-theme="coloring-habitat"
        className="p-6 rounded-coloring-card bg-coloring-surface min-h-[280px] flex flex-col gap-2"
      >
        <p className="font-coloring-heading font-semibold text-coloring-text-primary mb-2">
          Coloring Habitat
        </p>
        <TriggerButton
          label="Success"
          onClick={() => toast.success("Saved to your gallery.")}
        />
        <TriggerButton
          label="Error"
          onClick={() => toast.error("Couldn't reach the server.")}
        />
      </div>
    </div>
  ),
};

export const AllVariants: Story = {
  render: () => (
    <Stage>
      <div className="flex flex-wrap gap-2">
        <TriggerButton
          label="Success"
          onClick={() => toast.success("Saved!")}
        />
        <TriggerButton
          label="Error"
          onClick={() => toast.error("Something went wrong.")}
        />
        <TriggerButton label="Info" onClick={() => toast.info("Heads up.")} />
        <TriggerButton
          label="Warning"
          onClick={() => toast.warning("Careful now.")}
        />
        <TriggerButton
          label="Loading"
          onClick={() => toast.loading("Working on it...")}
        />
      </div>
    </Stage>
  ),
};

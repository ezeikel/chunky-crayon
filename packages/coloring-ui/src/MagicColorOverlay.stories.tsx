import type { Meta, StoryObj } from "@storybook/react-vite";
import MagicColorOverlay from "./MagicColorOverlay";

const meta: Meta<typeof MagicColorOverlay> = {
  title: "Coloring/MagicColorOverlay",
  component: MagicColorOverlay,
  parameters: {
    docs: {
      description: {
        component:
          "Overlay shown over the canvas while the legacy magic-tool warm-up " +
          "is running (on-demand fill-points or 5×5 colour-map generation). " +
          "Renders `loading` or `error` states. Token-based so CC and CH " +
          "render with their own brand gradients.",
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof MagicColorOverlay>;

const Canvas = ({ children }: { children: React.ReactNode }) => (
  <div className="relative w-[560px] h-[420px] rounded-lg bg-coloring-surface overflow-hidden border border-coloring-surface-dark">
    {/* Pretend line art */}
    <div className="absolute inset-8 rounded bg-white" />
    {children}
  </div>
);

export const LoadingColorMap: Story = {
  render: () => (
    <Canvas>
      <MagicColorOverlay state="loading" phase="colorMap" />
    </Canvas>
  ),
};

export const LoadingFillPoints: Story = {
  render: () => (
    <Canvas>
      <MagicColorOverlay state="loading" phase="fillPoints" />
    </Canvas>
  ),
};

export const LoadingWithCustomMessage: Story = {
  render: () => (
    <Canvas>
      <MagicColorOverlay
        state="loading"
        phase="colorMap"
        loadingMessage="Analysing 42 regions…"
      />
    </Canvas>
  ),
};

export const Error: Story = {
  render: () => (
    <Canvas>
      <MagicColorOverlay
        state="error"
        errorMessage="Couldn't build the colour map this time."
        onRetry={() => console.log("retry")}
      />
    </Canvas>
  ),
};

export const BothBrands: Story = {
  render: () => (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 p-4">
      <div
        data-theme="chunky-crayon"
        className="p-6 rounded-coloring-card bg-coloring-surface"
      >
        <div className="text-sm font-coloring-heading text-coloring-muted mb-4">
          Chunky Crayon (kids)
        </div>
        <Canvas>
          <MagicColorOverlay state="loading" phase="fillPoints" />
        </Canvas>
      </div>
      <div
        data-theme="coloring-habitat"
        className="p-6 rounded-coloring-card bg-coloring-surface"
      >
        <div className="text-sm font-coloring-heading text-coloring-muted mb-4">
          Coloring Habitat (adult)
        </div>
        <Canvas>
          <MagicColorOverlay state="loading" phase="fillPoints" />
        </Canvas>
      </div>
    </div>
  ),
};

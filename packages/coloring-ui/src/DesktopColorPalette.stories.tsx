import type { Meta, StoryObj } from "@storybook/react-vite";
import { ColoringContextProvider } from "./context";
import DesktopColorPalette from "./DesktopColorPalette";
import { PALETTE_VARIANTS } from "./types";

const meta: Meta<typeof DesktopColorPalette> = {
  title: "Coloring/DesktopColorPalette",
  component: DesktopColorPalette,
  parameters: {
    docs: {
      description: {
        component:
          "Vertical color palette with mood tabs (realistic / pastel / cute / surprise). " +
          "Picking a mood swaps the swatch grid AND the palette variant the magic tools use — one knob, two effects.",
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof DesktopColorPalette>;

export const Default: Story = {
  decorators: [
    (Story) => (
      <ColoringContextProvider storagePrefix="sb-default">
        <div style={{ width: 200 }}>
          <Story />
        </div>
      </ColoringContextProvider>
    ),
  ],
};

export const Variants: Story = {
  render: () => (
    <div className="flex gap-6">
      {PALETTE_VARIANTS.map((variant) => (
        <div key={variant} className="flex flex-col items-center gap-2">
          <div className="text-xs font-coloring-heading text-coloring-muted capitalize">
            {variant}
          </div>
          <ColoringContextProvider storagePrefix={`sb-variant-${variant}`}>
            <PaletteWithVariant variant={variant} />
          </ColoringContextProvider>
        </div>
      ))}
    </div>
  ),
};

export const BothBrands: Story = {
  render: () => (
    <div className="grid grid-cols-2 gap-8">
      <div
        data-theme="chunky-crayon"
        className="p-8 rounded-coloring-card bg-coloring-surface flex justify-center"
      >
        <ColoringContextProvider variant="kids" storagePrefix="sb-cc-palette">
          <DesktopColorPalette />
        </ColoringContextProvider>
      </div>
      <div
        data-theme="coloring-habitat"
        className="p-8 rounded-coloring-card bg-coloring-surface flex justify-center"
      >
        <ColoringContextProvider variant="adult" storagePrefix="sb-ch-palette">
          <DesktopColorPalette />
        </ColoringContextProvider>
      </div>
    </div>
  ),
};

// Helper: render the palette with a specific variant pre-selected.
import { useEffect } from "react";
import { useColoringContext } from "./context";
import type { PaletteVariant } from "./types";

const PaletteWithVariant = ({ variant }: { variant: PaletteVariant }) => {
  const { setPaletteVariant } = useColoringContext();
  useEffect(() => {
    setPaletteVariant(variant);
  }, [variant, setPaletteVariant]);
  return <DesktopColorPalette />;
};

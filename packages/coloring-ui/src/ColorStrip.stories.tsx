import type { Meta, StoryObj } from "@storybook/react-vite";
import React, { useState } from "react";

const COLORS = [
  { name: "Red", hex: "#EF4444" },
  { name: "Orange", hex: "#F97316" },
  { name: "Yellow", hex: "#EAB308" },
  { name: "Green", hex: "#22C55E" },
  { name: "Teal", hex: "#14B8A6" },
  { name: "Blue", hex: "#3B82F6" },
  { name: "Indigo", hex: "#6366F1" },
  { name: "Purple", hex: "#A855F7" },
  { name: "Pink", hex: "#EC4899" },
  { name: "Rose", hex: "#F43F5E" },
  { name: "Brown", hex: "#92400E" },
  { name: "Tan", hex: "#D2B48C" },
  { name: "Gray", hex: "#6B7280" },
  { name: "Black", hex: "#000000" },
  { name: "White", hex: "#FFFFFF" },
  { name: "Coral", hex: "#FF7F7F" },
  { name: "Peach", hex: "#FFB899" },
  { name: "Lime", hex: "#84CC16" },
  { name: "Sky", hex: "#38BDF8" },
  { name: "Lavender", hex: "#C4B5FD" },
];

const ColorStripMockup = () => {
  const [selected, setSelected] = useState("#EF4444");

  return (
    <div className="relative max-w-md">
      <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-white via-white/80 to-transparent pointer-events-none z-10 rounded-r-lg" />
      <div className="flex gap-2 p-2 overflow-x-auto bg-white/95 backdrop-blur-sm rounded-lg [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        {COLORS.map((color) => {
          const isSelected = selected === color.hex;
          const isWhite = color.hex === "#FFFFFF";
          return (
            <button
              key={color.hex}
              type="button"
              onClick={() => setSelected(color.hex)}
              className={`flex-shrink-0 rounded-full transition-all duration-150 ${
                isSelected
                  ? "size-10 ring-2 ring-coloring-accent ring-offset-2 scale-110"
                  : "size-8 hover:scale-110"
              } ${isWhite ? "border border-gray-200" : ""}`}
              style={{ backgroundColor: color.hex }}
              title={color.name}
            />
          );
        })}
      </div>
    </div>
  );
};

const meta: Meta = {
  title: "App/ColorStrip",
};

export default meta;
type Story = StoryObj;

export const Default: Story = {
  render: () => <ColorStripMockup />,
};

export const BothBrands: Story = {
  render: () => (
    <div className="flex flex-col gap-8">
      <div
        data-theme="chunky-crayon"
        className="p-6 bg-coloring-surface rounded-xl"
      >
        <div className="text-sm font-coloring-heading text-coloring-muted mb-3">
          Chunky Crayon (kids) — mobile color strip
        </div>
        <ColorStripMockup />
      </div>
      <div
        data-theme="coloring-habitat"
        className="p-6 bg-coloring-surface rounded-xl"
      >
        <div className="text-sm font-coloring-heading text-coloring-muted mb-3">
          Coloring Habitat (adults) — mobile color strip
        </div>
        <ColorStripMockup />
      </div>
    </div>
  ),
};

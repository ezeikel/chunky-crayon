import type { Meta, StoryObj } from "@storybook/react-vite";
import React, { useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faPencil,
  faPaintbrush,
  faPenNib,
  faPaintRoller,
  faFillDrip,
  faEraser,
  faSparkles,
  faStar,
  faBrush,
  faHand,
} from "@fortawesome/pro-duotone-svg-icons";
import {
  faBroomWide,
  faImage,
  faShare,
  faCloudArrowUp,
} from "@fortawesome/pro-solid-svg-icons";

// -- Inline SVG icons matching DesktopToolsSidebar --

const UndoIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M3 7v6h6" />
    <path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13" />
  </svg>
);

const RedoIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M21 7v6h-6" />
    <path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3l3 2.7" />
  </svg>
);

const ZoomInIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="11" cy="11" r="8" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
    <line x1="11" y1="8" x2="11" y2="14" />
    <line x1="8" y1="11" x2="14" y2="11" />
  </svg>
);

const ZoomOutIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="11" cy="11" r="8" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
    <line x1="8" y1="11" x2="14" y2="11" />
  </svg>
);

// -- Tool configs --

type ToolDef = { id: string; icon: typeof faPencil; isMagic?: boolean };

const regularTools: ToolDef[] = [
  { id: "crayon", icon: faPencil },
  { id: "marker", icon: faPaintbrush },
  { id: "pencil", icon: faPenNib },
  { id: "paintbrush", icon: faPaintRoller },
  { id: "glitter", icon: faSparkles },
  { id: "fill", icon: faFillDrip },
  { id: "eraser", icon: faEraser },
  { id: "sticker", icon: faStar },
];

const magicTools: ToolDef[] = [
  { id: "magic-brush", icon: faBrush, isMagic: true },
  { id: "auto-color", icon: faFillDrip, isMagic: true },
];

const brushSizes = [
  { name: "xs", radius: 3 },
  { name: "sm", radius: 6 },
  { name: "md", radius: 10 },
  { name: "lg", radius: 16 },
];

// -- Stateful sidebar mockup --

const SidebarMockup = () => {
  const [activeTool, setActiveTool] = useState("crayon");
  const [brushSize, setBrushSize] = useState("md");
  const selectedColor = "#FF9800";

  return (
    <div className="w-fit flex flex-col gap-4 p-4 bg-white/95 backdrop-blur-sm rounded-2xl border-2 border-coloring-surface-dark shadow-lg">
      {/* Tool Grid */}
      <div className="flex flex-col gap-2">
        <div className="grid grid-cols-3 gap-3 w-fit">
          {regularTools.map(({ id, icon }) => {
            const isActive = activeTool === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => setActiveTool(id)}
                className={`flex items-center justify-center size-16 rounded-coloring-card transition-all duration-coloring-base ease-coloring active:scale-95 ${
                  isActive
                    ? "bg-coloring-accent text-white shadow-sm"
                    : "bg-white border border-coloring-surface-dark text-gray-700 hover:bg-coloring-surface"
                }`}
                title={id}
              >
                <FontAwesomeIcon icon={icon} size="xl" />
              </button>
            );
          })}
        </div>

        {/* Magic Tools */}
        <div className="grid grid-cols-2 gap-3 w-fit mt-1">
          {magicTools.map(({ id, icon }) => {
            const isActive = activeTool === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => setActiveTool(id)}
                className={`relative flex items-center justify-center size-16 rounded-coloring-card transition-all active:scale-95 ${
                  isActive
                    ? "bg-gradient-to-br from-purple-500 to-pink-400 text-white"
                    : "bg-gradient-to-br from-purple-500/10 to-pink-400/10 text-purple-600 hover:from-purple-500/20 hover:to-pink-400/20"
                }`}
                title={id}
              >
                <FontAwesomeIcon icon={icon} size="xl" />
                <FontAwesomeIcon
                  icon={faSparkles}
                  size="lg"
                  className={`absolute -top-2 -right-2 drop-shadow-sm ${isActive ? "text-white" : "text-purple-500"}`}
                />
              </button>
            );
          })}
        </div>
      </div>

      <div className="h-px bg-coloring-surface-dark" />

      {/* Brush Sizes */}
      <div className="flex items-center justify-between gap-1">
        {brushSizes.map(({ name, radius }) => {
          const isSelected = brushSize === name;
          return (
            <button
              key={name}
              type="button"
              onClick={() => setBrushSize(name)}
              className={`flex items-center justify-center size-12 rounded-coloring-card transition-all duration-150 hover:bg-gray-100 active:scale-95 ${
                isSelected ? "bg-gray-200 ring-2 ring-gray-400" : ""
              }`}
              title={name}
            >
              <span
                className="rounded-full"
                style={{
                  width: `${Math.min(radius * 2, 32)}px`,
                  height: `${Math.min(radius * 2, 32)}px`,
                  backgroundColor: selectedColor,
                }}
              />
            </button>
          );
        })}
      </div>

      <div className="h-px bg-coloring-surface-dark" />

      {/* Undo/Redo */}
      <div className="flex items-center justify-center gap-2">
        <button
          type="button"
          className="flex items-center justify-center size-12 rounded-coloring-card hover:bg-gray-100 active:scale-95 text-gray-700"
          title="Undo"
        >
          <UndoIcon className="size-8" />
        </button>
        <button
          type="button"
          className="flex items-center justify-center size-12 rounded-coloring-card text-gray-300 cursor-not-allowed"
          title="Redo"
          disabled
        >
          <RedoIcon className="size-8" />
        </button>
      </div>

      <div className="h-px bg-coloring-surface-dark" />

      {/* Zoom */}
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center justify-center gap-1">
          <button
            type="button"
            className="flex items-center justify-center size-12 rounded-coloring-card hover:bg-gray-100 active:scale-95"
            title="Zoom Out"
          >
            <ZoomOutIcon className="size-7" />
          </button>
          <button
            type="button"
            className="flex items-center justify-center size-12 rounded-coloring-card hover:bg-gray-100 active:scale-95"
            title="Zoom In"
          >
            <ZoomInIcon className="size-7" />
          </button>
        </div>
        <div className="text-center font-coloring-heading font-bold text-xl tabular-nums">
          100%
        </div>
      </div>

      <div className="h-px bg-coloring-surface-dark" />

      {/* Actions */}
      <div className="flex flex-wrap items-start justify-between gap-2">
        <button
          type="button"
          className="flex items-center justify-center size-16 rounded-coloring-card border border-coloring-surface-dark hover:bg-coloring-surface text-gray-600"
          title="Start Over"
        >
          <FontAwesomeIcon icon={faBroomWide} size="lg" />
        </button>
        <button
          type="button"
          className="flex items-center justify-center size-16 rounded-coloring-card border border-coloring-surface-dark hover:bg-coloring-surface text-coloring-accent"
          title="Print"
        >
          <FontAwesomeIcon icon={faImage} size="lg" />
        </button>
        <button
          type="button"
          className="flex items-center justify-center size-16 rounded-coloring-card border border-coloring-surface-dark hover:bg-coloring-surface text-coloring-accent"
          title="Share"
        >
          <FontAwesomeIcon icon={faShare} size="lg" />
        </button>
        <button
          type="button"
          className="flex items-center justify-center size-16 rounded-coloring-card border border-coloring-surface-dark hover:bg-coloring-surface text-coloring-success"
          title="Save"
        >
          <FontAwesomeIcon icon={faCloudArrowUp} size="lg" />
        </button>
      </div>
    </div>
  );
};

// -- Story config --

const meta: Meta = {
  title: "App/DesktopToolsSidebar",
};

export default meta;
type Story = StoryObj;

export const Default: Story = {
  render: () => <SidebarMockup />,
};

export const BothBrands: Story = {
  render: () => (
    <div className="grid grid-cols-2 gap-8">
      <div
        data-theme="chunky-crayon"
        className="p-8 bg-coloring-surface rounded-xl"
      >
        <div className="text-sm font-coloring-heading text-coloring-muted mb-4">
          Chunky Crayon (kids)
        </div>
        <SidebarMockup />
      </div>
      <div
        data-theme="coloring-habitat"
        className="p-8 bg-coloring-surface rounded-xl"
      >
        <div className="text-sm font-coloring-heading text-coloring-muted mb-4">
          Coloring Habitat (adults)
        </div>
        <SidebarMockup />
      </div>
    </div>
  ),
};

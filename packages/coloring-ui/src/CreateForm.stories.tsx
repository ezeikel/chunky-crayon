import type { Meta, StoryObj } from "@storybook/react-vite";
import React, { useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faPencil,
  faMicrophoneLines,
  faCameraRetro,
  faWandMagicSparkles,
} from "@fortawesome/pro-duotone-svg-icons";

// -- Input Mode Selector --

type InputMode = "text" | "voice" | "image";

const modes: { mode: InputMode; icon: typeof faPencil; label: string }[] = [
  { mode: "text", icon: faPencil, label: "Type" },
  { mode: "voice", icon: faMicrophoneLines, label: "Talk" },
  { mode: "image", icon: faCameraRetro, label: "Photo" },
];

const InputModeSelectorMockup = ({
  active,
  onChange,
}: {
  active: InputMode;
  onChange: (m: InputMode) => void;
}) => (
  <div className="flex gap-2 md:gap-3 justify-center" role="tablist">
    {modes.map(({ mode, icon }) => {
      const isActive = mode === active;
      return (
        <button
          key={mode}
          type="button"
          role="tab"
          aria-selected={isActive}
          onClick={() => onChange(mode)}
          className={`flex items-center justify-center size-14 md:size-16 rounded-coloring-card border-2 transition-all duration-200 ease-out ${
            isActive
              ? "bg-coloring-accent border-transparent text-white shadow-coloring-button"
              : "bg-white border-coloring-surface-dark text-gray-700 hover:border-coloring-accent hover:bg-coloring-accent/5"
          }`}
        >
          <FontAwesomeIcon icon={icon} size="2x" />
        </button>
      );
    })}
  </div>
);

// -- Text Input --

const TextInputMockup = () => (
  <textarea
    className="font-coloring-body text-base md:text-lg border-2 border-coloring-surface-dark bg-coloring-surface/40 hover:border-coloring-accent/50 hover:bg-white h-36 md:h-40 rounded-coloring-card resize-none p-4 md:p-5 w-full placeholder:text-coloring-muted focus:outline-none focus:ring-2 focus:ring-coloring-accent focus:ring-offset-2 focus:border-coloring-accent transition-all duration-200"
    placeholder="A dinosaur astronaut playing guitar on the moon..."
  />
);

// -- Voice Input --

const VoiceInputMockup = ({ recording }: { recording?: boolean }) => (
  <div className="flex flex-col items-center gap-4 py-8">
    <button
      type="button"
      className={`size-20 rounded-full flex items-center justify-center transition-all ${
        recording
          ? "bg-red-500 text-white shadow-lg animate-pulse"
          : "bg-coloring-accent text-white shadow-coloring-button hover:shadow-coloring-button-hover"
      }`}
    >
      <FontAwesomeIcon icon={faMicrophoneLines} size="2x" />
    </button>
    <p className="text-sm text-coloring-muted font-coloring-body">
      {recording ? "Listening..." : "Tap to describe your coloring page"}
    </p>
  </div>
);

// -- Image Input --

const ImageInputMockup = () => (
  <div className="flex flex-col items-center gap-4 py-8">
    <div className="size-32 rounded-coloring-card border-2 border-dashed border-coloring-surface-dark flex items-center justify-center hover:border-coloring-accent hover:bg-coloring-accent/5 transition-all cursor-pointer">
      <FontAwesomeIcon
        icon={faCameraRetro}
        size="3x"
        className="text-coloring-muted"
      />
    </div>
    <p className="text-sm text-coloring-muted font-coloring-body">
      Upload a photo to turn into a coloring page
    </p>
  </div>
);

// -- Free Tries Chip --

const FreeTriesChip = ({ remaining }: { remaining: number }) => (
  <div className="flex justify-center">
    <span className="font-coloring-heading text-sm font-bold text-coloring-accent bg-coloring-accent/15 px-3 py-1 rounded-coloring-pill">
      {remaining} free tries left
    </span>
  </div>
);

// -- Submit Button --

const SubmitButtonMockup = ({
  disabled,
  text = "Create",
}: {
  disabled?: boolean;
  text?: string;
}) => (
  <button
    type="button"
    disabled={disabled}
    className={`flex items-center justify-center gap-2 w-full font-coloring-heading font-bold text-base md:text-lg text-white bg-coloring-accent shadow-coloring-button hover:shadow-coloring-button-hover hover:scale-105 active:scale-95 transition-all duration-200 rounded-coloring-pill py-4 ${
      disabled ? "opacity-50 cursor-not-allowed hover:scale-100" : ""
    }`}
  >
    <FontAwesomeIcon icon={faWandMagicSparkles} className="text-lg" />
    {text}
  </button>
);

// -- Full Form Composition --

const CreateFormMockup = ({ mode: initialMode }: { mode?: InputMode }) => {
  const [mode, setMode] = useState<InputMode>(initialMode ?? "text");

  return (
    <div className="flex flex-col gap-y-5 p-6 md:p-8 bg-white rounded-coloring-card shadow-coloring-surface border-2 border-coloring-surface-dark max-w-lg">
      <InputModeSelectorMockup active={mode} onChange={setMode} />

      {mode === "text" && <TextInputMockup />}
      {mode === "voice" && <VoiceInputMockup />}
      {mode === "image" && <ImageInputMockup />}

      <div className="flex flex-col gap-3">
        <FreeTriesChip remaining={3} />
        <SubmitButtonMockup disabled={mode !== "text"} />
      </div>
    </div>
  );
};

// -- Story config --

const meta: Meta = {
  title: "App/CreateForm",
};

export default meta;
type Story = StoryObj;

export const TextMode: Story = {
  render: () => <CreateFormMockup mode="text" />,
};

export const VoiceMode: Story = {
  render: () => <CreateFormMockup mode="voice" />,
};

export const VoiceRecording: Story = {
  render: () => (
    <div className="flex flex-col gap-y-5 p-6 md:p-8 bg-white rounded-coloring-card shadow-coloring-surface border-2 border-coloring-surface-dark max-w-lg">
      <InputModeSelectorMockup active="voice" onChange={() => {}} />
      <VoiceInputMockup recording />
    </div>
  ),
};

export const ImageMode: Story = {
  render: () => <CreateFormMockup mode="image" />,
};

export const InputModeSelector: Story = {
  render: () => {
    const [mode, setMode] = useState<InputMode>("text");
    return <InputModeSelectorMockup active={mode} onChange={setMode} />;
  },
};

export const SubmitButton: Story = {
  render: () => (
    <div className="flex flex-col gap-4 max-w-sm">
      <SubmitButtonMockup />
      <SubmitButtonMockup disabled text="Create" />
    </div>
  ),
};

export const AuthBlocked: Story = {
  render: () => (
    <div className="flex flex-col gap-y-5 p-6 md:p-8 bg-white rounded-coloring-card shadow-coloring-surface border-2 border-coloring-surface-dark max-w-lg">
      <InputModeSelectorMockup active="text" onChange={() => {}} />
      <textarea
        className="font-coloring-body text-base border-2 border-coloring-surface-dark bg-coloring-surface h-36 rounded-coloring-card resize-none p-4 w-full text-coloring-muted cursor-not-allowed"
        placeholder="Sign up to create coloring pages!"
        disabled
      />
      <div className="flex flex-col gap-3">
        <button
          type="button"
          className="w-full font-coloring-heading font-bold text-base md:text-lg text-white bg-coloring-accent shadow-coloring-button rounded-coloring-pill py-4"
        >
          Sign Up Free
        </button>
        <p className="font-coloring-body text-sm text-center text-coloring-muted">
          Create your own coloring pages in seconds
        </p>
      </div>
    </div>
  ),
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
        <CreateFormMockup mode="text" />
      </div>
      <div
        data-theme="coloring-habitat"
        className="p-8 bg-coloring-surface rounded-xl"
      >
        <div className="text-sm font-coloring-heading text-coloring-muted mb-4">
          Coloring Habitat (adults)
        </div>
        <CreateFormMockup mode="text" />
      </div>
    </div>
  ),
};

import type { Meta, StoryObj } from '@storybook/react-vite';
import CreateColoringPageForm from '@/components/forms/CreateColoringPageForm/CreateColoringPageForm';
import FormCTA from '@/components/forms/CreateColoringPageForm/FormCTA';
import QualityPicker from '@/components/forms/CreateColoringPageForm/QualityPicker/QualityPicker';
import {
  ExamplePrompts,
  ImageInput,
  InputModeProvider,
  InputModeSelector,
  SceneInput,
  TextInput,
  VoiceInput,
} from '@/components/forms/CreateColoringPageForm/inputs';
import JoinColoringPageEmailListForm from '@/components/forms/JoinColoringPageEmailListForm/JoinColoringPageEmailListForm';
import SubmitButton from '@/components/buttons/SubmitButton/SubmitButton';
import StartOverButton from '@/components/buttons/StartOverButton/StartOverButton';
import SignInOptions from '@/components/buttons/SignInOptions/SignInOptions';
import { ParentalGateProvider } from '@/components/ParentalGate';
import { faWandMagicSparkles } from '@fortawesome/pro-duotone-svg-icons';

const meta = {
  title: 'Chunky Crayon/03 Forms & Actions',
  parameters: {
    docs: {
      description: {
        component:
          'Creation form pieces, auth buttons, email capture, and repeated action buttons used across coloring pages and account flows.',
      },
    },
  },
} satisfies Meta;

export default meta;
type Story = StoryObj;

export const CreateColoringPageFormDefault: Story = {
  render: () => <CreateColoringPageForm location="homepage" />,
};

export const CreateColoringPageFormLarge: Story = {
  globals: { authState: 'signed-in' },
  render: () => <CreateColoringPageForm size="large" location="homepage" />,
};

export const InputModePieces: Story = {
  render: () => (
    <main className="p-8">
      <div className="mx-auto max-w-xl rounded-2xl border-2 border-paper-cream-dark bg-white p-6 shadow-card">
        <InputModeProvider>
          <div className="flex flex-col gap-5">
            <InputModeSelector />
            <TextInput />
            <ExamplePrompts location="homepage" />
            <QualityPicker
              value="low"
              onChange={() => undefined}
              isSubscriber={false}
            />
            <FormCTA
              openPaywall={() => undefined}
              user={{
                canGenerate: true,
                blockedReason: null,
                hasActiveSubscription: false,
                isGuest: false,
                guestGenerationsRemaining: 2,
              }}
            />
          </div>
        </InputModeProvider>
      </div>
    </main>
  ),
};

// ─── Per-input stories ────────────────────────────────────────────────
// Each input mode is its own surface — text textarea, voice mic, image
// upload, scene tile-picker. A focused story per mode lets you tweak
// that surface in isolation rather than digging through the composed
// `InputModePieces` example above.

const InputCard = ({ children }: { children: React.ReactNode }) => (
  <main className="p-8">
    <div className="mx-auto max-w-xl rounded-2xl border-2 border-paper-cream-dark bg-white p-6 shadow-card">
      {children}
    </div>
  </main>
);

export const TextInputStory: Story = {
  name: 'Input — Text',
  render: () => (
    <InputCard>
      <InputModeProvider>
        <TextInput />
      </InputModeProvider>
    </InputCard>
  ),
};

export const VoiceInputStory: Story = {
  name: 'Input — Voice',
  render: () => (
    // VoiceInput is gated behind the parental gate (voice mode is a
    // parent-facing capability), so it needs the gate provider.
    <ParentalGateProvider>
      <InputCard>
        <InputModeProvider>
          <VoiceInput onComplete={async () => undefined} />
        </InputModeProvider>
      </InputCard>
    </ParentalGateProvider>
  ),
};

export const ImageInputStory: Story = {
  name: 'Input — Image',
  render: () => (
    <InputCard>
      <InputModeProvider>
        <ImageInput />
      </InputModeProvider>
    </InputCard>
  ),
};

export const SceneInputStory: Story = {
  name: 'Input — Scene Builder',
  render: () => (
    // Scene Builder owns its own Create button + paywall affordance, so
    // it gets the callbacks but they no-op here. `charactersEnabled` is
    // false so the `your-character` tile is dropped (no auth dead-end
    // from a Storybook canvas).
    <main className="p-8">
      <div className="mx-auto max-w-3xl rounded-2xl border-2 border-paper-cream-dark bg-white p-6 shadow-card">
        <InputModeProvider>
          <SceneInput
            onChange={() => undefined}
            onCreate={() => undefined}
            charactersEnabled={false}
          />
        </InputModeProvider>
      </div>
    </main>
  ),
};

export const EmailSignup: Story = {
  render: () => (
    <main className="p-8">
      <JoinColoringPageEmailListForm className="max-w-md" location="other" />
    </main>
  ),
};

export const ActionButtons: Story = {
  render: () => (
    <main className="flex flex-wrap items-center gap-4 p-8">
      <SubmitButton text="Create" icon={faWandMagicSparkles} />
      <StartOverButton onStartOver={() => undefined} />
    </main>
  ),
};

export const SignInOptionsCard: Story = {
  render: () => (
    <main className="flex min-h-screen items-center justify-center p-4 sm:p-8">
      <SignInOptions />
    </main>
  ),
};

export const SignInOptionsNarrowAppShell: Story = {
  render: () => (
    <main className="flex min-h-screen w-[295px] min-w-0 items-center justify-center overflow-x-hidden px-0 py-4">
      <SignInOptions />
    </main>
  ),
};

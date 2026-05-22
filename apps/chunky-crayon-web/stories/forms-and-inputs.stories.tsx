import type { Meta, StoryObj } from '@storybook/react-vite';
import CreateColoringPageForm from '@/components/forms/CreateColoringPageForm/CreateColoringPageForm';
import FormCTA from '@/components/forms/CreateColoringPageForm/FormCTA';
import QualityPicker from '@/components/forms/CreateColoringPageForm/QualityPicker/QualityPicker';
import {
  ExamplePrompts,
  ImageInput,
  InputModeProvider,
  InputModeSelector,
  TextInput,
  VoiceInput,
} from '@/components/forms/CreateColoringPageForm/inputs';
import JoinColoringPageEmailListForm from '@/components/forms/JoinColoringPageEmailListForm/JoinColoringPageEmailListForm';
import SubmitButton from '@/components/buttons/SubmitButton/SubmitButton';
import ShareButton from '@/components/buttons/ShareButton';
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

export const VoiceAndPhotoInputs: Story = {
  render: () => (
    <ParentalGateProvider>
      <main className="grid gap-6 p-8 md:grid-cols-2">
        <div className="rounded-2xl border-2 border-paper-cream-dark bg-white p-6 shadow-card">
          <InputModeProvider>
            <VoiceInput onComplete={async () => undefined} />
          </InputModeProvider>
        </div>
        <div className="rounded-2xl border-2 border-paper-cream-dark bg-white p-6 shadow-card">
          <InputModeProvider>
            <ImageInput />
          </InputModeProvider>
        </div>
      </main>
    </ParentalGateProvider>
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
      <ShareButton url="https://chunkycrayon.com/gallery" title="Share page" />
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

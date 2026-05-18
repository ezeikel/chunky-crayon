import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faCircleCheck,
  faHeadset,
  faLock,
  faSparkles,
} from '@fortawesome/pro-duotone-svg-icons';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import ParentalGateModal from '@/components/ParentalGate/ParentalGateModal';
import FeedbackDialog from '@/components/FeedbackDialog/FeedbackDialog';
import StartOverButton from '@/components/buttons/StartOverButton/StartOverButton';
import { Button } from '@/components/ui/button';

const meta = {
  title: 'Chunky Crayon/05 Modals',
  parameters: {
    docs: {
      description: {
        component:
          'Modal shells and high-friction flows used across Chunky Crayon. These stories keep modal typography, icon badges, borders, and action rows easy to compare.',
      },
    },
  },
} satisfies Meta;

export default meta;
type Story = StoryObj;

const modalIconStyle = {
  '--fa-primary-color': 'hsl(var(--crayon-orange))',
  '--fa-secondary-color': 'hsl(var(--crayon-yellow))',
  '--fa-secondary-opacity': '1',
} as React.CSSProperties;

const OpenDialogShell = () => (
  <Dialog open>
    <DialogContent>
      <DialogHeader>
        <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-full bg-crayon-orange/10">
          <FontAwesomeIcon
            icon={faSparkles}
            className="text-3xl"
            style={modalIconStyle}
          />
        </div>
        <DialogTitle>Modal title pattern</DialogTitle>
        <DialogDescription>
          A short Rooney Sans description explains the action in plain parent
          language.
        </DialogDescription>
      </DialogHeader>
      <div className="mt-6 flex justify-center gap-3">
        <Button variant="outline" className="h-12 min-w-36">
          Cancel
        </Button>
        <Button className="h-12 min-w-36">Continue</Button>
      </div>
    </DialogContent>
  </Dialog>
);

const OpenParentalGate = () => {
  const [open, setOpen] = useState(true);
  return (
    <ParentalGateModal
      open={open}
      onOpenChange={setOpen}
      targetPath="/support"
    />
  );
};

const OpenFeedbackDialog = () => {
  const [open, setOpen] = useState(true);
  return (
    <FeedbackDialog
      open={open}
      onOpenChange={setOpen}
      trigger={<Button>Open feedback</Button>}
      userEmail="maya@example.com"
      userName="Maya Parent"
    />
  );
};

export const DialogShellOpen: Story = {
  render: () => (
    <main className="min-h-screen bg-paper p-8">
      <OpenDialogShell />
    </main>
  ),
};

export const ParentalGateOpen: Story = {
  render: () => (
    <main className="min-h-screen bg-paper p-8">
      <OpenParentalGate />
    </main>
  ),
};

export const FeedbackOpen: Story = {
  render: () => (
    <main className="min-h-screen bg-paper p-8">
      <OpenFeedbackDialog />
    </main>
  ),
};

export const ModalLauncherGrid: Story = {
  render: () => (
    <main className="p-8">
      <div className="mx-auto grid max-w-5xl gap-5 md:grid-cols-3">
        <article className="rounded-3xl border-2 border-paper-cream-dark bg-white p-6 text-center shadow-card">
          <FontAwesomeIcon
            icon={faLock}
            className="text-3xl text-crayon-orange"
          />
          <h2 className="mt-4 font-tondo text-xl font-bold text-text-primary">
            Parent gate
          </h2>
          <p className="mt-2 text-text-secondary">
            A grown-up unlock for voice mode and external links.
          </p>
          <div className="mt-5">
            <Button>Open parent gate</Button>
          </div>
        </article>
        <article className="rounded-3xl border-2 border-paper-cream-dark bg-white p-6 text-center shadow-card">
          <FontAwesomeIcon
            icon={faHeadset}
            className="text-3xl text-crayon-purple"
          />
          <h2 className="mt-4 font-tondo text-xl font-bold text-text-primary">
            Feedback
          </h2>
          <p className="mt-2 text-text-secondary">
            Support, bug reports, ideas, and quick parent messages.
          </p>
          <div className="mt-5">
            <Button variant="secondary">Open feedback</Button>
          </div>
        </article>
        <article className="rounded-3xl border-2 border-paper-cream-dark bg-white p-6 text-center shadow-card">
          <FontAwesomeIcon
            icon={faCircleCheck}
            className="text-3xl text-crayon-green"
          />
          <h2 className="mt-4 font-tondo text-xl font-bold text-text-primary">
            Confirm action
          </h2>
          <p className="mt-2 text-text-secondary">
            Start-over and destructive confirmations use large icon buttons.
          </p>
          <div className="mt-5 flex justify-center">
            <StartOverButton onStartOver={() => undefined} />
          </div>
        </article>
      </div>
    </main>
  ),
};

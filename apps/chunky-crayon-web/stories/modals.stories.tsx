import { useEffect, useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faCircleCheck,
  faHeadset,
  faLock,
  faSparkles,
} from '@fortawesome/pro-duotone-svg-icons';
import {
  AutoColorModal,
  MagicColorOverlay,
  useColoringContext,
} from '@one-colored-pixel/coloring-ui';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import ParentalGateModal from '@/components/ParentalGate/ParentalGateModal';
import FeedbackDialog from '@/components/FeedbackDialog/FeedbackDialog';
import PaywallModal, {
  type PaywallState,
} from '@/components/PaywallModal/PaywallModal';
import CreateProfileModal from '@/components/CreateProfileModal/CreateProfileModal';
import EmailCaptureModal, {
  EMAIL_CAPTURE_PROMPT_EVENT,
} from '@/components/EmailCaptureModal/EmailCaptureModal';
import CreateCharacterModal from '@/components/Characters/CreateCharacterModal/CreateCharacterModal';
import ShareArtworkModal from '@/components/ShareArtworkModal/ShareArtworkModal';
import StickerDetailModal from '@/components/StickerBook/StickerDetailModal';
import StartOverButton from '@/components/buttons/StartOverButton/StartOverButton';
import { Button } from '@/components/ui/button';
import { STICKER_CATALOG } from '@/lib/stickers/catalog';

/**
 * The Modals section. Every modal that exists in the Chunky Crayon web
 * app gets a story here, in its meaningful states — a Modals section
 * must not be missing a modal that exists in the app.
 *
 * Modals are rendered with `open` forced true so the dialog content is
 * visible in the Storybook canvas. State-bearing modals (Paywall,
 * ShareArtwork) get one story per state.
 */
const meta = {
  title: 'Chunky Crayon/05 Modals',
  parameters: {
    docs: {
      description: {
        component:
          'Modal shells and high-friction flows used across Chunky Crayon. These stories keep modal typography, icon badges, borders, and action rows easy to compare. Every modal in the app appears here, in its meaningful states.',
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

const Stage = ({ children }: { children: React.ReactNode }) => (
  <main className="min-h-screen bg-paper p-8">{children}</main>
);

// ─── Generic dialog shell ─────────────────────────────────────────────

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

export const DialogShellOpen: Story = {
  name: 'Dialog shell',
  render: () => (
    <Stage>
      <OpenDialogShell />
    </Stage>
  ),
};

// ─── ParentalGateModal ────────────────────────────────────────────────

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

export const ParentalGateOpen: Story = {
  name: 'Parental gate',
  render: () => (
    <Stage>
      <OpenParentalGate />
    </Stage>
  ),
};

// ─── FeedbackDialog ───────────────────────────────────────────────────

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

export const FeedbackOpen: Story = {
  name: 'Feedback dialog',
  render: () => (
    <Stage>
      <OpenFeedbackDialog />
    </Stage>
  ),
};

// ─── PaywallModal — three states ──────────────────────────────────────

const OpenPaywall = ({ state }: { state: PaywallState }) => {
  const [open, setOpen] = useState(true);
  return (
    <PaywallModal
      open={open}
      onOpenChange={setOpen}
      state={state}
      triggerLocation="storybook"
      currency="GBP"
    />
  );
};

export const PaywallGuestLimit: Story = {
  name: 'Paywall — guest limit',
  render: () => (
    <Stage>
      <OpenPaywall state="guest_limit" />
    </Stage>
  ),
};

export const PaywallNoSubscription: Story = {
  name: 'Paywall — no subscription',
  render: () => (
    <Stage>
      <OpenPaywall state="no_subscription" />
    </Stage>
  ),
};

export const PaywallSubscriberNoCredits: Story = {
  name: 'Paywall — subscriber out of credits',
  render: () => (
    <Stage>
      <OpenPaywall state="subscriber_no_credits" />
    </Stage>
  ),
};

// ─── CreateProfileModal ───────────────────────────────────────────────

const OpenCreateProfile = () => {
  const [open, setOpen] = useState(true);
  return <CreateProfileModal open={open} onOpenChange={setOpen} />;
};

export const CreateProfileOpen: Story = {
  name: 'Create profile',
  render: () => (
    <Stage>
      <OpenCreateProfile />
    </Stage>
  ),
};

// ─── EmailCaptureModal ────────────────────────────────────────────────
// Self-managed: it opens in response to a DOM event after a short delay.
// The story fires that event on mount so the modal appears in the canvas.

const OpenEmailCapture = () => {
  useEffect(() => {
    // Clear any prior dismiss/capture state so the modal is eligible.
    try {
      window.localStorage.removeItem('cc_email_captured');
      window.localStorage.removeItem('cc_email_modal_dismissed_at');
    } catch {
      // ignore — Safari private mode
    }
    document.dispatchEvent(new Event(EMAIL_CAPTURE_PROMPT_EVENT));
  }, []);
  return <EmailCaptureModal sourceSlug="storybook" />;
};

export const EmailCaptureOpen: Story = {
  name: 'Email capture',
  render: () => (
    <Stage>
      <OpenEmailCapture />
    </Stage>
  ),
};

// ─── CreateCharacterModal (Character Builder — 5-step wizard) ──────────

const OpenCreateCharacter = () => {
  const [open, setOpen] = useState(true);
  return <CreateCharacterModal open={open} onClose={() => setOpen(false)} />;
};

export const CreateCharacterOpen: Story = {
  name: 'Create character (Character Builder)',
  render: () => (
    <Stage>
      <OpenCreateCharacter />
    </Stage>
  ),
};

// ─── ShareArtworkModal ────────────────────────────────────────────────
// The parental gate runs at the caller before the modal opens, so the
// modal itself starts at the share-options step.

const OpenShareArtwork = () => {
  const [open, setOpen] = useState(true);
  return (
    <ShareArtworkModal
      artworkId="storybook-artwork"
      artworkTitle="Maya's Friendly Dragon"
      artworkImageUrl="/images/colo.svg"
      isOpen={open}
      onClose={() => setOpen(false)}
    />
  );
};

export const ShareArtworkOptions: Story = {
  name: 'Share artwork',
  render: () => (
    <Stage>
      <OpenShareArtwork />
    </Stage>
  ),
};

// ─── StickerDetailModal — unlocked + locked ───────────────────────────

const sampleSticker = STICKER_CATALOG[0];

export const StickerDetailUnlocked: Story = {
  name: 'Sticker detail — unlocked',
  render: () => (
    <Stage>
      <StickerDetailModal
        sticker={sampleSticker}
        isUnlocked
        unlockedAt={new Date('2026-05-01')}
        isOpen
        onClose={() => undefined}
      />
    </Stage>
  ),
};

export const StickerDetailLocked: Story = {
  name: 'Sticker detail — locked',
  render: () => (
    <Stage>
      <StickerDetailModal
        sticker={sampleSticker}
        isUnlocked={false}
        isOpen
        onClose={() => undefined}
      />
    </Stage>
  ),
};

// ─── MagicColorOverlay (coloring-ui — modal-shaped canvas overlay) ─────

const ColoringCanvasShell = ({ children }: { children: React.ReactNode }) => (
  <div className="relative mx-auto h-[420px] w-full max-w-2xl overflow-hidden rounded-coloring-card border-2 border-paper-cream-dark bg-paper shadow-card">
    <div className="absolute inset-8 rounded-3xl border-2 border-paper-cream-dark bg-white" />
    {children}
  </div>
);

export const GettingColoursReady: Story = {
  name: 'Magic colours — loading',
  render: () => (
    <Stage>
      <ColoringCanvasShell>
        <MagicColorOverlay
          state="loading"
          phase="colorMap"
          messages={{
            loadingTitleColorMap: 'Getting the colours ready!',
            loadingBodyColorMapFallback:
              'Almost there - Colo is mixing a palette for this picture.',
          }}
        />
      </ColoringCanvasShell>
    </Stage>
  ),
};

export const MagicColoursError: Story = {
  name: 'Magic colours — error',
  render: () => (
    <Stage>
      <ColoringCanvasShell>
        <MagicColorOverlay
          state="error"
          errorMessage="Colo could not build the colour map this time."
          onRetry={() => undefined}
          messages={{
            errorTitle: 'Oops, the magic got tangled!',
          }}
        />
      </ColoringCanvasShell>
    </Stage>
  ),
};

// ─── AutoColorModal (coloring-ui — full-page auto-color overlay) ──────
// Driven by the coloring context's `isAutoColoring` flag; the story
// flips it true on mount so the overlay shows.

const OpenAutoColorModal = () => {
  const { setIsAutoColoring } = useColoringContext();
  useEffect(() => {
    setIsAutoColoring(true);
    return () => setIsAutoColoring(false);
  }, [setIsAutoColoring]);
  return <AutoColorModal />;
};

export const AutoColorOpen: Story = {
  name: 'Auto-color overlay',
  render: () => (
    <Stage>
      <OpenAutoColorModal />
    </Stage>
  ),
};

// ─── Launcher overview ────────────────────────────────────────────────

export const ModalLauncherGrid: Story = {
  name: 'Launcher grid',
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

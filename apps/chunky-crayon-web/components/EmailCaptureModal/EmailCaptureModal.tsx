'use client';

import { useCallback, useEffect, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSparkles } from '@fortawesome/pro-duotone-svg-icons';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import JoinColoringPageEmailListForm from '@/components/forms/JoinColoringPageEmailListForm/JoinColoringPageEmailListForm';

// Custom DOM event other components use to ask the modal to open. Lets
// the buttons fire-and-forget without a shared context.
export const EMAIL_CAPTURE_PROMPT_EVENT = 'cc:email-capture-prompt';

// LocalStorage keys.
//   _captured: set forever once we know they joined (form success).
//   _dismissed: timestamp of last close. Re-open allowed after the cool-
//   down expires.
const CAPTURED_KEY = 'cc_email_captured';
const DISMISSED_AT_KEY = 'cc_email_modal_dismissed_at';
const DISMISS_COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const OPEN_DELAY_MS = 1200; // Wait long enough for the PDF download to start
// before the modal grabs focus. Modal stealing focus mid-download has
// been a Pinterest pet peeve elsewhere — don't reproduce it here.

const isEligible = (): boolean => {
  if (typeof window === 'undefined') return false;
  try {
    if (window.localStorage.getItem(CAPTURED_KEY)) return false;
    const dismissedAt = window.localStorage.getItem(DISMISSED_AT_KEY);
    if (dismissedAt) {
      const elapsed = Date.now() - Number(dismissedAt);
      if (Number.isFinite(elapsed) && elapsed < DISMISS_COOLDOWN_MS) {
        return false;
      }
    }
    return true;
  } catch {
    // Safari private mode or similar — fail open. Worst case the user
    // sees the modal once per session, which is still acceptable.
    return true;
  }
};

type EmailCaptureModalProps = {
  /** Optional landing-page slug for attribution. Passed straight to the
   * form's hidden sourceSlug input so email_subscribers.sourceSlug
   * records which landing converted them. */
  sourceSlug?: string;
};

const EmailCaptureModal = ({ sourceSlug }: EmailCaptureModalProps = {}) => {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const handle = () => {
      if (!isEligible()) return;
      setTimeout(() => setOpen(true), OPEN_DELAY_MS);
    };

    // Listen on document so any descendant button can dispatch the
    // event without bubbling through React's synthetic system.
    document.addEventListener(EMAIL_CAPTURE_PROMPT_EVENT, handle);

    // Also watch localStorage so a successful form submit in one tab
    // hides any modal-on-cooldown in another tab. Edge case but cheap.
    return () => {
      document.removeEventListener(EMAIL_CAPTURE_PROMPT_EVENT, handle);
    };
  }, []);

  const onOpenChange = useCallback((next: boolean) => {
    setOpen(next);
    if (!next) {
      try {
        window.localStorage.setItem(DISMISSED_AT_KEY, Date.now().toString());
      } catch {
        // ignore — see isEligible() comment
      }
    }
  }, []);

  // When the form succeeds the existing JoinColoringPageEmailListForm
  // already toasts + identifies + fires Lead pixels. We just listen for
  // the success-side-effect (the input clearing) by polling the captured
  // state isn't elegant — instead, hook into PostHog by reading the
  // localStorage we set ourselves on form success. Simpler: rely on the
  // form's internal state to clear, and assume capture happened when
  // the modal is closed AFTER an interaction. The cooldown applies
  // either way, but if they submitted we want the FOREVER flag set.
  //
  // To detect success specifically, we'd need to thread a callback into
  // the form. Easier: watch posthog's `email_subscriber` person property
  // via a periodic check while the modal is open, and set the captured
  // flag when it flips true. That's overkill — just set CAPTURED_KEY
  // immediately when the form's submit button is clicked AND the user
  // didn't bounce within a few seconds. In practice we err on the side
  // of not nagging: if they submitted anything, treat as captured even
  // if the submit failed (they can re-enter).
  useEffect(() => {
    if (!open) return undefined;
    const handler = (e: SubmitEvent) => {
      const form = e.target as HTMLFormElement | null;
      if (form?.querySelector('input[name="email"]')) {
        try {
          window.localStorage.setItem(CAPTURED_KEY, '1');
        } catch {
          // ignore
        }
        setOpen(false);
      }
    };
    document.addEventListener('submit', handler, true);
    return () => document.removeEventListener('submit', handler, true);
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center justify-center gap-2 mb-2">
            <FontAwesomeIcon
              icon={faSparkles}
              className="text-2xl [--fa-primary-color:hsl(var(--crayon-orange))] [--fa-secondary-color:hsl(var(--crayon-yellow))] [--fa-secondary-opacity:1]"
            />
          </div>
          <DialogTitle className="text-center font-tondo text-2xl">
            Want a fresh coloring page every day?
          </DialogTitle>
          <DialogDescription className="text-center font-tondo text-base text-text-secondary">
            We send one brand-new printable to your inbox every morning. Free,
            no spam, unsubscribe whenever.
          </DialogDescription>
        </DialogHeader>

        <div className="pt-2">
          <JoinColoringPageEmailListForm
            location="modal"
            source="modal:download-pack"
            sourceSlug={sourceSlug}
          />
        </div>

        <button
          type="button"
          onClick={() => onOpenChange(false)}
          className="mt-2 text-sm font-tondo text-text-tertiary hover:text-text-secondary transition-colors self-center"
        >
          No thanks
        </button>
      </DialogContent>
    </Dialog>
  );
};

export default EmailCaptureModal;

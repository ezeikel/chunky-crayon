'use client';

import { useState, useTransition } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faCopy,
  faCheck,
  faPaperPlane,
} from '@fortawesome/pro-duotone-svg-icons';
import { toast } from 'sonner';
import { markCommentRequestDmSent } from '@/app/actions/admin-comment-requests';

type Props = {
  queueRowId: string;
  /** Pre-formatted DM body the admin copies + pastes into the IG DM. */
  message: string;
  /** @username to DM — shown so the operator knows who to send to. */
  recipient: string;
};

/**
 * Manual DM bridge while `instagram_business_manage_messages` is pending
 * Meta App Review. Shows the exact message + a copy button, and a
 * "Mark as DM'd" button to move the row to its terminal state once the
 * operator has pasted + sent the DM in Instagram.
 *
 * This is also the screencast surface for App Review: it demonstrates the
 * full pipeline (comment detected → page generated → DM composed for the
 * commenter who initiated contact) with only the literal send being
 * manual until the permission is granted.
 */
const DmComposer = ({ queueRowId, message, recipient }: Props) => {
  const [copied, setCopied] = useState(false);
  const [done, setDone] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message);
      setCopied(true);
      toast.success(`DM copied — paste to @${recipient} on Instagram`);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      toast.error('Clipboard blocked — select the text and copy manually');
    }
  };

  const handleMarkSent = () => {
    startTransition(async () => {
      const result = await markCommentRequestDmSent(queueRowId);
      if ('error' in result) {
        toast.error(result.error);
      } else {
        setDone(true);
        toast.success('Marked as DM sent');
      }
    });
  };

  if (done) {
    return (
      <span className="text-xs text-green-700">
        <FontAwesomeIcon icon={faCheck} className="mr-1" />
        DM sent
      </span>
    );
  }

  return (
    <div className="flex flex-col gap-2 max-w-xs">
      <div className="rounded border border-gray-200 bg-gray-50 p-2 text-xs text-gray-700 whitespace-pre-wrap break-words">
        {message}
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={handleCopy}
          className="inline-flex items-center gap-1 rounded bg-crayon-orange px-2 py-1 text-xs font-medium text-white"
        >
          <FontAwesomeIcon icon={copied ? faCheck : faCopy} />
          {copied ? 'Copied' : 'Copy DM'}
        </button>
        <button
          type="button"
          onClick={handleMarkSent}
          disabled={isPending}
          className="inline-flex items-center gap-1 rounded border border-gray-300 px-2 py-1 text-xs font-medium text-gray-700 disabled:opacity-50"
        >
          <FontAwesomeIcon icon={faPaperPlane} />
          {isPending ? 'Saving…' : "Mark DM'd"}
        </button>
      </div>
    </div>
  );
};

export default DmComposer;

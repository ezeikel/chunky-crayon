'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faRotate,
  faTrash,
  faPenToSquare,
  faCheck,
  faXmark,
} from '@fortawesome/pro-duotone-svg-icons';
import { Input } from '@/components/ui/input';
import {
  deleteAdImage,
  regenerateAdAssets,
  updateAdImageCampaignKey,
} from '@/app/actions/admin-ads';

type AdControlsProps = {
  id: string;
  campaignKey: string;
};

const AdControls = ({ id, campaignKey }: AdControlsProps) => {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [editing, setEditing] = useState(false);
  const [draftKey, setDraftKey] = useState(campaignKey);

  const handleSaveKey = () => {
    if (draftKey === campaignKey) {
      setEditing(false);
      return;
    }
    startTransition(async () => {
      const res = await updateAdImageCampaignKey(id, draftKey);
      if (res.ok) {
        toast.success(`Renamed to ad:${draftKey}`);
        setEditing(false);
        router.refresh();
      } else {
        toast.error(res.error || 'Failed to rename');
      }
    });
  };

  const handleRegenerate = () => {
    startTransition(async () => {
      const res = await regenerateAdAssets(id);
      if (res.ok) {
        toast.success('Worker pipeline triggered — assets regenerating.');
        router.refresh();
      } else {
        toast.error(res.error || 'Failed to regenerate');
      }
    });
  };

  // Native confirm() is the simplest gate here — these admin pages are
  // internal-only so we don't need a custom modal. If/when the admin UI
  // grows a shared confirm-dialog component, swap this in.
  const handleDelete = () => {
    if (
      !window.confirm(
        `Delete ad:${campaignKey}? This cannot be undone. R2 assets are kept (orphaned).`,
      )
    ) {
      return;
    }
    startTransition(async () => {
      const res = await deleteAdImage(id);
      if (res.ok) {
        toast.success('Ad deleted');
        router.push('/admin/ads');
      } else {
        toast.error(res.error || 'Failed to delete');
      }
    });
  };

  return (
    <div className="flex flex-col gap-3">
      {/* Campaign key edit */}
      <div className="bg-white rounded-coloring-card border border-paper-cream-dark p-4">
        <p className="font-rooney-sans text-xs font-bold uppercase tracking-wider text-text-muted mb-2">
          Campaign key
        </p>
        {editing ? (
          <div className="flex items-center gap-2">
            <Input
              value={draftKey}
              onChange={(e) => setDraftKey(e.target.value)}
              className="font-mono text-sm"
              pattern="^[a-z0-9][a-z0-9-]*$"
            />
            <button
              type="button"
              onClick={handleSaveKey}
              disabled={isPending}
              className="p-2 rounded-md bg-green-100 text-green-700 hover:bg-green-200 disabled:opacity-50"
              aria-label="Save"
            >
              <FontAwesomeIcon icon={faCheck} />
            </button>
            <button
              type="button"
              onClick={() => {
                setDraftKey(campaignKey);
                setEditing(false);
              }}
              disabled={isPending}
              className="p-2 rounded-md bg-paper-cream text-text-secondary hover:bg-paper-cream-dark"
              aria-label="Cancel"
            >
              <FontAwesomeIcon icon={faXmark} />
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-2">
            <code className="font-mono text-sm">ad:{campaignKey}</code>
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="text-text-secondary hover:text-crayon-orange"
              aria-label="Edit campaign key"
            >
              <FontAwesomeIcon icon={faPenToSquare} />
            </button>
          </div>
        )}
      </div>

      {/* Actions */}
      <button
        type="button"
        onClick={handleRegenerate}
        disabled={isPending}
        className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-coloring-card bg-white border border-paper-cream-dark hover:border-crayon-orange font-rooney-sans font-bold text-sm transition-colors disabled:opacity-50"
      >
        <FontAwesomeIcon icon={faRotate} />
        Regenerate derived assets
      </button>

      <button
        type="button"
        onClick={handleDelete}
        disabled={isPending}
        className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-coloring-card bg-red-50 border border-red-200 text-red-700 hover:bg-red-100 font-rooney-sans font-bold text-sm transition-colors disabled:opacity-50"
      >
        <FontAwesomeIcon icon={faTrash} />
        Delete ad
      </button>
    </div>
  );
};

export default AdControls;

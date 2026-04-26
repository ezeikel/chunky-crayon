'use client';

import { useActionState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faWandMagicSparkles } from '@fortawesome/pro-duotone-svg-icons';
import { Input } from '@/components/ui/input';
import {
  createAdImage,
  type CreateAdImageState,
} from '@/app/actions/admin-ads';

const initialState: CreateAdImageState = { ok: false };

const CreateAdForm = () => {
  const router = useRouter();
  const [state, formAction, isPending] = useActionState(
    createAdImage,
    initialState,
  );

  useEffect(() => {
    if (state.ok && state.imageId) {
      toast.success('Ad created — derived assets generating in background.');
      router.push('/admin/ads');
    } else if (state.error) {
      toast.error(state.error);
    }
  }, [state, router]);

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <div>
        <label
          htmlFor="campaignKey"
          className="block font-rooney-sans text-sm font-bold mb-1.5"
        >
          Campaign key
        </label>
        <Input
          id="campaignKey"
          name="campaignKey"
          required
          placeholder="trex, dragon, summer-2026"
          className="font-mono"
          pattern="^[a-z0-9][a-z0-9-]*$"
          title="Lowercase letters, numbers, hyphens. Must start with letter or number."
        />
        <p className="font-rooney-sans text-xs text-text-muted mt-1.5">
          Stored as <code>ad:&lt;key&gt;</code>. Visitors arriving at{' '}
          <code>/start?utm_campaign=&lt;key&gt;</code> will see this image.
        </p>
      </div>

      <div>
        <label
          htmlFor="description"
          className="block font-rooney-sans text-sm font-bold mb-1.5"
        >
          Description (AI prompt)
        </label>
        <textarea
          id="description"
          name="description"
          required
          rows={4}
          placeholder="A friendly t-rex roaring next to a volcano with palm trees"
          className="w-full px-3 py-2 rounded-md border border-paper-cream-dark font-rooney-sans text-sm focus:outline-none focus:ring-2 focus:ring-crayon-orange"
        />
        <p className="font-rooney-sans text-xs text-text-muted mt-1.5">
          The AI will generate a coloring page from this description.
        </p>
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-coloring-card bg-crayon-orange text-white font-tondo font-bold shadow-sm hover:shadow-md transition-shadow disabled:opacity-60 disabled:cursor-not-allowed"
      >
        <FontAwesomeIcon icon={faWandMagicSparkles} />
        {isPending ? 'Generating… (~30–60s)' : 'Create ad'}
      </button>
    </form>
  );
};

export default CreateAdForm;

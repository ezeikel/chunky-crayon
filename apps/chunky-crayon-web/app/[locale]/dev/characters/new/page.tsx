import { Suspense } from 'react';
import { connection } from 'next/server';
import { requireAdmin } from '@/lib/auth-guards';
import { issueParentGateToken } from '@/app/actions/parent-gate';
import NewCharacterDevForm from './NewCharacterDevForm';

/**
 * Dev-only "create a character" form. Bypasses the production parent-gate
 * subtraction-question UX — we mint the gate token server-side here so the
 * Phase 2 worker pipeline can be exercised end-to-end without waiting for
 * Phase 3's UI to ship.
 *
 * Access: localhost bypasses; production requires admin role.
 */
const NewCharacterDevContent = async () => {
  await connection();

  if (process.env.NODE_ENV !== 'development') {
    await requireAdmin();
  }

  // Pre-mint a parent gate token bound to character:create scope. This works
  // because issueParentGateToken is HMAC-signed against the current user
  // (i.e. the dev admin) — we're effectively the parent in this flow.
  const tokenResult = await issueParentGateToken('character:create');
  if (!tokenResult.ok) {
    return (
      <div className="p-8 font-mono text-sm">
        Token mint failed: {tokenResult.error}
      </div>
    );
  }

  return (
    <div className="p-8 font-mono text-sm max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-2">New character (dev)</h1>
      <p className="text-xs text-neutral-500 mb-6">
        Parent gate bypassed for dev. Submit fires the production
        createCharacter action — moderation, trait extraction, worker dispatch,
        all real.
      </p>

      <NewCharacterDevForm parentGateToken={tokenResult.token} />
    </div>
  );
};

const NewCharacterDevPage = () => (
  <Suspense fallback={<div className="p-8 font-mono text-sm">Loading…</div>}>
    <NewCharacterDevContent />
  </Suspense>
);

export default NewCharacterDevPage;

import { Suspense } from 'react';
import { connection } from 'next/server';
import { requireAdmin } from '@/lib/auth-guards';
import NewCharacterDevForm from './NewCharacterDevForm';

/**
 * Dev-only "create a character" form. Submits the production
 * createCharacter action directly — moderation, trait extraction, worker
 * dispatch, all real. No parent gate (production flow doesn't have one
 * either since the gate was dropped from create).
 *
 * Access: localhost bypasses; production requires admin role.
 */
const NewCharacterDevContent = async () => {
  await connection();

  if (process.env.NODE_ENV !== 'development') {
    await requireAdmin();
  }

  return (
    <div className="p-8 font-mono text-sm max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-2">New character (dev)</h1>
      <p className="text-xs text-neutral-500 mb-6">
        Submit fires the production createCharacter action — moderation, trait
        extraction, worker dispatch, all real.
      </p>

      <NewCharacterDevForm />
    </div>
  );
};

const NewCharacterDevPage = () => (
  <Suspense fallback={<div className="p-8 font-mono text-sm">Loading…</div>}>
    <NewCharacterDevContent />
  </Suspense>
);

export default NewCharacterDevPage;

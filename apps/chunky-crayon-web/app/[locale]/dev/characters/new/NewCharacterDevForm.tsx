'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { createCharacter } from '@/app/actions/characters';

const NewCharacterDevForm = () => {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [name, setName] = useState('Rex');
  const [shortPrompt, setShortPrompt] = useState(
    'small purple dragon with small triangular horns, a yellow scarf around the neck, and chubby cheeks. Loves biscuits.',
  );
  const [error, setError] = useState<string | null>(null);

  const onSubmit = () => {
    setError(null);
    startTransition(async () => {
      const result = await createCharacter({
        name,
        shortPrompt,
      });
      if (result.ok) {
        router.push(`/en/dev/characters/${result.characterId}`);
      } else {
        setError(
          `${result.error}${result.message ? ': ' + result.message : ''}`,
        );
      }
    });
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
      className="space-y-4"
    >
      <label className="block">
        <span className="block text-xs uppercase text-neutral-500 mb-1">
          Name (1-24 chars)
        </span>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={24}
          className="w-full rounded-xl border-2 border-neutral-300 px-3 py-2 text-sm"
        />
      </label>
      <label className="block">
        <span className="block text-xs uppercase text-neutral-500 mb-1">
          Short prompt (≤ 240 chars)
        </span>
        <textarea
          value={shortPrompt}
          onChange={(e) => setShortPrompt(e.target.value)}
          maxLength={240}
          rows={4}
          className="w-full rounded-xl border-2 border-neutral-300 px-3 py-2 text-sm"
        />
        <span className="block text-[10px] text-neutral-400 mt-1">
          {shortPrompt.length}/240
        </span>
      </label>

      {error ? (
        <div className="rounded-xl border-2 border-red-200 bg-red-50 p-3 text-xs text-red-800">
          {error}
        </div>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="rounded-xl bg-black text-white px-5 py-3 text-sm disabled:opacity-50"
      >
        {pending ? 'Creating…' : 'Create character'}
      </button>
    </form>
  );
};

export default NewCharacterDevForm;

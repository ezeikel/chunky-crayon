import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { connection } from 'next/server';
import { db } from '@one-colored-pixel/db';
import { BRAND } from '@/lib/db';
import { requireAdmin } from '@/lib/auth-guards';
import CharacterDevViewer from './CharacterDevViewer';

type PageProps = {
  params: Promise<{ id: string }>;
};

/**
 * Per-character debug viewer. Renders both portraits, the extracted traits +
 * signatureDetails, the stored portrait prompt, and a Regenerate button
 * that re-fires the worker against the same stored prompt.
 *
 * Access: localhost bypasses; production requires admin role.
 */
const CharacterDevContent = async ({ params }: PageProps) => {
  await connection();

  if (process.env.NODE_ENV !== 'development') {
    await requireAdmin();
  }

  const { id } = await params;

  const character = await db.character.findFirst({
    where: { id, brand: BRAND },
    select: {
      id: true,
      name: true,
      species: true,
      shortPrompt: true,
      traits: true,
      signatureDetails: true,
      referenceSheetPrompt: true,
      portraitUrl: true,
      portraitLineArtUrl: true,
      status: true,
      failureReason: true,
      voicePersona: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!character) {
    notFound();
  }

  return (
    <div className="p-8 font-mono text-sm max-w-5xl mx-auto">
      <Link
        href="/en/dev/characters"
        className="text-xs underline text-neutral-600"
      >
        ← All characters
      </Link>
      <h1 className="text-2xl font-bold mt-2 mb-1">{character.name}</h1>
      <p className="text-neutral-500 text-xs mb-6">
        {character.species} · {character.status} ·{' '}
        {new Date(character.createdAt).toISOString()}
      </p>

      <CharacterDevViewer
        id={character.id}
        name={character.name}
        species={character.species}
        shortPrompt={character.shortPrompt}
        traits={character.traits}
        signatureDetails={character.signatureDetails}
        referenceSheetPrompt={character.referenceSheetPrompt}
        portraitUrl={character.portraitUrl}
        portraitLineArtUrl={character.portraitLineArtUrl}
        status={character.status}
        failureReason={character.failureReason}
        voicePersona={character.voicePersona}
      />
    </div>
  );
};

const CharacterDevPage = ({ params }: PageProps) => (
  <Suspense fallback={<div className="p-8 font-mono text-sm">Loading…</div>}>
    <CharacterDevContent params={params} />
  </Suspense>
);

export default CharacterDevPage;

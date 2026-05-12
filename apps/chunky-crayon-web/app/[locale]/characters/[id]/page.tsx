import type { Metadata } from 'next';
import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import PageWrap from '@/components/PageWrap/PageWrap';
import { charactersFeatureEnabled } from '@/flags';
import { getCharacterForProfile } from '@/app/actions/characters';
import CharacterCockpit from '@/components/Characters/CharacterCockpit/CharacterCockpit';

/**
 * /characters/[id] — per-character profile page.
 *
 * Static-first PPR shell: page handler stays sync, the DB-touching
 * Cockpit content is wrapped in <Suspense>. Title is generic on the
 * static shell because the character's name is PII (memory rule: never
 * publicly indexed); the dynamic island fills in the real name + portrait.
 *
 * Render flow:
 *   1. Static shell prerenders.
 *   2. Feature flag + auth + ownership checked server-side inside Suspense.
 *   3. If everything's fine → render the Cockpit (client component) with
 *      the prefetched character payload.
 *
 * Failure modes are aggressive: any miss (flag off, not signed in, not
 * the owner, character doesn't exist) routes to notFound() — the URL
 * structure must NOT leak whether a character id exists.
 */

export const metadata: Metadata = {
  title: 'Your friend',
  description: 'Your character on Chunky Crayon.',
  // No portraits in OG (memory rule: never indexed).
  openGraph: { images: [] },
  robots: { index: false, follow: false },
};

type PageProps = {
  params: Promise<{ locale: string; id: string }>;
};

const ProfileContent = async ({ params }: PageProps) => {
  const enabled = await charactersFeatureEnabled();
  if (!enabled) notFound();

  const { id } = await params;
  const character = await getCharacterForProfile(id);
  if (!character) notFound();
  if (character.status !== 'READY') {
    // Render a soft "still being drawn" state rather than 404. Parents
    // who came back to the page after submitting the create modal should
    // see clear progress, not a broken page.
    return (
      <div className="text-center py-16">
        <h1 className="font-display text-3xl mb-3">
          {character.name} is on the way
        </h1>
        <p className="text-neutral-600 mb-6">
          Their portrait is being drawn. Come back in a moment.
        </p>
        <Link
          href="/characters"
          className="rounded-full bg-black text-white px-5 py-3 text-sm font-bold"
        >
          See all friends
        </Link>
      </div>
    );
  }

  return (
    <CharacterCockpit
      id={character.id}
      name={character.name}
      species={character.species}
      portraitLineArtUrl={character.portraitLineArtUrl}
      portraitUrl={character.portraitUrl}
      voicePersona={character.voicePersona}
      equippedOutfit={
        character.equippedOutfit
          ? {
              key: character.equippedOutfit.key,
              imageUrl: character.equippedOutfit.imageUrl,
            }
          : null
      }
      unlockedOutfits={character.outfits.map((o) => ({
        key: o.key,
        imageUrl: o.imageUrl,
      }))}
    />
  );
};

const CharacterProfileSkeleton = () => (
  <div className="space-y-6">
    <div className="mx-auto w-64 h-64 rounded-3xl bg-paper-cream-dark/30 animate-pulse" />
    <div className="h-8 w-48 mx-auto bg-paper-cream-dark/30 rounded-full animate-pulse" />
    <div className="flex justify-center gap-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <div
          // eslint-disable-next-line react/no-array-index-key
          key={i}
          className="w-28 h-12 rounded-full bg-paper-cream-dark/30 animate-pulse"
        />
      ))}
    </div>
  </div>
);

const CharacterProfilePage = ({ params }: PageProps) => (
  <PageWrap>
    <div className="max-w-3xl mx-auto">
      <div className="mb-4">
        <Link
          href="/characters"
          className="text-xs text-neutral-500 hover:text-black"
        >
          ← All friends
        </Link>
      </div>
      <Suspense fallback={<CharacterProfileSkeleton />}>
        <ProfileContent params={params} />
      </Suspense>
    </div>
  </PageWrap>
);

export default CharacterProfilePage;

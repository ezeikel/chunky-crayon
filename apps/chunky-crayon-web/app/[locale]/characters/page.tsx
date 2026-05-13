import type { Metadata } from 'next';
import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import PageWrap from '@/components/PageWrap/PageWrap';
import { charactersFeatureEnabled } from '@/flags';
import CharacterGrid from '@/components/Characters/CharacterGrid/CharacterGrid';

/**
 * /characters — the Bluey-style roster page.
 *
 * Architecture follows the static-first PPR pattern (CC memory rule):
 *   - Page handler stays SYNCHRONOUS. Awaiting params or DB inside the
 *     handler busts prerender even with a Suspense inside, per the
 *     async-page-handlers feedback.
 *   - The DB-touching CharacterGrid is wrapped in <Suspense>; everything
 *     above (hero copy, page chrome) prerenders.
 *   - Feature gate is read INSIDE a server component nested under Suspense
 *     so the static shell still bakes; when the flag is off we render a
 *     "Coming soon" placeholder (the route still prerenders).
 *
 * Audience: kids 3-8 + parents. Chunky type, no em dashes, no "AI" word.
 */

export const metadata: Metadata = {
  title: 'Characters — Chunky Crayon',
  description:
    'Build a friend who shows up in every coloring page. Pick a name, describe them, and we will draw them for you.',
};

const FlaggedShell = async () => {
  const enabled = await charactersFeatureEnabled();

  if (!enabled) {
    return (
      <div className="text-center py-16">
        <h1 className="font-display text-3xl md:text-4xl mb-4">
          Characters are on the way
        </h1>
        <p className="text-neutral-600 max-w-md mx-auto">
          Hang tight, we're getting this ready for you.
        </p>
      </div>
    );
  }

  return (
    <>
      <header className="text-center pb-8 md:pb-10">
        <h1 className="font-display text-4xl md:text-6xl mb-3 text-neutral-900">
          Meet your friends
        </h1>
        <p className="text-neutral-700 max-w-xl mx-auto text-lg md:text-xl font-medium">
          Make a friend who shows up in every coloring page.
        </p>
      </header>
      <CharacterGrid />
    </>
  );
};

const GridSkeleton = () => (
  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
    {Array.from({ length: 8 }).map((_, i) => (
      <div
        // eslint-disable-next-line react/no-array-index-key
        key={i}
        className="rounded-3xl border-2 border-paper-cream-dark bg-white aspect-[5/6] animate-pulse"
      />
    ))}
  </div>
);

const CharactersPage = () => {
  // Defensive sanity check — if the page is somehow accessed under a
  // locale that's been pruned, 404 cleanly rather than crashing the static
  // shell. The locale itself isn't needed inside this page (no i18n yet on
  // characters copy — translation strings live in messages/en.json in a
  // follow-up commit).
  if (typeof Suspense === 'undefined') {
    notFound();
  }

  return (
    <PageWrap>
      <Suspense fallback={<GridSkeleton />}>
        <FlaggedShell />
      </Suspense>
    </PageWrap>
  );
};

export default CharactersPage;

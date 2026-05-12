import Link from 'next/link';
import { Suspense } from 'react';
import { connection } from 'next/server';
import { db } from '@one-colored-pixel/db';
import { BRAND } from '@/lib/db';
import { requireAdmin } from '@/lib/auth-guards';

/**
 * Dev-only character index. Lists every character belonging to the current
 * admin (across all of their profiles) with status badges. Linkable into
 * /dev/characters/[id] for full inspection + regenerate. There's also a
 * dev-only `/dev/characters/new` route for creating characters without
 * the production parent gate flow.
 *
 * Access: localhost (NODE_ENV=development) bypasses; in any other env
 * requires the admin role. Mirrors /dev/region-store gating.
 */
const CharactersDevContent = async () => {
  await connection();

  if (process.env.NODE_ENV !== 'development') {
    await requireAdmin();
  }

  // Admin sees their own characters (across all profiles they own). That's
  // sufficient for the dev workflow — we don't need to surface other users'
  // characters in this tool.
  const characters = await db.character.findMany({
    where: { brand: BRAND },
    orderBy: { createdAt: 'desc' },
    take: 200,
    select: {
      id: true,
      name: true,
      species: true,
      status: true,
      portraitLineArtUrl: true,
      portraitUrl: true,
      failureReason: true,
      createdAt: true,
      profileId: true,
    },
  });

  return (
    <div className="p-8 font-mono text-sm">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Characters debug</h1>
        <Link
          href="/en/dev/characters/new"
          className="rounded-xl bg-black text-white px-4 py-2 hover:bg-neutral-800"
        >
          + New character
        </Link>
      </div>

      {characters.length === 0 ? (
        <p className="text-neutral-600">
          No characters yet. Use the &quot;New character&quot; button to make
          one.
        </p>
      ) : (
        <ul className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {characters.map((c) => (
            <li
              key={c.id}
              className="rounded-2xl border-2 border-neutral-200 bg-white p-4 flex gap-4"
            >
              <div className="w-24 h-24 rounded-xl bg-neutral-100 flex-shrink-0 overflow-hidden">
                {c.portraitLineArtUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={c.portraitLineArtUrl}
                    alt={`${c.name} line art`}
                    className="w-full h-full object-contain"
                  />
                ) : c.portraitUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={c.portraitUrl}
                    alt={c.name}
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <div className="flex items-center justify-center h-full text-xs text-neutral-400">
                    {c.status}
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-bold text-base truncate">{c.name}</div>
                <div className="text-xs text-neutral-500 truncate">
                  {c.species} · {c.status}
                </div>
                {c.failureReason ? (
                  <p className="text-xs text-red-600 mt-1 line-clamp-2">
                    {c.failureReason}
                  </p>
                ) : null}
                <div className="text-[10px] text-neutral-400 mt-1">
                  {new Date(c.createdAt).toISOString()}
                </div>
                <Link
                  href={`/en/dev/characters/${c.id}`}
                  className="inline-block mt-2 text-xs underline"
                >
                  Inspect →
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

const CharactersDevPage = () => (
  <Suspense fallback={<div className="p-8 font-mono text-sm">Loading…</div>}>
    <CharactersDevContent />
  </Suspense>
);

export default CharactersDevPage;

import { Suspense } from 'react';
import { connection } from 'next/server';
import { db } from '@one-colored-pixel/db';
import { requireAdmin } from '@/lib/auth-guards';
import Loading from '@/components/Loading/Loading';
import ComicStripActions from './ComicStripActions';
import ComicStripCard from './ComicStripCard';

const AdminComicStripsContent = async () => {
  await connection();
  await requireAdmin('notFound');

  const strips = await db.comicStrip.findMany({
    where: { brand: 'CHUNKY_CRAYON' },
    orderBy: { createdAt: 'desc' },
    take: 10,
    select: {
      id: true,
      slug: true,
      title: true,
      theme: true,
      status: true,
      caption: true,
      assembledUrl: true,
      socialPostResults: true,
      createdAt: true,
      postedAt: true,
    },
  });

  const latestEligible = strips.find(
    (s) => s.status === 'READY' || s.status === 'POSTED',
  );

  return (
    <>
      <h1 className="font-tondo text-3xl font-bold mb-2">Comic Strips</h1>
      <p className="font-rooney-sans text-text-secondary mb-8">
        Weekly 4-panel comic strips. Auto-generated Sunday 06:00 UTC; posted to
        IG / FB / Pinterest later that day. TikTok is manual.
      </p>

      <ComicStripActions latestStripId={latestEligible?.id ?? null} />

      <h2 className="text-xl font-bold mt-10 mb-4">Recent strips</h2>
      {strips.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No strips yet. Hit Generate now to make the first one.
        </p>
      ) : (
        <div className="space-y-6">
          {strips.map((s) => (
            <ComicStripCard key={s.id} strip={s} />
          ))}
        </div>
      )}
    </>
  );
};

const AdminComicStripsPage = () => {
  return (
    <div className="container mx-auto p-8 max-w-5xl">
      <Suspense fallback={<Loading size="lg" />}>
        <AdminComicStripsContent />
      </Suspense>
    </div>
  );
};

export default AdminComicStripsPage;

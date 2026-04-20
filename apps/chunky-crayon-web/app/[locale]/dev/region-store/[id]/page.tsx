import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { connection } from 'next/server';
import { db } from '@one-colored-pixel/db';
import { BRAND } from '@/lib/db';
import type { RegionStoreJson } from '@one-colored-pixel/coloring-core';
import { auth } from '@/auth';
import { ADMIN_EMAILS } from '@/constants';
import RegionStoreViewer from './RegionStoreViewer';

type PageProps = {
  params: Promise<{ id: string }>;
};

/**
 * Region store debug visualiser.
 *
 * Renders a coloring image's raster region map with per-region palette
 * colours and hover-for-label. Used to validate the region store pipeline
 * and inspect per-image region quality.
 *
 * Access: localhost (NODE_ENV=development) OR authenticated admin user in prod.
 */
const RegionStoreDebugContent = async ({ params }: PageProps) => {
  // Opt into dynamic rendering — auth() + DB read are per-request, and we
  // want a fresh read that bypasses the getColoringImageBase cache (which
  // doesn't select the new region store columns yet).
  // Must come BEFORE auth() so Cache Components knows this page is dynamic.
  await connection();

  const session = await auth();
  const isAdmin =
    !!session?.user?.email && ADMIN_EMAILS.includes(session.user.email);
  const isDev = process.env.NODE_ENV === 'development';

  if (!isDev && !isAdmin) {
    notFound();
  }

  const { id } = await params;

  // Direct DB query — bypasses getColoringImageBase because that cache layer
  // doesn't select the new region store columns yet (will be wired in PR 4).
  const image = await db.coloringImage.findFirst({
    where: { id, brand: BRAND },
    select: {
      id: true,
      title: true,
      svgUrl: true,
      regionMapUrl: true,
      regionMapWidth: true,
      regionMapHeight: true,
      regionsJson: true,
      regionsGeneratedAt: true,
    },
  });

  if (!image) {
    notFound();
  }

  if (
    !image.regionMapUrl ||
    !image.regionsJson ||
    !image.regionMapWidth ||
    !image.regionMapHeight ||
    !image.svgUrl
  ) {
    return (
      <div className="p-8 font-mono text-sm">
        <h1 className="text-xl font-bold mb-4">Region Store Debug</h1>
        <p className="text-red-600">
          This image does not have a region store yet.
        </p>
        <ul className="mt-4 space-y-1">
          <li>id: {image.id}</li>
          <li>title: {image.title}</li>
          <li>svgUrl: {image.svgUrl ?? 'null'}</li>
          <li>regionMapUrl: {image.regionMapUrl ?? 'null'}</li>
          <li>
            regionMapDims:{' '}
            {image.regionMapWidth && image.regionMapHeight
              ? `${image.regionMapWidth}×${image.regionMapHeight}`
              : 'null'}
          </li>
          <li>regionsJson: {image.regionsJson ? 'present' : 'null'}</li>
          <li>
            regionsGeneratedAt:{' '}
            {image.regionsGeneratedAt?.toISOString() ?? 'null'}
          </li>
        </ul>
        <p className="mt-4 text-neutral-600">
          Run generation against this image (or use the backfill script once PR
          3 ships) to populate the region store.
        </p>
      </div>
    );
  }

  // Parse regionsJson here on the server so any parse errors surface early
  const regionsJson = JSON.parse(image.regionsJson) as RegionStoreJson;

  return (
    <RegionStoreViewer
      id={image.id}
      title={image.title}
      svgUrl={image.svgUrl}
      regionMapUrl={image.regionMapUrl}
      regionMapWidth={image.regionMapWidth}
      regionMapHeight={image.regionMapHeight}
      regionsJson={regionsJson}
    />
  );
};

const RegionStoreDebugPage = ({ params }: PageProps) => (
  <Suspense fallback={<div className="p-8 font-mono text-sm">Loading…</div>}>
    <RegionStoreDebugContent params={params} />
  </Suspense>
);

export default RegionStoreDebugPage;

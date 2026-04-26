import { Suspense } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { connection } from 'next/server';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus } from '@fortawesome/pro-duotone-svg-icons';
import { db } from '@one-colored-pixel/db';
import { BRAND } from '@/lib/db';
import {
  AD_PURPOSE_PREFIX,
  getAdCampaignKey,
} from '@/lib/coloring-image-purpose';
import { requireAdmin } from '@/lib/auth-guards';
import Loading from '@/components/Loading/Loading';

const AdsListContent = async () => {
  // Cache Components: opt into dynamic render before auth() runs.
  await connection();
  await requireAdmin('notFound');

  const ads = await db.coloringImage.findMany({
    where: {
      brand: BRAND,
      purposeKey: { startsWith: AD_PURPOSE_PREFIX },
    },
    select: {
      id: true,
      title: true,
      url: true,
      purposeKey: true,
      regionMapUrl: true,
      qrCodeUrl: true,
      backgroundMusicUrl: true,
      coloredReferenceUrl: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  return (
    <>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-tondo text-3xl font-bold mb-1">Ads</h1>
          <p className="font-rooney-sans text-text-secondary">
            Coloring images served at <code>/start?utm_campaign=…</code>.
          </p>
        </div>
        <Link
          href="/admin/ads/new"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-coloring-card bg-crayon-orange text-white font-rooney-sans font-bold text-sm shadow-sm hover:shadow-md transition-shadow"
        >
          <FontAwesomeIcon icon={faPlus} />
          New ad
        </Link>
      </div>

      {ads.length === 0 ? (
        <div className="p-8 text-center bg-white rounded-coloring-card border border-paper-cream-dark">
          <p className="font-rooney-sans text-text-secondary">
            No ad images yet — click <strong>New ad</strong> to create one.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {ads.map((ad) => {
            const campaignKey = getAdCampaignKey(ad);
            const assetStates: Array<{ label: string; ready: boolean }> = [
              { label: 'Region', ready: !!ad.regionMapUrl },
              { label: 'QR', ready: !!ad.qrCodeUrl },
              { label: 'Music', ready: !!ad.backgroundMusicUrl },
              { label: 'Colored ref', ready: !!ad.coloredReferenceUrl },
            ];
            return (
              <Link
                key={ad.id}
                href={`/admin/ads/${ad.id}`}
                className="bg-white rounded-coloring-card border border-paper-cream-dark overflow-hidden flex flex-col hover:border-crayon-orange hover:shadow-md transition-all"
              >
                <div className="relative aspect-square bg-paper-cream">
                  {ad.url ? (
                    <Image
                      src={ad.url}
                      alt={ad.title || ad.id}
                      fill
                      sizes="(max-width: 768px) 100vw, 33vw"
                      className="object-contain p-2"
                    />
                  ) : null}
                </div>
                <div className="p-4 flex-1 flex flex-col gap-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-tondo font-bold text-sm truncate">
                      {ad.title || ad.id}
                    </span>
                    <span className="font-rooney-sans text-xs px-2 py-0.5 rounded-full bg-crayon-orange/10 text-crayon-orange whitespace-nowrap">
                      {campaignKey}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {assetStates.map(({ label, ready }) => (
                      <span
                        key={label}
                        className={`font-rooney-sans text-[10px] px-1.5 py-0.5 rounded-full ${
                          ready
                            ? 'bg-green-100 text-green-700'
                            : 'bg-amber-100 text-amber-700'
                        }`}
                      >
                        {ready ? '✓' : '…'} {label}
                      </span>
                    ))}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </>
  );
};

const AdminAdsPage = () => (
  <Suspense fallback={<Loading size="lg" />}>
    <AdsListContent />
  </Suspense>
);

export default AdminAdsPage;

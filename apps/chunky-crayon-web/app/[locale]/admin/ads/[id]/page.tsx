import { Suspense } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { connection } from 'next/server';
import { notFound } from 'next/navigation';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowLeft } from '@fortawesome/pro-duotone-svg-icons';
import { db } from '@one-colored-pixel/db';
import {
  AD_PURPOSE_PREFIX,
  getAdCampaignKey,
} from '@/lib/coloring-image-purpose';
import Loading from '@/components/Loading/Loading';
import AdControls from '../_components/AdControls';
import AdPreviewFrame from '../_components/AdPreviewFrame';

type Params = Promise<{ id: string }>;

const AdDetailContent = async ({ id }: { id: string }) => {
  // Cache Components: opt into dynamic before DB read.
  // Admin gate is in /admin/layout.tsx.
  await connection();

  const ad = await db.coloringImage.findUnique({
    where: { id },
    select: {
      id: true,
      title: true,
      description: true,
      url: true,
      svgUrl: true,
      qrCodeUrl: true,
      regionMapUrl: true,
      coloredReferenceUrl: true,
      backgroundMusicUrl: true,
      purposeKey: true,
      createdAt: true,
    },
  });

  if (!ad || !ad.purposeKey?.startsWith(AD_PURPOSE_PREFIX)) {
    notFound();
  }

  const campaignKey = getAdCampaignKey(ad)!;
  const assetStates: Array<{ label: string; ready: boolean }> = [
    { label: 'Region store', ready: !!ad.regionMapUrl },
    { label: 'QR code', ready: !!ad.qrCodeUrl },
    { label: 'Background music', ready: !!ad.backgroundMusicUrl },
    { label: 'Colored reference', ready: !!ad.coloredReferenceUrl },
  ];

  return (
    <div className="max-w-5xl">
      <Link
        href="/admin/ads"
        className="inline-flex items-center gap-2 font-rooney-sans text-sm text-text-secondary hover:text-text-primary mb-6"
      >
        <FontAwesomeIcon icon={faArrowLeft} />
        Back to ads
      </Link>

      <div className="flex items-start justify-between gap-4 mb-8 flex-wrap">
        <div>
          <h1 className="font-tondo text-3xl font-bold mb-1">
            {ad.title || 'Untitled'}
          </h1>
          <p className="font-rooney-sans text-text-secondary">
            <code className="text-crayon-orange">ad:{campaignKey}</code>
            {' · '}
            <span className="text-text-muted text-sm">
              created {new Date(ad.createdAt).toLocaleDateString()}
            </span>
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        <div>
          <h2 className="font-tondo text-lg font-bold mb-3">Image</h2>
          <div className="relative aspect-square bg-white rounded-coloring-card border border-paper-cream-dark overflow-hidden">
            {ad.url ? (
              <Image
                src={ad.url}
                alt={ad.title || ad.id}
                fill
                sizes="(max-width: 1024px) 100vw, 50vw"
                className="object-contain p-4"
              />
            ) : null}
          </div>
          {ad.description ? (
            <p className="font-rooney-sans text-sm text-text-secondary mt-3 italic">
              {ad.description}
            </p>
          ) : null}
        </div>

        <div>
          <h2 className="font-tondo text-lg font-bold mb-3">Derived assets</h2>
          <div className="bg-white rounded-coloring-card border border-paper-cream-dark p-4 space-y-2 mb-6">
            {assetStates.map(({ label, ready }) => (
              <div
                key={label}
                className="flex items-center justify-between font-rooney-sans text-sm"
              >
                <span>{label}</span>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full ${
                    ready
                      ? 'bg-green-100 text-green-700'
                      : 'bg-amber-100 text-amber-700'
                  }`}
                >
                  {ready ? '✓ ready' : '… pending'}
                </span>
              </div>
            ))}
          </div>

          <AdControls id={ad.id} campaignKey={campaignKey} />
        </div>
      </div>

      <div>
        <h2 className="font-tondo text-lg font-bold mb-3">Preview on /start</h2>
        <AdPreviewFrame campaignKey={campaignKey} />
      </div>
    </div>
  );
};

const AdDetailPage = async ({ params }: { params: Params }) => {
  const { id } = await params;
  return (
    <Suspense fallback={<Loading size="lg" />}>
      <AdDetailContent id={id} />
    </Suspense>
  );
};

export default AdDetailPage;

import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { cacheLife } from 'next/cache';
import { campaignsById } from '@/lib/ads/campaigns';
import type { AdAsset } from '@/lib/ads/schema';
import AdHero from './AdHero';
import AdAppScreen from './AdAppScreen';
import AdBeforeAfter from './AdBeforeAfter';

async function loadAssets(): Promise<AdAsset[]> {
  'use cache';
  cacheLife('minutes');
  const path = resolve(process.cwd(), 'ad-assets.json');
  try {
    const raw = await readFile(path, 'utf8');
    return JSON.parse(raw) as AdAsset[];
  } catch {
    return [];
  }
}

function MissingAsset({
  campaignId,
  assetKey,
  found,
}: {
  campaignId: string;
  assetKey: string;
  found: string[];
}) {
  return (
    <div style={{ padding: 40, fontFamily: 'system-ui', color: '#333' }}>
      <h1>Asset missing for campaign “{campaignId}”</h1>
      <p>
        Needs asset key <code>{assetKey}</code>. Run{' '}
        <code>pnpm tsx scripts/generate-ad-assets.ts --only={assetKey}</code> to
        generate it.
      </p>
      <p>Currently generated: {found.join(', ') || 'none'}.</p>
    </div>
  );
}

async function AdRenderer({
  params,
}: {
  params: Promise<{ campaignId: string }>;
}) {
  if (process.env.NODE_ENV === 'production') notFound();

  const { campaignId } = await params;
  const campaign = campaignsById[campaignId];
  if (!campaign) notFound();

  const assets = await loadAssets();
  const asset = assets.find((a) => a.key === campaign.asset.key);

  if (!asset) {
    return (
      <MissingAsset
        campaignId={campaignId}
        assetKey={campaign.asset.key}
        found={assets.map((a) => a.key)}
      />
    );
  }

  if (campaign.template === 'hero') {
    return <AdHero campaign={campaign} asset={asset} />;
  }
  if (campaign.template === 'app-screen') {
    return <AdAppScreen campaign={campaign} asset={asset} />;
  }
  return <AdBeforeAfter campaign={campaign} asset={asset} />;
}

export default function AdCampaignPage({
  params,
}: {
  params: Promise<{ campaignId: string }>;
}) {
  return (
    <Suspense fallback={<div style={{ padding: 40 }}>Loading ad…</div>}>
      <AdRenderer params={params} />
    </Suspense>
  );
}

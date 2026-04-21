import { Suspense } from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { readFile, stat } from 'node:fs/promises';
import { resolve } from 'node:path';
import { cacheLife } from 'next/cache';
import { campaigns } from '@/lib/ads/campaigns';
import type { AdAsset } from '@/lib/ads/schema';

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

async function renderedVideos(): Promise<Set<string>> {
  'use cache';
  cacheLife('minutes');
  const present = new Set<string>();
  for (const c of campaigns) {
    const path = resolve(process.cwd(), 'public', 'ads', `${c.id}--video.mp4`);
    try {
      await stat(path);
      present.add(c.id);
    } catch {
      // not rendered yet
    }
  }
  return present;
}

async function CampaignGrid() {
  const [assets, videos] = await Promise.all([loadAssets(), renderedVideos()]);
  const byKey = Object.fromEntries(assets.map((a) => [a.key, a])) as Record<
    string,
    AdAsset | undefined
  >;

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
        gap: 24,
        marginTop: 40,
      }}
    >
      {campaigns.map((c) => {
        const asset = byKey[c.asset.key];
        const hasVideo = videos.has(c.id);
        return (
          <Link
            key={c.id}
            href={`/dev/ads/${c.id}`}
            style={{
              background: '#fff',
              borderRadius: 16,
              padding: 20,
              boxShadow:
                '0 1px 3px rgba(0,0,0,0.08), 0 4px 16px rgba(0,0,0,0.06)',
              textDecoration: 'none',
              color: 'inherit',
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
            }}
          >
            <div
              style={{
                aspectRatio: hasVideo ? '9 / 16' : '4 / 5',
                background: '#FDF6E3',
                borderRadius: 8,
                overflow: 'hidden',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative',
              }}
            >
              {hasVideo ? (
                <video
                  src={`/ads/${c.id}--video.mp4`}
                  autoPlay
                  muted
                  loop
                  playsInline
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                  }}
                />
              ) : asset ? (
                <img
                  src={asset.url}
                  alt=""
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'contain',
                  }}
                />
              ) : (
                <span style={{ color: '#b4a58e', fontSize: 14 }}>
                  Not generated
                </span>
              )}
              {hasVideo && (
                <div
                  style={{
                    position: 'absolute',
                    top: 8,
                    right: 8,
                    background: 'rgba(0,0,0,0.7)',
                    color: '#fff',
                    fontSize: 11,
                    fontWeight: 700,
                    padding: '4px 8px',
                    borderRadius: 999,
                    letterSpacing: '0.04em',
                  }}
                >
                  ▶ 15s VIDEO
                </div>
              )}
            </div>
            <div
              style={{
                fontFamily: 'var(--font-tondo), system-ui',
                fontWeight: 700,
                fontSize: 20,
                letterSpacing: '-0.01em',
              }}
            >
              {c.name}
            </div>
            <div style={{ fontSize: 14, color: '#6b5a47' }}>
              Template: <code>{c.template}</code> · Asset:{' '}
              <code>{c.asset.key}</code>
              {c.asset.generateColoredVariant ? ' (with colored variant)' : ''}
              {c.video ? ' · video' : ''}
            </div>
            <div
              style={{ fontSize: 13, color: '#8b7862', fontStyle: 'italic' }}
            >
              “{c.copy.headline.split('\n')[0].slice(0, 60)}
              {c.copy.headline.length > 60 ? '…' : ''}”
            </div>
          </Link>
        );
      })}
    </div>
  );
}

export default function AdIndexPage() {
  if (process.env.NODE_ENV === 'production') notFound();

  return (
    <div
      style={{
        minHeight: '100vh',
        padding: '48px 56px',
        fontFamily: 'var(--font-rooney-sans), system-ui',
        color: '#2a1d10',
      }}
    >
      <h1
        style={{
          fontFamily: 'var(--font-tondo), system-ui',
          fontWeight: 700,
          fontSize: 48,
          margin: 0,
          letterSpacing: '-0.02em',
        }}
      >
        Ad campaigns
      </h1>
      <p style={{ color: '#6b5a47', marginTop: 8, fontSize: 18 }}>
        {campaigns.length} campaigns. Click a card to preview.
      </p>

      <Suspense
        fallback={
          <div style={{ padding: 40, color: '#8b7862' }}>
            Loading campaigns…
          </div>
        }
      >
        <CampaignGrid />
      </Suspense>
    </div>
  );
}

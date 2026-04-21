import { Suspense } from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { readFile } from 'node:fs/promises';
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

async function CampaignGrid() {
  const assets = await loadAssets();
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
                aspectRatio: '4 / 5',
                background: '#FDF6E3',
                borderRadius: 8,
                overflow: 'hidden',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {asset ? (
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

import type { AdAsset, Campaign } from '@/lib/ads/schema';
import {
  AD_H,
  AD_W,
  CC,
  ChunkyButton,
  Crayon,
  ROONEY,
  TONDO,
} from './primitives';

type Props = { campaign: Campaign; asset: AdAsset };

export default function AdHero({ campaign, asset }: Props) {
  const { headline, subhead, cta, proofQuote } = campaign.copy;

  return (
    <div
      data-ad-canvas="true"
      style={{
        width: AD_W,
        height: AD_H,
        position: 'relative',
        overflow: 'hidden',
        background: CC.surface,
        fontFamily: ROONEY,
        color: CC.ink,
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: `radial-gradient(ellipse at top, ${CC.yellow}22, transparent 60%), radial-gradient(ellipse at bottom right, ${CC.pink}22, transparent 55%)`,
        }}
      />

      {/* Brand lockup */}
      <div style={{ position: 'relative', padding: '56px 56px 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
          <img
            src="/logos/cc-logo-no-bg.svg"
            alt=""
            style={{
              width: 84,
              height: 84,
              display: 'block',
              filter: 'drop-shadow(0 4px 0 rgba(0,0,0,0.08))',
            }}
          />
          <div
            style={{
              fontFamily: TONDO,
              fontWeight: 700,
              fontSize: 36,
              lineHeight: 1,
              letterSpacing: '-0.01em',
            }}
          >
            chunkycrayon
          </div>
        </div>
      </div>

      {/* Headline — hyphens:manual stops "T-rex" breaking mid-word */}
      <div
        style={{
          position: 'relative',
          padding: '56px 56px 0',
          fontFamily: TONDO,
          fontWeight: 700,
          fontSize: 88,
          lineHeight: 1.02,
          letterSpacing: '-0.02em',
          hyphens: 'manual',
          wordBreak: 'keep-all',
        }}
      >
        {headline}
      </div>

      {/* Subhead */}
      {subhead && (
        <div
          style={{
            position: 'relative',
            padding: '32px 56px 0',
            fontSize: 34,
            fontWeight: 500,
            lineHeight: 1.3,
            color: CC.muted,
            maxWidth: 900,
          }}
        >
          {subhead}
        </div>
      )}

      {/* Proof quote — above the card, not over it */}
      {proofQuote && (
        <div
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: 630,
            textAlign: 'center',
            fontSize: 24,
            fontStyle: 'italic',
            color: CC.muted,
            fontWeight: 500,
            padding: '0 56px',
          }}
        >
          {proofQuote}
        </div>
      )}

      {/* Coloring page card — centered, with margin above for the proof quote */}
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: 690,
          transform: 'translateX(-50%) rotate(-3deg)',
          width: 520,
          height: 520,
          background: '#fff',
          borderRadius: 16,
          boxShadow: '0 14px 0 rgba(0,0,0,0.07), 0 30px 60px rgba(0,0,0,0.12)',
          overflow: 'visible',
          padding: 24,
        }}
      >
        <img
          src={asset.url}
          alt=""
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'contain',
            display: 'block',
          }}
        />
        <div
          style={{
            position: 'absolute',
            top: -20,
            left: 50,
            width: 140,
            height: 44,
            background: 'rgba(255, 220, 140, 0.8)',
            transform: 'rotate(-6deg)',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          }}
        />
      </div>

      {/* Crayon scatter — flanking the card, above the CTA zone */}
      <div style={{ position: 'absolute', left: 80, top: 1120 }}>
        <Crayon color={CC.pink} dark={CC.pinkDark} length={150} rotate={18} />
      </div>
      <div style={{ position: 'absolute', right: 80, top: 1130 }}>
        <Crayon
          color={CC.green}
          dark={CC.greenDark}
          length={160}
          rotate={-10}
        />
      </div>

      {/* CTA band — full safe zone at bottom */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          padding: '0 56px 48px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <ChunkyButton bg={CC.orange} shadow={CC.orangeDark} fontSize={42}>
          {cta}
        </ChunkyButton>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-end',
            gap: 6,
            fontSize: 22,
            color: CC.muted,
            fontWeight: 600,
          }}
        >
          <span>🖨 Print it</span>
          <span>✨ or color in the app</span>
        </div>
      </div>
    </div>
  );
}

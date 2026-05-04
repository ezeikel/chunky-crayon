import type { AdAsset, Campaign } from '@/lib/ads/schema';
import {
  CC,
  CanvasFormat,
  ChunkyButton,
  Crayon,
  ROONEY,
  TONDO,
  getCanvasDims,
} from './primitives';

type Props = { campaign: Campaign; asset: AdAsset; format?: CanvasFormat };

export default function AdBeforeAfter({
  campaign,
  asset,
  format = 'meta-feed',
}: Props) {
  const { headline, cta, eyebrow } = campaign.copy;
  const { w: AD_W, h: AD_H } = getCanvasDims(format);
  // Card row was top:560 bottom:340 in the 1080x1350 original. Scale anchors
  // proportionally so before/after cards stay roughly centered.
  const cardRowTop = Math.round(AD_H * 0.415);
  const cardRowBottom = Math.round(AD_H * 0.252);
  const sidePad = AD_W < 1080 ? 44 : 56;
  // After-card uses colored variant if generated, else falls back to line art
  // (visibly the same as before — warns author during review).
  const afterImage = asset.coloredUrl ?? asset.url;

  return (
    <div
      data-ad-canvas="true"
      style={{
        width: AD_W,
        height: AD_H,
        position: 'relative',
        overflow: 'hidden',
        background: CC.paper,
        fontFamily: ROONEY,
        color: CC.ink,
      }}
    >
      {/* Color ribbon */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 96,
          display: 'flex',
        }}
      >
        {[CC.orange, CC.yellow, CC.green, '#6BB6D6', CC.purple, CC.pink].map(
          (c, i) => (
            <div key={i} style={{ flex: 1, background: c }} />
          ),
        )}
      </div>

      {/* Headline */}
      <div
        style={{
          position: 'absolute',
          top: 130,
          left: sidePad,
          right: sidePad,
          fontFamily: TONDO,
          fontWeight: 700,
          fontSize: 108,
          lineHeight: 0.95,
          letterSpacing: '-0.02em',
          whiteSpace: 'pre-line',
        }}
      >
        {eyebrow && (
          <span
            style={{
              color: CC.muted,
              fontSize: 36,
              fontWeight: 600,
              display: 'block',
              marginBottom: 12,
              fontFamily: ROONEY,
              letterSpacing: 0,
            }}
          >
            {eyebrow}
          </span>
        )}
        {headline.split('\n').map((line, i, arr) => (
          <div
            key={i}
            style={{
              color: i === arr.length - 1 ? CC.orange : CC.ink,
            }}
          >
            {line}
          </div>
        ))}
      </div>

      {/* Card row — wrapped in a padded container so pill labels aren't clipped */}
      <div
        style={{
          position: 'absolute',
          left: 40,
          right: 40,
          top: cardRowTop,
          bottom: cardRowBottom,
          paddingTop: 30,
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 24,
        }}
      >
        {/* Before — line art */}
        <div
          style={{
            background: '#fff',
            borderRadius: 28,
            position: 'relative',
            padding: 20,
            boxShadow: `0 10px 0 ${CC.surfaceDark}`,
            transform: 'rotate(-2deg)',
          }}
        >
          <div
            style={{
              width: '100%',
              height: 'calc(100% - 72px)',
              borderRadius: 16,
              overflow: 'hidden',
              background: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <img
              src={asset.svgUrl}
              alt=""
              style={{ width: '100%', height: '100%', objectFit: 'contain' }}
            />
          </div>
          <div
            style={{
              position: 'absolute',
              top: -18,
              left: 20,
              background: CC.ink,
              color: '#fff',
              padding: '10px 22px',
              borderRadius: 999,
              fontFamily: TONDO,
              fontWeight: 700,
              fontSize: 24,
              zIndex: 3,
            }}
          >
            Their idea
          </div>
          <div
            style={{
              marginTop: 14,
              fontFamily: ROONEY,
              fontSize: 22,
              textAlign: 'center',
              color: CC.muted,
              fontStyle: 'italic',
              padding: '0 10px',
              lineHeight: 1.25,
            }}
          >
            “a dragon having a tea party with a bunny”
          </div>
        </div>

        {/* After — colored (or line art if not yet generated) */}
        <div
          style={{
            background: '#fff',
            borderRadius: 28,
            position: 'relative',
            padding: 20,
            boxShadow: `0 10px 0 ${CC.orangeDark}`,
            transform: 'rotate(2deg)',
            outline: `6px solid ${CC.orange}`,
            outlineOffset: -6,
          }}
        >
          <div
            style={{
              width: '100%',
              height: 'calc(100% - 72px)',
              borderRadius: 16,
              overflow: 'hidden',
              background: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <img
              src={afterImage}
              alt=""
              style={{ width: '100%', height: '100%', objectFit: 'contain' }}
            />
          </div>
          <div
            style={{
              position: 'absolute',
              top: -18,
              left: 20,
              background: CC.orange,
              color: '#fff',
              padding: '10px 22px',
              borderRadius: 999,
              fontFamily: TONDO,
              fontWeight: 700,
              fontSize: 24,
              boxShadow: `0 4px 0 ${CC.orangeDark}`,
              zIndex: 3,
            }}
          >
            Colored in 20 min
          </div>
          <div
            style={{
              marginTop: 14,
              fontFamily: TONDO,
              fontWeight: 700,
              fontSize: 30,
              textAlign: 'center',
              color: CC.orange,
            }}
          >
            Masterpiece ✦
          </div>
        </div>

        {/* Yellow arrow */}
        <div
          style={{
            position: 'absolute',
            left: '50%',
            top: '50%',
            transform: 'translate(-50%, -50%)',
            width: 96,
            height: 96,
            borderRadius: '50%',
            background: CC.yellow,
            display: 'grid',
            placeItems: 'center',
            boxShadow: `0 6px 0 ${CC.yellowDark}`,
            zIndex: 2,
          }}
        >
          <svg width="44" height="44" viewBox="0 0 24 24" fill="none">
            <path
              d="M5 12 H19 M13 6 L19 12 L13 18"
              stroke={CC.ink}
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      </div>

      {/* Crayons + CTA */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          padding: `0 ${sidePad}px 48px`,
        }}
      >
        <div
          style={{
            display: 'flex',
            gap: 12,
            marginBottom: 28,
            justifyContent: 'center',
          }}
        >
          <Crayon
            color={CC.orange}
            dark={CC.orangeDark}
            length={120}
            rotate={-8}
          />
          <Crayon
            color={CC.yellow}
            dark={CC.yellowDark}
            length={120}
            rotate={4}
          />
          <Crayon
            color={CC.green}
            dark={CC.greenDark}
            length={120}
            rotate={-2}
          />
          <Crayon color={CC.pink} dark={CC.pinkDark} length={120} rotate={6} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <ChunkyButton bg={CC.orange} shadow={CC.orangeDark} fontSize={44}>
            {cta}
          </ChunkyButton>
        </div>
        <div
          style={{
            textAlign: 'center',
            marginTop: 16,
            color: CC.muted,
            fontSize: 22,
          }}
        >
          chunkycrayon.com
        </div>
      </div>
    </div>
  );
}

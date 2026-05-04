import type { AdAsset, Campaign } from '@/lib/ads/schema';
import {
  CC,
  CanvasFormat,
  ChunkyButton,
  PaletteDots,
  ROONEY,
  TONDO,
  getCanvasDims,
} from './primitives';

type Props = { campaign: Campaign; asset: AdAsset; format?: CanvasFormat };

export default function AdAppScreen({
  campaign,
  asset,
  format = 'meta-feed',
}: Props) {
  const { headline, subhead, cta } = campaign.copy;
  const { w: AD_W, h: AD_H } = getCanvasDims(format);
  // Phone was at top:650 / 520x600 in the 1080x1350 original. Anchor and
  // dimensions scale to canvas height so the phone stays centered between
  // headline and CTA in any format.
  const phoneTop = Math.round(AD_H * 0.481);
  const phoneW = Math.round(AD_H * 0.385);
  const phoneH = Math.round(AD_H * 0.444);
  const sidePad = AD_W < 1080 ? 44 : 56;

  return (
    <div
      data-ad-canvas="true"
      style={{
        width: AD_W,
        height: AD_H,
        position: 'relative',
        overflow: 'hidden',
        background: CC.orange,
        fontFamily: ROONEY,
        color: '#fff',
      }}
    >
      {/* confetti dots */}
      <svg
        style={{ position: 'absolute', inset: 0 }}
        width={AD_W}
        height={AD_H}
      >
        {Array.from({ length: 40 }).map((_, i) => {
          const x = (i * 137) % AD_W;
          const y = (i * 193) % AD_H;
          const colors = [CC.yellow, CC.pink, '#fff', CC.purple];
          const c = colors[i % 4];
          const r = 6 + (i % 3) * 4;
          return <circle key={i} cx={x} cy={y} r={r} fill={c} opacity={0.22} />;
        })}
      </svg>

      {/* Headline — supports multi-line via \n */}
      <div
        style={{
          position: 'relative',
          padding: `72px ${sidePad}px 0`,
          fontFamily: TONDO,
          fontWeight: 700,
          fontSize: 132,
          lineHeight: 0.92,
          letterSpacing: '-0.02em',
          whiteSpace: 'pre-line',
        }}
      >
        {headline.split('\n').map((line, i, arr) => (
          <div
            key={i}
            style={{
              color: i === arr.length - 2 ? CC.yellow : '#fff',
            }}
          >
            {line}
          </div>
        ))}
      </div>

      {/* Sub */}
      {subhead && (
        <div
          style={{
            position: 'relative',
            padding: `28px ${sidePad}px 0`,
            fontSize: 30,
            fontWeight: 500,
            lineHeight: 1.35,
            maxWidth: AD_W - sidePad * 2,
            color: 'rgba(255,255,255,0.92)',
          }}
        >
          {subhead}
        </div>
      )}

      {/* Phone mockup — slightly smaller + moved down to clear headline */}
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: phoneTop,
          transform: 'translateX(-50%) rotate(-3deg)',
          width: phoneW,
          height: phoneH,
          background: '#1a0f08',
          borderRadius: 48,
          padding: 18,
          boxShadow: '0 24px 0 rgba(0,0,0,0.18), 0 40px 80px rgba(0,0,0,0.25)',
        }}
      >
        <div
          style={{
            width: '100%',
            height: '100%',
            borderRadius: 36,
            background: CC.surface,
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {/* toolbar pill */}
          <div
            style={{
              position: 'absolute',
              top: 28,
              left: 24,
              right: 24,
              height: 58,
              background: '#fff',
              borderRadius: 999,
              display: 'flex',
              alignItems: 'center',
              padding: '0 16px',
              gap: 10,
              boxShadow: '0 3px 0 rgba(0,0,0,0.08)',
            }}
          >
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: 999,
                background: CC.orange,
              }}
            />
            <div
              style={{
                flex: 1,
                height: 8,
                background: CC.surfaceDark,
                borderRadius: 999,
              }}
            >
              <div
                style={{
                  width: '55%',
                  height: '100%',
                  background: CC.green,
                  borderRadius: 999,
                }}
              />
            </div>
            <div
              style={{
                color: CC.ink,
                fontWeight: 700,
                fontSize: 18,
                fontFamily: TONDO,
              }}
            >
              ★ 6/10
            </div>
          </div>

          {/* coloring canvas */}
          <div
            style={{
              position: 'absolute',
              top: 110,
              left: 24,
              right: 24,
              bottom: 160,
              background: '#fff',
              borderRadius: 24,
              padding: 10,
              overflow: 'hidden',
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
                left: 180,
                top: 220,
                width: 56,
                height: 56,
                borderRadius: '50%',
                background: 'rgba(255,255,255,0.7)',
                border: `4px solid ${CC.orange}`,
              }}
            />
          </div>

          {/* palette */}
          <div
            style={{
              position: 'absolute',
              bottom: 24,
              left: 24,
              right: 24,
              height: 110,
              background: '#fff',
              borderRadius: 24,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '0 16px',
              boxShadow: '0 3px 0 rgba(0,0,0,0.08)',
            }}
          >
            <PaletteDots size={52} />
          </div>
        </div>
      </div>

      {/* Bottom band: icons (left) + CTA (right). Clear of phone. */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 56,
          padding: `0 ${sidePad}px`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
            fontSize: 26,
            fontWeight: 700,
            lineHeight: 1.2,
            color: '#fff',
          }}
        >
          <span>🖨 Print it</span>
          <span>📱 Or color in the app</span>
        </div>
        <ChunkyButton
          bg="#fff"
          shadow={CC.orangeDark}
          fontSize={44}
          color={CC.orange}
        >
          <span>{cta} ›</span>
        </ChunkyButton>
      </div>
    </div>
  );
}

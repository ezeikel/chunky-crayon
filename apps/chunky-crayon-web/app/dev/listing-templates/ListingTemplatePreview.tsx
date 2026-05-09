'use client';

import { useState } from 'react';
import Image from 'next/image';
import CrayonScribble from '@/components/Intro/CrayonScribble';

/**
 * Interactive preview component for listing templates. Shows each template
 * variant (Hero, BrandCard, PageGrid) at full size so you can properly
 * evaluate the design before generating actual images.
 *
 * v3: Improved typography, removed badge, cleaner layout
 */

// Palette matching the Satori templates
const PALETTE = {
  crayonOrange: '#E58163',
  crayonOrangeLight: '#F2B79E',
  crayonOrangeDark: '#D26542',
  crayonPink: '#E89098',
  crayonPinkLight: '#F4C5CB',
  crayonPinkDark: '#E5639A',
  crayonYellow: '#F8B83F',
  crayonYellowLight: '#FCDA85',
  crayonPurple: '#A06FB0',
  crayonPurpleLight: '#C4A0D8',
  cream: '#FFFAF5',
  brown: '#5C3A21',
  brownLight: '#8B6747',
};

// Scatter rotations for Hero thumbnails — ±4° max, small offsets, so the
// rotation envelope stays inside the gap and borders don't crash.
const SCATTER_ROTATIONS = [
  { rotate: -4, offsetX: 0, offsetY: 0 },
  { rotate: 3, offsetX: 0.5, offsetY: -0.3 },
  { rotate: -2, offsetX: -0.3, offsetY: 0.4 },
  { rotate: 4, offsetX: 0.7, offsetY: -0.2 },
  { rotate: -3, offsetX: -0.4, offsetY: 0.3 },
  { rotate: 2, offsetX: 0.3, offsetY: -0.5 },
  { rotate: -3, offsetX: -0.2, offsetY: 0.3 },
  { rotate: 2, offsetX: 0.6, offsetY: -0.2 },
  { rotate: -2, offsetX: -0.3, offsetY: 0.2 },
];

// 2x2 positions for PageGrid — small ±2° tilts, gaps wide enough that
// the rotation envelopes don't overlap neighbour borders or the captions
// drifting below each thumb.
const PAGE_SCATTER = [
  { x: 8, y: 17, rotate: -2 },
  { x: 54, y: 17, rotate: 2 },
  { x: 8, y: 60, rotate: 2 },
  { x: 54, y: 60, rotate: -2 },
];

type TemplateType =
  | 'hero'
  | 'brandCard'
  | 'pageGrid1'
  | 'pageGrid2'
  | 'pageGrid3';

// Generic placeholder — represents "any coloring page" since this template
// renders for every bundle. We draw a tiny cartoon scribble so the slot
// looks like art, not an empty box, but stay bundle-agnostic. Production
// renders pull each bundle's own pages/N/image.webp from R2.
const MockThumbnail = ({ pageNum }: { pageNum: number }) => (
  <div className="relative w-full h-full bg-white rounded-lg flex items-center justify-center">
    <svg
      viewBox="0 0 100 100"
      width="60%"
      height="60%"
      fill="none"
      stroke={PALETTE.brownLight}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ opacity: 0.35 }}
      aria-hidden
    >
      <path d="M30 70 Q 35 55, 40 70 T 50 70 T 60 70 T 70 70" />
      <circle cx="40" cy="40" r="14" />
      <circle cx="44" cy="38" r="2" fill={PALETTE.brownLight} />
      <path d="M36 46 Q 40 50, 44 46" />
    </svg>
    <span
      className="absolute bottom-2 right-2 font-tondo text-[8px]"
      style={{ color: PALETTE.brownLight, opacity: 0.4 }}
    >
      {pageNum}
    </span>
  </div>
);

// Local Squiggle removed — preview now uses brand-wide CrayonScribble
// (rough.js + paper-grain filter) for visual consistency with the
// rest of the site. Keeping shim below for any unmigrated caller.
// (Will be deleted once we confirm nothing else imports it.)
const Squiggle = ({
  width = 280,
  color = PALETTE.crayonPink,
  className = '',
}: {
  width?: number;
  color?: string;
  className?: string;
}) => (
  <svg
    width={width}
    height={20}
    viewBox={`0 0 ${width} 20`}
    fill="none"
    className={className}
  >
    <path
      d={`M2 10 Q ${width * 0.12} 4, ${width * 0.24} 10 T ${width * 0.48} 10 T ${width * 0.72} 10 T ${width - 2} 10`}
      stroke={color}
      strokeWidth={6}
      strokeLinecap="round"
      fill="none"
    />
  </svg>
);

// Background pattern with soft gradients and scribbles
const BackgroundPattern = () => (
  <div
    className="absolute inset-0"
    style={{
      backgroundColor: PALETTE.cream,
      backgroundImage: `
        radial-gradient(circle at 15% 25%, ${PALETTE.crayonOrangeLight}18 0%, transparent 55%),
        radial-gradient(circle at 85% 75%, ${PALETTE.crayonPinkLight}18 0%, transparent 55%)
      `,
    }}
  >
    <svg className="absolute inset-0 w-full h-full opacity-[0.12]">
      <defs>
        <pattern
          id="scribbles"
          patternUnits="userSpaceOnUse"
          width="180"
          height="180"
        >
          {/* Scattered crayon marks */}
          <path
            d="M20 25 L28 18 L32 28"
            stroke={PALETTE.crayonOrange}
            strokeWidth="2.5"
            fill="none"
            strokeLinecap="round"
          />
          <path
            d="M90 45 L98 38 L94 50"
            stroke={PALETTE.crayonPink}
            strokeWidth="2.5"
            fill="none"
            strokeLinecap="round"
          />
          <path
            d="M150 35 L158 30 L154 42"
            stroke={PALETTE.crayonPurple}
            strokeWidth="2.5"
            fill="none"
            strokeLinecap="round"
          />
          <path
            d="M45 110 L53 103 L49 115"
            stroke={PALETTE.crayonYellow}
            strokeWidth="2.5"
            fill="none"
            strokeLinecap="round"
          />
          <path
            d="M120 90 L128 83 L124 95"
            stroke={PALETTE.crayonOrange}
            strokeWidth="2.5"
            fill="none"
            strokeLinecap="round"
          />
          <path
            d="M170 140 L178 135 L174 147"
            stroke={PALETTE.crayonPink}
            strokeWidth="2.5"
            fill="none"
            strokeLinecap="round"
          />
          {/* Dots */}
          <circle cx="65" cy="75" r="2.5" fill={PALETTE.crayonPink} />
          <circle cx="135" cy="55" r="2" fill={PALETTE.crayonOrange} />
          <circle cx="95" cy="150" r="2.5" fill={PALETTE.crayonPurple} />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#scribbles)" />
    </svg>
  </div>
);

// CC Logo component
const CCLogo = ({ size = 68 }: { size?: number }) => (
  <Image
    src="/logos/cc-logo-no-bg.svg"
    alt="Chunky Crayon"
    width={size}
    height={size}
    className="shrink-0"
  />
);

// ============================================================================
// HERO TEMPLATE - Showcases the bundle with scattered pages
// ============================================================================
const HeroTemplate = ({
  bundleName,
  pageCount,
}: {
  bundleName: string;
  pageCount: number;
}) => {
  const gridPages = Array.from(
    { length: Math.min(9, pageCount - 1) },
    (_, i) => i + 2,
  );

  return (
    <div
      className="relative w-full aspect-square overflow-hidden rounded-xl"
      style={{ fontFamily: 'var(--font-tondo)' }}
    >
      <BackgroundPattern />

      {/* Title block — bundle name is the entire headline. The earlier
          "Bundle 01:" prefix was dropped since serial numbering doesn't
          earn its visual space at our current bundle count. The squiggle
          moves under the bundle name to anchor it as the title. */}
      <div className="absolute top-[4%] left-0 right-0 flex flex-col items-center text-center px-4">
        <h1
          className="font-tondo font-bold tracking-wide"
          style={{
            fontSize: 'clamp(1.5rem, 6.5vw, 4.75rem)',
            color: PALETTE.crayonPurple,
            letterSpacing: '0.04em',
            lineHeight: 1.1,
          }}
        >
          {bundleName.toUpperCase()}
        </h1>
        <div
          className="-mt-1"
          style={{
            width: 320,
            height: 22,
            color: PALETTE.crayonPinkLight,
          }}
        >
          <CrayonScribble seed={11} className="w-full h-full" />
        </div>

        {/* Subtitle */}
        <p
          className="font-tondo font-bold mt-2 tracking-widest uppercase"
          style={{
            fontSize: 'clamp(0.6rem, 2.2vw, 1.5rem)',
            color: PALETTE.brown,
            letterSpacing: '0.12em',
          }}
        >
          {pageCount} Coloring Pages • PDF + Online
        </p>
      </div>

      {/* Hero page — pushed down to clear the title block. Vertically
          centred against the thumb cluster below. */}
      <div
        className="absolute bg-white rounded-2xl"
        style={{
          width: '42%',
          aspectRatio: '1',
          top: '37%',
          left: '5%',
          transform: 'rotate(-2deg)',
          border: `4px solid ${PALETTE.brown}`,
          padding: '3%',
          boxShadow: `
            8px 8px 0 0 rgba(92, 58, 33, 0.12),
            14px 14px 24px -6px rgba(92, 58, 33, 0.1)
          `,
        }}
      >
        <div className="w-full h-full bg-gray-50 rounded-lg flex items-center justify-center border border-gray-200">
          <span className="text-gray-400 font-tondo">Page 1</span>
        </div>
      </div>

      {/* Thumbnail cluster — wider spacing so each thumb has breathing
          room. 12% wide thumbs at 16% column step = 4% gap. */}
      {gridPages.map((pageNum, idx) => {
        const scatter = SCATTER_ROTATIONS[idx % SCATTER_ROTATIONS.length];
        const col = idx % 3;
        const row = Math.floor(idx / 3);
        const baseX = 52 + col * 16;
        const baseY = 37 + row * 18;
        const finalX = baseX + scatter.offsetX;
        const finalY = baseY + scatter.offsetY;

        return (
          <div
            key={pageNum}
            className="absolute flex flex-col"
            style={{
              width: '12.5%',
              top: `${finalY}%`,
              left: `${finalX}%`,
              transform: `rotate(${scatter.rotate}deg)`,
            }}
          >
            <div
              className="aspect-square bg-white rounded-lg"
              style={{
                border: `3px solid ${PALETTE.brown}`,
                padding: '6%',
                boxShadow: `
                  3px 3px 0 0 rgba(92, 58, 33, 0.08),
                  5px 5px 10px -3px rgba(92, 58, 33, 0.06)
                `,
              }}
            >
              <MockThumbnail pageNum={pageNum} />
            </div>
            <span
              className="text-center mt-1 font-tondo font-bold"
              style={{
                fontSize: 'clamp(0.5rem, 1.1vw, 0.85rem)',
                color: PALETTE.brownLight,
              }}
            >
              Page {pageNum}
            </span>
          </div>
        );
      })}

      {/* Brand logo - bottom center */}
      <div className="absolute bottom-[3%] left-0 right-0 flex justify-center">
        <CCLogo size={56} />
      </div>
    </div>
  );
};

// ============================================================================
// BRAND CARD TEMPLATE - Warm thank you message with character
// ============================================================================
const BrandCardTemplate = ({ bundleName }: { bundleName: string }) => {
  return (
    <div
      className="relative w-full aspect-square overflow-hidden rounded-xl"
      style={{ fontFamily: 'var(--font-tondo)' }}
    >
      <BackgroundPattern />

      {/* Decorative floating elements - subtle warmth */}
      <span
        className="absolute select-none"
        style={{
          top: '14%',
          left: '8%',
          fontSize: 'clamp(1.2rem, 3vw, 2.2rem)',
          color: PALETTE.crayonPinkLight,
          transform: 'rotate(-12deg)',
          opacity: 0.8,
        }}
      >
        {'♥'}
      </span>
      <span
        className="absolute select-none"
        style={{
          top: '20%',
          right: '10%',
          fontSize: 'clamp(1rem, 2.5vw, 1.8rem)',
          color: PALETTE.crayonYellow,
          transform: 'rotate(15deg)',
          opacity: 0.9,
        }}
      >
        {'★'}
      </span>
      <span
        className="absolute select-none"
        style={{
          top: '34%',
          left: '6%',
          fontSize: 'clamp(0.8rem, 2vw, 1.4rem)',
          color: PALETTE.crayonPurpleLight,
          transform: 'rotate(-8deg)',
          opacity: 0.7,
        }}
      >
        {'✦'}
      </span>
      <span
        className="absolute select-none"
        style={{
          top: '30%',
          right: '7%',
          fontSize: 'clamp(1rem, 2.2vw, 1.6rem)',
          color: PALETTE.crayonPink,
          transform: 'rotate(10deg)',
          opacity: 0.85,
        }}
      >
        {'♥'}
      </span>

      {/* Headline */}
      <div className="absolute top-[7%] left-0 right-0 flex flex-col items-center">
        <h1
          className="font-tondo font-bold"
          style={{
            fontSize: 'clamp(2rem, 10vw, 7rem)',
            color: PALETTE.crayonOrangeDark,
            lineHeight: 1,
          }}
        >
          Hey there!
        </h1>
        <div
          className="-mt-1"
          style={{
            width: 280,
            height: 22,
            color: PALETTE.crayonPink,
          }}
        >
          <CrayonScribble seed={42} className="w-full h-full" />
        </div>
      </div>

      {/* Welcome message — clear typographic rhythm:
            • thank-you intro (small, brown)
            • bundle name (large, purple — the visual hook)
            • body copy (medium, brown, with breathing room)
            • sign-off block (orange "Happy coloring!" + muted attribution,
              separated from body by a wider gap so it reads as a footer
              not a continuation) */}
      <div
        className="absolute left-0 right-0 flex flex-col items-center text-center px-[10%]"
        style={{ top: '26%' }}
      >
        <p
          className="font-tondo"
          style={{
            fontSize: 'clamp(0.7rem, 2.3vw, 1.65rem)',
            color: PALETTE.brown,
            lineHeight: 1.3,
            letterSpacing: '0.01em',
          }}
        >
          Thanks for picking up
        </p>
        <h2
          className="font-tondo font-bold"
          style={{
            fontSize: 'clamp(1.05rem, 3.6vw, 2.6rem)',
            color: PALETTE.crayonPurple,
            marginTop: '0.35em',
            lineHeight: 1.05,
            letterSpacing: '0.01em',
          }}
        >
          {bundleName}!
        </h2>
        <p
          className="font-tondo mt-5"
          style={{
            fontSize: 'clamp(0.7rem, 2.3vw, 1.65rem)',
            color: PALETTE.brown,
            lineHeight: 1.5,
          }}
        >
          Print every page, color them online,
          <br />
          do both. Whatever your tiny artist wants.
        </p>

        {/* Sign-off — extra top margin separates from body so it reads
            as a closing flourish. No "Chunky Crayon" attribution: the
            character below IS the brand presence. */}
        <p
          className="font-tondo font-bold mt-7"
          style={{
            fontSize: 'clamp(0.85rem, 2.7vw, 1.95rem)',
            color: PALETTE.crayonOrangeDark,
            lineHeight: 1.05,
            letterSpacing: '0.01em',
          }}
        >
          Happy coloring!
        </p>
      </div>

      {/* Character placeholder — generic since this template runs for
          every bundle. Production fills in bundle.brandCharacterUrl.
          Bottom margin > top margin so "Happy coloring!" has clear
          breathing room above the character. */}
      <div
        className="absolute flex items-center justify-center"
        style={{
          width: '34%',
          aspectRatio: '1',
          bottom: '5%',
          left: '33%',
          filter: 'drop-shadow(4px 8px 12px rgba(92, 58, 33, 0.15))',
        }}
      >
        <div className="w-full h-full bg-gray-200/60 rounded-full flex items-center justify-center border-2 border-dashed border-gray-300">
          <span className="text-gray-400 font-tondo text-sm">
            Bundle character
          </span>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// PAGE GRID TEMPLATE - Shows 4 coloring pages with scattered layout
// ============================================================================
const PageGridTemplate = ({
  bundleName,
  sheetIndex,
  totalSheets,
  pageNumbers,
}: {
  bundleName: string;
  sheetIndex: number;
  totalSheets: number;
  pageNumbers: number[];
}) => {
  const slots = Array.from({ length: 4 }, (_, i) => pageNumbers[i] ?? null);

  return (
    <div
      className="relative w-full aspect-square overflow-hidden rounded-xl"
      style={{ fontFamily: 'var(--font-tondo)' }}
    >
      <BackgroundPattern />

      {/* Header — small "PDF DOWNLOAD" eyebrow sits above the bundle
          name. Eyebrow at ~40% of the headline size + muted brown so
          it reads as a category label, not a competing title. */}
      <div className="absolute top-[3.5%] left-0 right-0 flex flex-col items-center text-center gap-1">
        <span
          className="font-tondo font-bold uppercase"
          style={{
            fontSize: 'clamp(0.55rem, 1.4vw, 1rem)',
            color: PALETTE.brownLight,
            letterSpacing: '0.25em',
          }}
        >
          PDF Download
        </span>
        <span
          className="font-tondo font-bold tracking-wide"
          style={{
            fontSize: 'clamp(0.9rem, 3.4vw, 2.5rem)',
            color: PALETTE.crayonPurple,
            letterSpacing: '0.04em',
            lineHeight: 1.05,
          }}
        >
          {bundleName.toUpperCase()}
        </span>
      </div>

      {/* Scattered page thumbnails */}
      {slots.map((pageNum, idx) => {
        const pos = PAGE_SCATTER[idx];
        const isPage = pageNum !== null;

        return (
          <div
            key={idx}
            className="absolute flex flex-col"
            style={{
              width: '38%',
              top: `${pos.y}%`,
              left: `${pos.x}%`,
              transform: `rotate(${pos.rotate}deg)`,
            }}
          >
            {isPage ? (
              <>
                <div
                  className="aspect-square bg-white rounded-2xl"
                  style={{
                    border: `4px solid ${PALETTE.brown}`,
                    padding: '3.5%',
                    boxShadow: `
                      5px 5px 0 0 rgba(92, 58, 33, 0.1),
                      10px 10px 18px -5px rgba(92, 58, 33, 0.08)
                    `,
                  }}
                >
                  <MockThumbnail pageNum={pageNum} />
                </div>
                <span
                  className="text-center mt-2 font-tondo font-bold"
                  style={{
                    fontSize: 'clamp(0.6rem, 1.6vw, 1.15rem)',
                    color: PALETTE.brownLight,
                    fontStyle: 'italic',
                  }}
                >
                  Page {pageNum}
                </span>
              </>
            ) : (
              <div
                className="aspect-square bg-white rounded-2xl flex flex-col items-center justify-center px-4"
                style={{
                  border: `4px dashed ${PALETTE.crayonOrangeLight}`,
                  boxShadow: `
                    5px 5px 0 0 rgba(92, 58, 33, 0.06),
                    10px 10px 18px -5px rgba(92, 58, 33, 0.04)
                  `,
                }}
              >
                <CCLogo size={56} />
                <span
                  className="font-tondo font-bold mt-2 text-center"
                  style={{
                    fontSize: 'clamp(0.65rem, 2vw, 1.4rem)',
                    color: PALETTE.crayonOrangeDark,
                    lineHeight: 1.1,
                  }}
                >
                  Happy coloring!
                </span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

// ============================================================================
// MAIN PREVIEW COMPONENT
// ============================================================================
export const ListingTemplatePreview = () => {
  const [selectedTemplate, setSelectedTemplate] =
    useState<TemplateType>('hero');
  // Default to a generic placeholder so the preview is visibly bundle-
  // agnostic. Anyone looking at the preview can see this is a template
  // and the name is dynamic — change it via Template Settings to test
  // longer/shorter names. Production worker fills in input.bundleName.
  const [bundleName, setBundleName] = useState('[ BUNDLE NAME ]');
  const [pageCount, setPageCount] = useState(10);

  const templates: {
    id: TemplateType;
    label: string;
    component: React.ReactNode;
  }[] = [
    {
      id: 'hero',
      label: 'Hero',
      component: <HeroTemplate bundleName={bundleName} pageCount={pageCount} />,
    },
    {
      id: 'brandCard',
      label: 'Brand Card',
      component: <BrandCardTemplate bundleName={bundleName} />,
    },
    {
      id: 'pageGrid1',
      label: 'Page Grid 1',
      component: (
        <PageGridTemplate
          bundleName={bundleName}
          sheetIndex={1}
          totalSheets={3}
          pageNumbers={[1, 2, 3, 4]}
        />
      ),
    },
    {
      id: 'pageGrid2',
      label: 'Page Grid 2',
      component: (
        <PageGridTemplate
          bundleName={bundleName}
          sheetIndex={2}
          totalSheets={3}
          pageNumbers={[5, 6, 7, 8]}
        />
      ),
    },
    {
      id: 'pageGrid3',
      label: 'Page Grid 3',
      component: (
        <PageGridTemplate
          bundleName={bundleName}
          sheetIndex={3}
          totalSheets={3}
          pageNumbers={[9, 10]}
        />
      ),
    },
  ];

  return (
    <div className="space-y-8">
      {/* Controls */}
      <div className="bg-white rounded-2xl border-2 border-border-light p-6 space-y-4">
        <h2 className="font-tondo text-xl font-bold text-text-primary">
          Template Settings
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">
              Bundle Name
            </label>
            <input
              type="text"
              value={bundleName}
              onChange={(e) => setBundleName(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border-2 border-border-light focus:border-crayon-orange focus:outline-none font-tondo"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">
              Page Count
            </label>
            <input
              type="number"
              value={pageCount}
              onChange={(e) => setPageCount(Number(e.target.value))}
              className="w-full px-3 py-2 rounded-lg border-2 border-border-light focus:border-crayon-orange focus:outline-none font-tondo"
              min={1}
              max={20}
            />
          </div>
        </div>
      </div>

      {/* Template selector */}
      <div className="flex flex-wrap gap-2">
        {templates.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setSelectedTemplate(t.id)}
            className={`px-5 py-2.5 rounded-full font-tondo font-bold text-sm transition-all ${
              selectedTemplate === t.id
                ? 'bg-crayon-orange text-white shadow-md'
                : 'bg-white text-text-primary border-2 border-border-light hover:border-crayon-orange hover:bg-crayon-orange-light/10'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Full-size preview */}
      <div className="bg-white rounded-2xl border-2 border-border-light p-6 md:p-8">
        <h2 className="font-tondo text-xl font-bold text-text-primary mb-6">
          {templates.find((t) => t.id === selectedTemplate)?.label} Preview
        </h2>
        <div className="mx-auto overflow-hidden" style={{ maxWidth: 800 }}>
          {templates.find((t) => t.id === selectedTemplate)?.component}
        </div>
        <p className="text-center text-text-secondary text-sm mt-6">
          Actual output size: 1200 x 1200px (1:1 square)
        </p>
      </div>
    </div>
  );
};

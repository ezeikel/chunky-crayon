import React from 'react';
import {
  faImages,
  faWandMagicSparkles,
} from '@fortawesome/pro-duotone-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { Button } from '@/components/ui/button';

export const sampleImages = [
  {
    id: 'storybook-dragon-001',
    title: 'Friendly dragon tea party',
    alt: 'Friendly dragon tea party coloring page',
    description: 'A gentle dragon drinking cocoa in a cloud castle.',
    svgUrl: '/ads/dream-it-dragon--meta-feed.png',
    thumbnailUrl: '/ads/dream-it-dragon--meta-feed.png',
    createdAt: new Date('2026-05-17T09:00:00Z'),
    slugBase: 'friendly-dragon-tea-party',
    userId: null,
    showInCommunity: true,
    status: 'READY',
    category: 'fantasy',
  },
  {
    id: 'storybook-trex-002',
    title: 'T-rex birthday parade',
    alt: 'T-rex birthday parade coloring page',
    description: 'A T-rex who is late for a birthday party.',
    svgUrl: '/ads/impossible-request-trex--meta-feed.png',
    thumbnailUrl: '/ads/impossible-request-trex--meta-feed.png',
    createdAt: new Date('2026-05-16T09:00:00Z'),
    slugBase: 'trex-birthday-parade',
    userId: null,
    showInCommunity: true,
    status: 'READY',
    category: 'dinosaurs',
  },
  {
    id: 'storybook-fox-003',
    title: 'Foxes building a blanket fort',
    alt: 'Foxes building a blanket fort coloring page',
    description: 'Foxes saving a rainy afternoon with a blanket fort.',
    svgUrl: '/ads/five-pm-rescue-foxes--meta-feed.png',
    thumbnailUrl: '/ads/five-pm-rescue-foxes--meta-feed.png',
    createdAt: new Date('2026-05-15T09:00:00Z'),
    slugBase: 'foxes-building-a-blanket-fort',
    userId: null,
    showInCommunity: true,
    status: 'READY',
    category: 'animals',
  },
];

export const adImages = [
  {
    src: '/ads/impossible-request-trex--meta-feed.png',
    alt: 'T-rex coloring page example',
  },
  {
    src: '/ads/dream-it-dragon--meta-feed.png',
    alt: 'Dragon coloring page example',
  },
  {
    src: '/ads/five-pm-rescue-foxes--meta-feed.png',
    alt: 'Fox coloring page example',
  },
];

export const landingDemoScenarios = [
  {
    campaignKey: 'trex',
    request: 'A T-rex who is late for a birthday party',
    ctaLabel: 'Color this T-rex',
    imageId: 'img-trex',
    imageUrl: '/ads/impossible-request-trex--meta-feed.png',
    alt: 'T-rex coloring page',
    title: 'T-rex birthday dash',
  },
  {
    campaignKey: 'dragon',
    request: 'A gentle dragon drinking cocoa in a cloud castle',
    ctaLabel: 'Color this dragon',
    imageId: 'img-dragon',
    imageUrl: '/ads/dream-it-dragon--meta-feed.png',
    alt: 'Dragon coloring page',
    title: 'Dragon cloud castle',
  },
];

export const SectionFrame = ({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) => (
  <section className="w-full px-4 py-10 md:px-8">
    <div className="mx-auto max-w-7xl">
      <h2 className="mb-6 font-tondo text-2xl font-bold text-text-primary">
        {title}
      </h2>
      {children}
    </div>
  </section>
);

export const MockCreateForm = () => (
  <div className="flex flex-col gap-y-4 rounded-2xl border-2 border-paper-cream-dark bg-white p-6 shadow-card md:p-8">
    <div className="inline-flex w-fit items-center gap-2 rounded-full bg-crayon-orange-light/25 px-3 py-1 font-tondo text-sm font-bold text-crayon-orange">
      <FontAwesomeIcon icon={faWandMagicSparkles} />3 free tries left
    </div>
    <label className="font-tondo text-sm font-bold text-text-primary">
      What should we draw?
      <textarea
        className="mt-2 min-h-32 w-full rounded-2xl border-2 border-paper-cream-dark bg-paper-cream/40 p-4 font-rooney-sans text-base"
        defaultValue="A rocket-powered ice cream truck landing on the moon"
      />
    </label>
    <Button size="lg">Create coloring page</Button>
  </div>
);

export const MockGalleryStrip = () => (
  <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
    {sampleImages.map((image) => (
      <div
        key={image.id}
        className="rounded-2xl border-2 border-paper-cream-dark bg-white p-3 shadow-card"
      >
        <img
          src={image.thumbnailUrl}
          alt={image.alt}
          className="aspect-square w-full rounded-xl bg-paper-cream object-contain p-3"
        />
        <p className="mt-3 font-tondo font-bold text-text-primary">
          {image.title}
        </p>
      </div>
    ))}
  </div>
);

export const MockStats = () => (
  <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
    {[
      ['18,420', 'coloring pages created'],
      ['365', 'daily pages'],
      ['2,100', 'free library pages'],
    ].map(([value, label]) => (
      <div
        key={label}
        className="rounded-2xl border-2 border-paper-cream-dark bg-white p-6 text-center shadow-card"
      >
        <FontAwesomeIcon
          icon={faImages}
          className="mb-3 text-2xl text-crayon-orange"
        />
        <p className="font-tondo text-3xl font-bold text-text-primary">
          {value}
        </p>
        <p className="text-text-secondary">{label}</p>
      </div>
    ))}
  </div>
);

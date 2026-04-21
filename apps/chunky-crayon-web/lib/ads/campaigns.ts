import type { Campaign } from './schema';

// The single source of truth for ad creatives.
// Adding a new ad = push one Campaign here, run pnpm generate:ads.

export const campaigns: Campaign[] = [
  // ==========================================================================
  // 1 — Quote-as-headline (kid's impossible request)
  // ==========================================================================
  {
    id: 'impossible-request-trex',
    name: 'Impossible request — T-rex',
    template: 'hero',
    asset: {
      key: 'trex',
      prompt:
        'A cheerful cartoon T-rex wearing a helmet, riding a skateboard through outer space with planets and stars around it',
    },
    copy: {
      headline: '“Mum, can I color a T‑rex on a skateboard?”',
      subhead:
        'Yeah, actually. Kids describe it, we make it. Print it or color it in the app.',
      cta: 'Make their page',
      proofQuote: 'Real quote. Real coloring page. Made in a few minutes.',
    },
    meta: {
      primaryText: [
        '“Mum, can I color a T-rex riding a skateboard?” — yeah, actually. Kids describe it, we turn it into a coloring page in a couple of minutes. 🖍️',
        'Your kid’s weirdest request, as a coloring page. Unicorn-narwhal. Bunny vet. Pirate cat on the moon. If they can say it, we can print it.',
        'Stop Googling “dinosaur coloring page” at 5pm. Your kid describes it, we make it. Print it or color it in the app.',
      ],
    },
  },

  // ==========================================================================
  // 2 — The 5pm "I'm bored" rescue (named moment, dual-path)
  // ==========================================================================
  {
    id: 'five-pm-rescue-foxes',
    name: 'The 5pm rescue — fox picnic',
    template: 'app-screen',
    asset: {
      key: 'foxes',
      prompt:
        'A family of four cartoon foxes having a picnic on a grassy hill at sunset, with a checkered blanket, basket, and trees',
    },
    copy: {
      headline: 'The 5pm\n“I’m bored”\nrescue.',
      subhead:
        'Print one coloring page. Or color it in the app. A new one every day.',
      cta: 'Start free',
    },
    meta: {
      primaryText: [
        'The 5pm “I’m bored” rescue. One printable coloring page. 20 minutes of quiet. Or color it in the app on the go. ☔',
        'Raining again? Print a coloring page, or hand them your phone. 20 minutes of focused kid, your call on the format.',
        'Crayons at home. Phone in the car. Same coloring page, either way. A new one every single day.',
      ],
    },
  },

  // ==========================================================================
  // 3 — Blank page to masterpiece (before/after — needs colored variant)
  // ==========================================================================
  {
    id: 'dream-it-dragon',
    name: 'They dream it — dragon tea party',
    template: 'before-after',
    asset: {
      key: 'dragon',
      prompt:
        'A friendly cartoon dragon and a small bunny having a tea party at a tiny table, with teacups and a cake, cozy indoor setting',
      generateColoredVariant: true,
    },
    copy: {
      eyebrow: 'They say it. We draw it. They color it.',
      headline: 'Blank page\nto masterpiece.',
      cta: 'Try 2 free pages',
    },
    meta: {
      primaryText: [
        'Your kid says “a dragon having a tea party with a bunny” — and a few minutes later it’s on the fridge. Or the iPad. Their call. ✨',
        'Turn their wildest ideas into real coloring pages. Print them, color them in the app, or both. (Grandparents, this is the one.)',
        'They dream it. We draw it. They color it — on paper or in the app. A coloring app that actually listens.',
      ],
    },
  },
];

export const campaignsById = Object.fromEntries(
  campaigns.map((c) => [c.id, c]),
) as Record<string, Campaign | undefined>;

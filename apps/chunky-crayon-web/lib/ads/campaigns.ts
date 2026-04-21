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
    video: {
      mode: 'text',
      scenes: [
        {
          start: 0,
          duration: 5,
          label:
            'HOOK — quote types on, crayon-orange underline on key phrase at 3s',
          kind: 'text-reveal',
          caption: '“Mum, can I color a\nT-rex on a skateboard?”',
        },
        {
          start: 5,
          duration: 5,
          label:
            'PROOF — kid hand colouring the real T-rex page (reuses validated test clip)',
          kind: 'broll',
          broll: {
            prompt:
              "Photorealistic overhead shot, 9:16 vertical portrait. Wooden table, printed T-rex coloring page centered. Child's hand (age 4-5) colouring in a small star with a red wax crayon — visible strokes, star fills with red across the clip. Warm morning light, shallow DOF. No text. No faces.",
            imageUrl:
              'https://pub-3113b77fbb06419f9c8070eb1f8471cc.r2.dev/uploads/coloring-images/cmo8hw3o40000z36l46efmnwe/image.webp',
            clipDuration: 5,
          },
        },
        {
          start: 10,
          duration: 5,
          label:
            'CTA — brand lockup + "Make their page" button spring-bounces in',
          kind: 'brand-outro',
        },
      ],
      music: {
        // Generated via scripts/generate-ad-music-prompts.ts
        // (uses createAmbientPrompt → Claude + MUSIC_PROMPT_SYSTEM)
        prompt:
          'A warm living room exhale: a felt piano plays a slow, tender three-note motif in F major around 68 BPM, doubled by a soft kalimba shimmer. Underneath, a bowed cello hums a patient, grounding pedal tone while a music box adds a tiny sparkle on the upbeats—like quiet wonder crystallizing. A harp glissando appears once, gentle as a smile, then fades. No urgency, just unhurried recognition and tender delight. Instrumental only, no vocals, no drums, no harsh transitions, seamless calm loop for children.',
        durationSeconds: 15,
        volume: 0.3,
      },
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
      generateColoredVariant: true,
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
    video: {
      mode: 'voice',
      scenes: [
        {
          start: 0,
          duration: 4,
          label:
            'HOOK — stacked type on crayon-orange, yellow highlight on "I\'m bored" at 2s, confetti burst',
          kind: 'text-reveal',
          caption: 'The 5pm\n“I’m bored”\nrescue.',
        },
        {
          start: 4,
          duration: 6,
          label:
            'PROOF — animated phone mockup: foxes page being tapped-to-fill with colours',
          kind: 'phone-mockup',
        },
        {
          start: 10,
          duration: 5,
          label:
            'CTA — print icon + phone icon + "Or both. A new page every day." + "Start free" button',
          kind: 'brand-outro',
        },
      ],
      music: {
        prompt:
          'A cozy indoor rescue from rainy-day restlessness: a chirpy glockenspiel melody sparkles over a warm music-box foundation, joined by light marimba raindrops tapping a gentle pattern and soft kalimba accents that twinkle like problem-solved relief. A mellow felt-piano adds warmth underneath, with subtle pizzicato strings for buoyancy. Around 76 BPM, F major with a touch of lydian brightness, capturing that parent wink and gentle bounce of "we\'ve got this." Instrumental only, no vocals, no drums, no harsh transitions, seamless calm loop for children.',
        durationSeconds: 15,
        volume: 0.3,
      },
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
    video: {
      mode: 'image',
      scenes: [
        {
          start: 0,
          duration: 3,
          label:
            'HOOK — dragon line art draws itself via SVG stroke reveal, "They say it." → "We draw it." fades over',
          kind: 'line-art-draw',
          caption: 'They say it. We draw it.',
        },
        {
          start: 3,
          duration: 7,
          label:
            'PROOF — kid hand colouring the real dragon page (same pattern as ad 1)',
          kind: 'broll',
          broll: {
            prompt:
              "Photorealistic three-quarter shot, 9:16 vertical. Wooden table with printed dragon-and-bunny-at-tea-party coloring page. Child's hand (age 4-5) colouring in the dragon with a visible stroke of orange crayon — orange colour fills part of the dragon across the clip. Warm light, shallow DOF. No text. No faces.",
            imageUrl:
              'https://pub-3113b77fbb06419f9c8070eb1f8471cc.r2.dev/uploads/coloring-images/cmo8hypn80002z36lrab18enu/image.webp',
            clipDuration: 5,
          },
        },
        {
          start: 10,
          duration: 5,
          label:
            'CTA — colored dragon reveal + "Blank page to masterpiece." + "Try 2 free pages" button spring-bounces in',
          kind: 'brand-outro',
        },
      ],
      music: {
        prompt:
          'A storybook comes to life: delicate music-box chimes trace a slow, wondering melody over hushed kalimba arpeggios and soft felt-piano chords that bloom like ink on paper. Add a whisper of bowed cello sustain and gentle harp glissandi to evoke tea-party elegance meets dragon whimsy. Around 65 BPM, F lydian for that lifted, magical curiosity. The texture should feel like turning pages in a quiet room, intimate and tender, never loud. Instrumental only, no vocals, no drums, no harsh transitions, seamless calm loop for children.',
        durationSeconds: 15,
        volume: 0.3,
      },
    },
  },
];

export const campaignsById = Object.fromEntries(
  campaigns.map((c) => [c.id, c]),
) as Record<string, Campaign | undefined>;

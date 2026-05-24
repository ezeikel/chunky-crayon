import type { Meta, StoryObj } from '@storybook/react-vite';
import HomePageContent from '@/components/HomePageContent';
import DashboardHeader from '@/components/HomePageContent/DashboardHeader';
import IntroClient from '@/components/Intro/IntroClient';
import LandingDemoClient from '@/components/LandingDemo/LandingDemoClient';
import PricingTeaser from '@/components/PricingTeaser';
import Testimonials, { StarRating } from '@/components/Testimonials';
import FAQ from '@/components/FAQ';
import MeetYourCharactersSection from '@/components/Home/MeetYourCharactersSection/MeetYourCharactersSection';
import MyRecentArtworkView, {
  type MyRecentArtworkItem,
} from '@/components/MyRecentArtwork/MyRecentArtworkView';
import {
  MockCreateForm,
  MockGalleryStrip,
  MockStats,
  SectionFrame,
  landingDemoScenarios,
} from './fixtures';

const meta = {
  title: 'Chunky Crayon/01 Homepage Sections',
  parameters: {
    docs: {
      description: {
        component:
          'The Lego bricks that build the Chunky Crayon homepage: hero slots, demo, bundles/characters slots, proof sections, pricing teaser, FAQ, and logged-in dashboard shell.',
      },
    },
  },
} satisfies Meta;

export default meta;
type Story = StoryObj;

export const LoggedOutHomepageComposition: Story = {
  render: () => (
    <HomePageContent
      form={<MockCreateForm />}
      gallery={<MockGalleryStrip />}
      galleryPreview={<MockGalleryStrip />}
      socialProofStats={<MockStats />}
      recentCreations={
        <SectionFrame title="Recent creations">
          <MockGalleryStrip />
        </SectionFrame>
      }
      intro={
        <IntroClient
          eyebrow="Coloring pages made from your kid's wildest ideas"
          headlinePrefix="Turn any"
          headlineSuffix="idea into a coloring page"
          subtitle="Describe the thing they cannot stop talking about. Chunky Crayon turns it into a printable page in a playful, parent-friendly workflow."
          cta="See example"
          cycle={[
            {
              word: 'dragon',
              campaignKey: 'dragon',
              imageId: 'img-dragon',
              thumbUrl: '/ads/dream-it-dragon--meta-feed.png',
              alt: 'Dragon coloring page',
            },
            {
              word: 'T-rex',
              campaignKey: 'trex',
              imageId: 'img-trex',
              thumbUrl: '/ads/impossible-request-trex--meta-feed.png',
              alt: 'T-rex coloring page',
            },
          ]}
          experimentHeadlines={{
            outcome: 'A fresh coloring page before snack time.',
            empathy: 'For the five o’clock impossible request.',
          }}
        />
      }
      emailSignup={
        <div className="rounded-2xl border-2 border-paper-cream-dark bg-white p-5 shadow-card">
          <p className="font-tondo text-lg font-bold">Daily coloring page</p>
          <p className="text-text-secondary">
            A fresh printable page in your inbox each morning.
          </p>
        </div>
      }
      demo={
        <LandingDemoClient
          title="Watch an idea become a page"
          body="The homepage demo shows the value before a visitor commits to the form."
          idleLabel="Tap to play"
          drawingLabel="Drawing..."
          drawingSubLabel="Chunky Crayon is sketching"
          playLabel="Play"
          pauseLabel="Pause"
          scenarios={landingDemoScenarios}
          page="homepage"
        />
      }
      latestComicStrip={<MockGalleryStrip />}
      featuredBundles={
        <SectionFrame title="Shop coloring bundles">
          <MockGalleryStrip />
        </SectionFrame>
      }
      meetYourCharacters={<MeetYourCharactersSection />}
      pricingTeaserTitle="Plans from £7.99/month"
    />
  ),
};

export const LoggedInDashboardComposition: Story = {
  globals: { authState: 'signed-in' },
  render: () => (
    <HomePageContent
      form={<MockCreateForm />}
      formLarge={<MockCreateForm />}
      gallery={<MockGalleryStrip />}
      pricingTeaserTitle="Plans from £7.99/month"
    />
  ),
};

export const DashboardHeaderOnly: Story = {
  render: () => (
    <main className="p-8">
      <DashboardHeader
        coloState={{
          stage: 1,
          stageName: 'Baby Colo',
          stageDescription: 'Colo is just getting started.',
          imagePath: '/images/colo.svg',
          accessories: [],
          nextStage: {
            stage: 2,
            name: 'Little Colo',
            description: 'Colo is growing with every saved artwork.',
            requiredArtworks: 8,
            imagePath: '/images/colo.svg',
          },
          progressToNext: {
            current: 5,
            required: 8,
            percentage: 62,
          },
        }}
      />
    </main>
  ),
};

export const InteractiveDemo: Story = {
  render: () => (
    <LandingDemoClient
      title="Describe it. Watch it appear."
      body="A compact product walkthrough used on the homepage and start page."
      idleLabel="Tap to play"
      drawingLabel="Drawing..."
      drawingSubLabel="Sketching outlines"
      playLabel="Play"
      pauseLabel="Pause"
      scenarios={landingDemoScenarios}
      page="homepage"
    />
  ),
};

export const TrustAndFAQ: Story = {
  render: () => (
    <main className="px-4 py-8 md:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-10 flex items-center gap-3">
          <StarRating rating={4.8} />
          <span className="font-tondo font-bold">4.8 parent rating</span>
        </div>
        <Testimonials />
        <FAQ />
      </div>
    </main>
  ),
};

export const PricingTeaserSection: Story = {
  render: () => (
    <PricingTeaser
      title="Plans from £7.99/month"
      body="Make fresh pages whenever the ideas arrive."
      ctaLabel="See plans"
      location="homepage"
    />
  ),
};

// ─── My recent artwork strip ───────────────────────────────────────────
// Logged-in homepage's recent-pictures strip. Replaced the previous
// wall of mixed user+community images on the logged-in home (a 3-8yo
// kids app can't police what other users created). Shows up to ~10 of
// the current profile's saved artwork + a "See all my pictures" door
// to /account/my-stuff. The empty state ships its own friendly card.

const sampleArtworkItems: MyRecentArtworkItem[] = [
  {
    id: 'a1',
    imageUrl: '/images/colo.svg',
    artworkId: 'img-1',
    title: 'Friendly dragon',
  },
  {
    id: 'a2',
    imageUrl: '/images/colo.svg',
    artworkId: 'img-2',
    title: 'Robot in space',
  },
  {
    id: 'a3',
    imageUrl: '/images/colo.svg',
    artworkId: 'img-3',
    title: 'Princess and a cat',
  },
  {
    id: 'a4',
    imageUrl: '/images/colo.svg',
    artworkId: 'img-4',
    title: 'Birthday cake',
  },
  {
    id: 'a5',
    imageUrl: '/images/colo.svg',
    artworkId: 'img-5',
    title: 'Rainbow unicorn',
  },
  {
    id: 'a6',
    imageUrl: '/images/colo.svg',
    artworkId: 'img-6',
    title: 'Tiny dinosaur',
  },
];

const myRecentArtworkLabels = {
  title: 'Your recent pictures',
  seeAll: 'See all my pictures',
  empty: 'Color a page and tap save to start your collection!',
};

export const MyRecentArtworkStrip: Story = {
  name: 'My recent artwork — populated',
  render: () => (
    <main className="bg-paper p-8">
      <MyRecentArtworkView
        items={sampleArtworkItems}
        labels={myRecentArtworkLabels}
      />
    </main>
  ),
};

export const MyRecentArtworkEmpty: Story = {
  name: 'My recent artwork — empty state',
  render: () => (
    <main className="bg-paper p-8">
      <MyRecentArtworkView items={[]} labels={myRecentArtworkLabels} />
    </main>
  ),
};

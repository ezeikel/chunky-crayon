import type { Meta, StoryObj } from '@storybook/react-vite';
import { AllColoringPageImagesShell } from '@/components/AllColoringPageImages/AllColoringPageImagesShell';
import GalleryImageWithPreview from '@/components/GalleryImageWithPreview/GalleryImageWithPreview';
import InfiniteScrollGallery from '@/components/InfiniteScrollGallery';
import ImageFilterToggle from '@/components/ImageFilterToggle/ImageFilterToggle';
import Pagination from '@/components/Pagination/Pagination';
import DifficultyFilter from '@/components/DifficultyFilter';
import DifficultySlider from '@/components/DifficultySlider/DifficultySlider';
import TodaysDate from '@/components/TodaysDate';
import BlogPostCard from '@/components/blog/BlogPostCard';
import BlogGrid from '@/components/blog/BlogGrid';
import BlogHeader from '@/components/blog/BlogHeader';
import CategoryList from '@/components/blog/CategoryList';
import Breadcrumbs from '@/components/Breadcrumbs';
import GalleryStats from '@/components/GalleryStats';
import { AgeGroup, Difficulty } from '@one-colored-pixel/db/types';
import { sampleImages } from './fixtures';

const meta = {
  title: 'Chunky Crayon/04 Gallery, Freebies & Content',
  parameters: {
    docs: {
      description: {
        component:
          'Coloring page cards, gallery surfaces, pagination, filters, today/date UI, blog cards, and repeated content navigation.',
      },
    },
  },
} satisfies Meta;

export default meta;
type Story = StoryObj;

export const GalleryGrid: Story = {
  render: () => (
    <AllColoringPageImagesShell
      images={sampleImages as never}
      nextCursor={null}
      hasMore={false}
      showCommunityImages
      locale="en"
    />
  ),
};

export const GalleryCards: Story = {
  render: () => (
    <main className="grid gap-6 p-8 md:grid-cols-3">
      <GalleryImageWithPreview
        imageId="img-dragon"
        defaultSrc="/ads/dream-it-dragon--meta-feed.png"
        alt="Dragon coloring page"
        width={420}
        height={420}
        className="rounded-2xl bg-white p-4 shadow-card"
      />
      <div className="relative aspect-square overflow-hidden rounded-2xl bg-white p-4 shadow-card">
        <GalleryImageWithPreview
          imageId="img-castle"
          defaultSrc="/ads/impossible-request-trex--meta-feed.png"
          alt="Castle coloring page"
          fill
          objectFit="contain"
        />
      </div>
      <div className="relative aspect-square overflow-hidden rounded-2xl bg-white p-4 shadow-card">
        <GalleryImageWithPreview
          imageId="img-foxes"
          defaultSrc="/ads/five-pm-rescue-foxes--meta-feed.png"
          alt="Foxes coloring page"
          fill
          objectFit="contain"
        />
      </div>
    </main>
  ),
};

export const GalleryControls: Story = {
  render: () => (
    <main className="flex flex-col gap-8 p-8">
      <div className="flex flex-wrap items-center gap-4">
        <ImageFilterToggle showCommunityImages />
        <DifficultyFilter
          currentDifficulty={null}
          counts={{
            BEGINNER: 120,
            INTERMEDIATE: 70,
            ADVANCED: 24,
            EXPERT: 8,
          }}
        />
        <div className="w-full max-w-2xl rounded-2xl bg-white p-5 shadow-card">
          <DifficultySlider
            value={Difficulty.INTERMEDIATE}
            onChange={() => undefined}
            ageGroup={AgeGroup.CHILD}
            useRecommended={false}
            onUseRecommendedChange={() => undefined}
          />
        </div>
        <TodaysDate />
      </div>
      <Pagination
        currentPage={3}
        totalPages={12}
        buildHref={(page) => `/gallery?page=${page}`}
      />
      <InfiniteScrollGallery
        initialImages={sampleImages as never}
        initialCursor={null}
        initialHasMore={false}
        locale="en"
      />
    </main>
  ),
};

export const BlogAndEditorialCards: Story = {
  render: () => {
    const posts = [
      {
        _id: 'post-1',
        title: 'Rainy day coloring ideas',
        slug: { current: 'rainy-day-coloring-ideas' },
        excerpt: 'Simple ways to turn a grey afternoon into a coloring win.',
        publishedAt: '2026-05-10',
        mainImage: null,
        categories: [{ title: 'Activities', slug: { current: 'activities' } }],
        author: { name: 'Chunky Crayon' },
      },
      {
        _id: 'post-2',
        title: 'How to make a tiny gallery wall',
        slug: { current: 'tiny-gallery-wall' },
        excerpt: 'A parent-friendly way to display this week’s creations.',
        publishedAt: '2026-05-12',
        mainImage: null,
        categories: [{ title: 'Home', slug: { current: 'home' } }],
        author: { name: 'Chunky Crayon' },
      },
    ];

    return (
      <main className="p-8">
        <div className="mx-auto max-w-6xl">
          <BlogHeader />
          <CategoryList categories={posts[0].categories as never} />
          <BlogGrid posts={posts as never} />
          <div className="mt-8 max-w-md">
            <BlogPostCard post={posts[0] as never} />
          </div>
        </div>
      </main>
    );
  },
};

export const SupportingContent: Story = {
  render: () => (
    <main className="flex flex-col gap-8 p-8">
      <Breadcrumbs
        items={[
          { label: 'Home', href: '/' },
          { label: 'Gallery', href: '/gallery' },
          { label: 'Dinosaurs' },
        ]}
      />
      <section className="w-full">
        <div className="text-center mb-8 lg:mb-10">
          <h2 className="font-tondo text-2xl font-bold text-text-primary sm:text-3xl lg:text-4xl">
            This Week's Comic Strip
          </h2>
          <p className="mx-auto mt-4 max-w-lg font-rooney-sans text-text-secondary">
            Four panels of crayon-cast adventures, fresh every Sunday. Read,
            laugh, then color the cast in.
          </p>
        </div>
        <div className="mx-auto max-w-2xl rounded-2xl border-2 border-paper-cream-dark bg-white p-5 shadow-card">
          <div className="aspect-square rounded-xl bg-paper-cream p-8">
            <img
              src="/ads/five-pm-rescue-foxes--meta-feed.png"
              alt="Comic strip preview"
              className="size-full rounded-xl object-cover"
            />
          </div>
          <h3 className="mt-5 font-tondo text-xl font-bold text-text-primary">
            Sunday Scribbles
          </h3>
          <p className="mt-1 font-rooney-sans text-text-secondary">
            A Storybook-safe fixture for the latest comic strip section.
          </p>
        </div>
      </section>
    </main>
  ),
};

// ─── Gallery stats row ────────────────────────────────────────────────
// Was naked tondo numbers in dead space — read off-brand. Now a row
// of chunky bordered cards with FA duotone icons in tinted brand-
// colour circles, matching the modal vocabulary (PaywallModal,
// FeedbackDialog, character tiles). Four crayon colours, one per
// stat, keeps the playful per-item differentiation that Colo +
// character tiles already use.

export const GalleryStatsRow: Story = {
  name: 'Gallery stats row',
  render: () => (
    <main className="bg-paper p-8">
      <div className="mx-auto max-w-5xl">
        <GalleryStats
          stats={{
            totalImages: 1280,
            systemImages: 1235,
            communityImages: 45,
            dailyImages: 50,
          }}
          labels={{
            totalPages: 'Total Pages',
            ourPages: 'Our Pages',
            communityPages: 'Community Pages',
            dailyPages: 'Daily Pages',
          }}
        />
      </div>
    </main>
  ),
};

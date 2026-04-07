import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import GalleryGrid from "@/components/GalleryGrid/GalleryGrid";
import Breadcrumbs from "@/components/Breadcrumbs";
import CategoryFaq from "@/components/CategoryFaq";
import { getTagImages } from "@/app/data/gallery";
import { generateAlternates } from "@/lib/seo";

type HolidayEvent = {
  slug: string;
  name: string;
  emoji: string;
  tags: string[];
  description: string;
  seoTitle: string;
  seoDescription: string;
};

const HOLIDAY_EVENTS: HolidayEvent[] = [
  {
    slug: "christmas",
    name: "Christmas",
    emoji: "🎄",
    tags: ["christmas", "santa", "holiday"],
    description:
      "Intricate Christmas coloring pages featuring ornamental designs, festive patterns, and holiday scenes for mindful relaxation.",
    seoTitle: "Christmas Coloring Pages - Free Printable Holiday Designs",
    seoDescription:
      "Free printable Christmas coloring pages for adults. Intricate ornaments, festive patterns, and holiday scenes. Color online or download and print.",
  },
  {
    slug: "halloween",
    name: "Halloween",
    emoji: "🎃",
    tags: ["halloween", "pumpkin", "spooky"],
    description:
      "Atmospheric Halloween coloring pages with gothic patterns, detailed pumpkins, and mysterious scenes for creative relaxation.",
    seoTitle: "Halloween Coloring Pages - Free Printable Gothic Designs",
    seoDescription:
      "Free printable Halloween coloring pages for adults. Gothic patterns, intricate pumpkins, and atmospheric designs. Color online or print.",
  },
  {
    slug: "easter",
    name: "Easter",
    emoji: "🐰",
    tags: ["easter", "bunny", "eggs"],
    description:
      "Detailed Easter coloring pages with decorative eggs, spring florals, and seasonal botanical designs.",
    seoTitle: "Easter Coloring Pages - Free Printable Spring Designs",
    seoDescription:
      "Free printable Easter coloring pages for adults. Decorated eggs, spring florals, and botanical designs. Color online or download.",
  },
  {
    slug: "thanksgiving",
    name: "Thanksgiving",
    emoji: "🦃",
    tags: ["thanksgiving", "autumn"],
    description:
      "Thanksgiving coloring pages featuring harvest scenes, autumn motifs, and nature-inspired gratitude designs.",
    seoTitle: "Thanksgiving Coloring Pages - Free Printable Autumn Designs",
    seoDescription:
      "Free printable Thanksgiving coloring pages for adults. Harvest scenes, autumn leaves, and nature motifs. Color online or print.",
  },
  {
    slug: "valentines-day",
    name: "Valentine's Day",
    emoji: "💝",
    tags: ["valentine", "hearts", "love"],
    description:
      "Romantic Valentine's Day coloring pages with heart mandalas, floral patterns, and love-themed designs.",
    seoTitle: "Valentine's Day Coloring Pages - Free Printable Heart Designs",
    seoDescription:
      "Free printable Valentine's Day coloring pages for adults. Heart mandalas, romantic patterns, and floral designs. Color online or print.",
  },
  {
    slug: "winter",
    name: "Winter",
    emoji: "❄️",
    tags: ["winter", "snow"],
    description:
      "Winter coloring pages with intricate snowflake patterns, cozy scenes, and frost-inspired designs for mindful coloring.",
    seoTitle: "Winter Coloring Pages - Free Printable Snow & Ice Designs",
    seoDescription:
      "Free printable winter coloring pages for adults. Snowflake patterns, cozy scenes, and frost-inspired designs. Color online or print.",
  },
  {
    slug: "spring",
    name: "Spring",
    emoji: "🌸",
    tags: ["spring"],
    description:
      "Spring coloring pages with blooming botanical designs, butterfly patterns, and garden scenes for creative relaxation.",
    seoTitle: "Spring Coloring Pages - Free Printable Botanical Designs",
    seoDescription:
      "Free printable spring coloring pages for adults. Botanical designs, butterflies, and garden scenes. Color online or download.",
  },
  {
    slug: "summer",
    name: "Summer",
    emoji: "☀️",
    tags: ["summer"],
    description:
      "Summer coloring pages featuring beach scenes, tropical patterns, and sun-drenched landscapes for relaxation.",
    seoTitle: "Summer Coloring Pages - Free Printable Beach Designs",
    seoDescription:
      "Free printable summer coloring pages for adults. Beach scenes, tropical patterns, and coastal designs. Color online or print.",
  },
  {
    slug: "autumn",
    name: "Autumn",
    emoji: "🍂",
    tags: ["autumn"],
    description:
      "Autumn coloring pages with falling leaves, harvest patterns, and cozy fall-themed designs for mindful coloring.",
    seoTitle: "Autumn Coloring Pages - Free Printable Fall Designs",
    seoDescription:
      "Free printable autumn coloring pages for adults. Falling leaves, harvest patterns, and cozy fall designs. Color online or print.",
  },
];

const getEventBySlug = (slug: string): HolidayEvent | undefined =>
  HOLIDAY_EVENTS.find((e) => e.slug === slug);

type PageParams = {
  locale: string;
  event: string;
};

export async function generateStaticParams() {
  return HOLIDAY_EVENTS.map((event) => ({
    event: event.slug,
  }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<PageParams>;
}): Promise<Metadata> {
  const { locale, event: eventSlug } = await params;
  const event = getEventBySlug(eventSlug);

  if (!event) {
    return { title: "Not Found | Coloring Habitat" };
  }

  const pagePath = `/gallery/holidays/${eventSlug}`;

  return {
    title: `${event.seoTitle} | Coloring Habitat`,
    description: event.seoDescription,
    keywords: [
      `${event.name.toLowerCase()} coloring pages`,
      `${event.name.toLowerCase()} coloring pages for adults`,
      `free ${event.name.toLowerCase()} coloring`,
      "printable coloring pages",
      "adult coloring pages",
    ],
    openGraph: {
      title: `${event.seoTitle} - Coloring Habitat`,
      description: event.seoDescription,
      type: "website",
      url: `https://coloringhabitat.com/${locale}${pagePath}`,
    },
    alternates: generateAlternates(locale, pagePath),
  };
}

const HolidayEventPage = async ({
  params,
}: {
  params: Promise<PageParams>;
}) => {
  const { event: eventSlug } = await params;
  const event = getEventBySlug(eventSlug);

  if (!event) {
    notFound();
  }

  const data = await getTagImages(event.tags[0]);

  const collectionSchema = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "@id": `https://coloringhabitat.com/gallery/holidays/${eventSlug}`,
    name: `${event.name} Coloring Pages`,
    description: event.description,
    url: `https://coloringhabitat.com/gallery/holidays/${eventSlug}`,
    isPartOf: { "@id": "https://coloringhabitat.com/#website" },
    numberOfItems: data.images.length,
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: data.images.length,
      itemListElement: data.images.slice(0, 10).map((image, index) => ({
        "@type": "ListItem",
        position: index + 1,
        item: {
          "@type": "ImageObject",
          "@id": `https://coloringhabitat.com/coloring-image/${image.id}`,
          name: image.title || `${event.name} Coloring Page`,
          contentUrl: image.svgUrl,
        },
      })),
    },
  };

  const otherEvents = HOLIDAY_EVENTS.filter((e) => e.slug !== eventSlug);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionSchema) }}
      />
      <main className="bg-background py-12">
        <div className="mx-auto max-w-7xl px-6">
          <Breadcrumbs
            items={[
              { label: "Home", href: "/" },
              { label: "Gallery", href: "/gallery" },
              { label: event.name },
            ]}
            className="mb-6"
          />

          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-4xl">{event.emoji}</span>
              <div>
                <h1 className="text-4xl font-extrabold tracking-tight text-foreground">
                  {event.name} Coloring Pages
                </h1>
                {data.images.length > 0 && (
                  <p className="text-muted-foreground text-sm mt-1">
                    {data.images.length} coloring{" "}
                    {data.images.length === 1 ? "page" : "pages"}
                  </p>
                )}
              </div>
            </div>
            <p className="text-muted-foreground max-w-2xl">
              {event.description}
            </p>
          </div>

          {/* Other holidays/seasons */}
          <div className="mb-8">
            <h2 className="text-lg font-semibold text-foreground mb-3">
              More Holidays & Seasons
            </h2>
            <div className="flex flex-wrap gap-2">
              {otherEvents.map((e) => (
                <Link
                  key={e.slug}
                  href={`/gallery/holidays/${e.slug}`}
                  className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-4 py-2 text-sm font-medium text-muted-foreground transition-all hover:bg-secondary hover:text-foreground"
                >
                  <span>{e.emoji}</span>
                  <span>{e.name}</span>
                </Link>
              ))}
            </div>
          </div>

          {/* Gallery grid */}
          <div className="mt-8">
            {data.images.length > 0 ? (
              <GalleryGrid
                initialImages={data.images}
                initialCursor={data.nextCursor}
                initialHasMore={data.hasMore}
                galleryType="tag"
                tagSlug={event.tags[0]}
              />
            ) : (
              <div className="rounded-2xl border border-border bg-card p-12 text-center">
                <p className="text-lg font-semibold text-foreground">
                  No {event.name} coloring pages yet
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  Check back soon — new designs are added daily!
                </p>
                <Link
                  href="/gallery"
                  className="mt-4 inline-block text-sm font-medium text-primary hover:underline"
                >
                  Browse all coloring pages
                </Link>
              </div>
            )}
          </div>

          <CategoryFaq categoryName={event.name} />
        </div>
      </main>
    </>
  );
};

export default HolidayEventPage;
